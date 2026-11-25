#!/usr/bin/env node
// Sends each case question to Dragon Copilot chat and records the answer and timing.
//   node run.mjs --cases cases.json [--out results] [--cdp http://127.0.0.1:9222] [--only id1,id2] [--manual]
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';

const args = parseArgs(process.argv.slice(2));
const casesFile = args.cases || 'cases.json';
const outDir = args.out || 'results';
const suite = JSON.parse(fs.readFileSync(casesFile, 'utf8'));
let cases = suite.cases;
if (args.only) {
  const only = new Set(args.only.split(','));
  cases = cases.filter((c) => only.has(c.id));
}
fs.mkdirSync(outDir, { recursive: true });
const resultsFile = path.join(outDir, 'results.jsonl');

const CHAT_BOX = 'textarea[aria-label="Ask Dragon Copilot for help"]';
const ANSWER_TIMEOUT_MS = Number(args.timeout || 240) * 1000;

if (args.manual) await runManual();
else await runBrowser();

async function runBrowser() {
  const { chromium } = await import('playwright');
  const browser = await chromium.connectOverCDP(args.cdp || 'http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages().find((p) => /dragon\.com/.test(p.url()));
  if (!page) throw new Error('No Dragon Copilot tab found. Open Dragon Copilot and sign in first.');
  await page.bringToFront();

  for (const c of cases) {
    if (c.newSession !== false) await newPatientSession(page);
    await openChat(page);
    const before = await page.getByText('Disclaimer', { exact: true }).count();
    const box = page.locator(CHAT_BOX);
    await box.fill(c.question);
    const sentAt = new Date();
    await box.press('Enter');

    let timedOut = true;
    while (Date.now() - sentAt.getTime() < ANSWER_TIMEOUT_MS) {
      await page.waitForTimeout(1500);
      if ((await page.getByText('Disclaimer', { exact: true }).count()) > before) {
        timedOut = false;
        break;
      }
    }
    const answeredAt = new Date();
    await page.waitForTimeout(1500);
    const turn = parseLastTurn(await page.evaluate(() => document.body.innerText), c.question);
    save({ ...c, expectSource: suite.source, sentAt, answeredAt, latencySec: secs(sentAt, answeredAt), timedOut, ...turn, mode: 'browser' });
  }
  await browser.close().catch(() => {});
  process.exit(0);
}

async function newPatientSession(page) {
  const home = page.getByRole('button', { name: 'Home', exact: true });
  if (await home.count()) {
    await home.click();
    await page.waitForTimeout(2000);
  }
  await page.getByRole('button', { name: 'Create patient session' }).click();
  await page.getByRole('button', { name: 'Copilot', exact: true }).waitFor({ timeout: 60000 });
  await page.waitForTimeout(3000);
}

async function openChat(page) {
  const close = page.getByRole('button', { name: 'Close settings' });
  if (await close.count()) await close.click();
  if (!(await page.locator(CHAT_BOX).count())) {
    await page.getByRole('button', { name: 'Copilot', exact: true }).click();
  }
  await page.locator(CHAT_BOX).waitFor({ timeout: 30000 });
}

// The chat UI has no stable element ids, so read the rendered text of the last turn.
function parseLastTurn(text, question) {
  const turn = text.slice(text.lastIndexOf('You said:'));
  const lines = turn.split('\n').map((l) => l.trim()).filter(Boolean);
  const disclaimer = lines.indexOf('Disclaimer');
  const body = lines.slice(0, disclaimer < 0 ? undefined : disclaimer);
  const sourceLine = body.find((l) => l.startsWith('Source:'));
  const refsAt = body.indexOf('References');
  let references = 0;
  if (refsAt >= 0) {
    for (const l of body.slice(refsAt + 1)) {
      const more = l.match(/^\+(\d+)$/);
      if (more) references += Number(more[1]);
      else if (/^\d+$/.test(l)) references += 1;
    }
  }
  const lastQ = body.lastIndexOf(question.trim());
  const start = lastQ >= 0 ? lastQ + 1 : body.indexOf('AI response') + 1;
  const ends = [body.findIndex((l) => l.startsWith('Source:')), refsAt].filter((i) => i > start);
  const answer = body.slice(start, ends.length ? Math.min(...ends) : undefined).join('\n');
  return { answer, source: sourceLine ? sourceLine.slice('Source:'.length).trim() : null, references };
}

async function runManual() {
  const rl = readline.createInterface({ input: process.stdin });
  const lines = rl[Symbol.asyncIterator]();
  const ask = async (prompt) => {
    process.stdout.write(prompt);
    const { value } = await lines.next();
    return value ?? '';
  };
  console.log('Manual mode. For each case: create a new patient session, open Copilot chat, then follow the prompts.\n');
  for (const c of cases) {
    console.log(`\n[${c.id}] Paste this into Dragon Copilot chat:\n\n  ${c.question}\n`);
    await ask('Press Enter right after you send it... ');
    const sentAt = new Date();
    await ask('Press Enter when the answer has finished... ');
    const answeredAt = new Date();
    const source = (await ask('Text after "Source:" (empty if none): ')).trim() || null;
    const references = Number((await ask('Number of references (0 if none): ')).trim() || 0);
    const answer = (await ask('Paste the first line of the answer (optional): ')).trim();
    save({ ...c, expectSource: suite.source, sentAt, answeredAt, latencySec: secs(sentAt, answeredAt), timedOut: false, answer, source, references, mode: 'manual' });
  }
  rl.close();
}

function save(r) {
  fs.writeFileSync(path.join(outDir, `${r.id}.json`), JSON.stringify(r, null, 2));
  fs.appendFileSync(resultsFile, JSON.stringify(r) + '\n');
  console.log(`${r.id}: ${r.timedOut ? 'TIMEOUT' : `${r.latencySec}s`} source=${r.source ?? '-'} refs=${r.references}`);
}

function secs(a, b) {
  return Math.round((b - a) / 100) / 10;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i].replace(/^--/, '');
    out[k] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return out;
}
