#!/usr/bin/env node
// Scores run results, optionally against your service's request log, and writes report.md + report.csv.
//   node report.mjs --results results/results.jsonl [--log requests.jsonl] [--source "Caption"] [--out results]
// Request log: one JSON object per line: {"time": "<ISO 8601>", "tool": "<operationId or MCP tool name>", "args": {...}}
import fs from 'node:fs';
import path from 'node:path';

const args = parseArgs(process.argv.slice(2));
const outDir = args.out || 'results';
const SLACK_BEFORE_MS = 2000;
const SLACK_AFTER_MS = 5000;

const results = readJsonl(args.results || path.join(outDir, 'results.jsonl'));
const log = args.log ? readJsonl(args.log).map((e) => ({ ...e, t: new Date(e.time).getTime() })) : null;

const rows = results.map((r) => score(r));
fs.writeFileSync(path.join(outDir, 'report.md'), markdown(rows));
fs.writeFileSync(path.join(outDir, 'report.csv'), csv(rows));
console.log(`Wrote ${path.join(outDir, 'report.md')} and report.csv`);
console.log(summaryLine(rows));

function score(r) {
  const expect = r.expectTools || [];
  const expectedSource = args.source || r.expectSource || null;
  const from = new Date(r.sentAt).getTime() - SLACK_BEFORE_MS;
  const to = new Date(r.answeredAt).getTime() + SLACK_AFTER_MS;
  const calls = log ? log.filter((e) => e.t >= from && e.t <= to) : null;
  const invoked = calls ? [...new Set(calls.map((e) => e.tool))] : null;
  const askedBack = /\?\s*$/.test((r.answer || '').trim());
  const captionHit = expectedSource ? (r.source || '').includes(expectedSource) : Boolean(r.source);

  let status;
  if (r.timedOut) status = 'timeout';
  else if (calls) {
    const missing = expect.filter((t) => !invoked.includes(t));
    if (expect.length === 0) status = invoked.length ? 'unexpected-call' : 'pass';
    else if (missing.length === 0) status = 'pass';
    else if (r.followUpOk && askedBack) status = 'follow-up';
    else if (missing.length < expect.length) status = 'partial';
    else status = invoked.length ? 'wrong-tool' : 'miss';
  } else {
    // No request log: the "Source:" caption only shows that some tool of yours answered.
    if (expect.length === 0) status = captionHit ? 'unexpected-call' : 'pass';
    else if (!captionHit) status = r.followUpOk && askedBack ? 'follow-up' : 'miss';
    else status = expect.length > 1 ? 'unverified' : 'pass-caption';
  }
  return {
    id: r.id,
    category: r.category || '',
    question: r.question,
    expected: expect.join(' + ') || '(none)',
    invoked: invoked ? invoked.join(' + ') || '(none)' : '(no log)',
    args: calls ? calls.map((e) => `${e.tool}: ${JSON.stringify(e.args ?? {})}`).join(' | ') : '',
    source: r.source || '',
    references: r.references ?? 0,
    latencySec: r.latencySec,
    status,
    note: r.note || '',
    answer: (r.answer || '').replace(/\s+/g, ' ').slice(0, 300),
  };
}

function markdown(rows) {
  const ok = (s) => ['pass', 'pass-caption', 'follow-up'].includes(s);
  const groups = {};
  for (const r of rows) (groups[r.category || '(none)'] ??= []).push(r);
  const lines = ['# Conversational extension evaluation', '', summaryLine(rows), '', '## Summary by category', '',
    '| Category | Passed | Total | Avg latency (s) |', '| --- | --- | --- | --- |'];
  for (const [cat, rs] of Object.entries(groups)) {
    const avg = rs.reduce((a, r) => a + (r.latencySec || 0), 0) / rs.length;
    lines.push(`| ${cat} | ${rs.filter((r) => ok(r.status)).length} | ${rs.length} | ${avg.toFixed(1)} |`);
  }
  const misses = rows.filter((r) => !ok(r.status));
  lines.push('', '## Needs attention', '');
  if (!misses.length) lines.push('None.');
  for (const r of misses) {
    lines.push(`- **${r.id}** (${r.status}): expected ${r.expected}, invoked ${r.invoked}. "${r.question}"`);
  }
  lines.push('', '## All cases', '', '| Id | Status | Expected | Invoked | Args | Source | Refs | Latency (s) |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const r of rows) {
    lines.push(`| ${[r.id, r.status, r.expected, r.invoked, r.args, r.source, r.references, r.latencySec].map(cell).join(' | ')} |`);
  }
  return lines.join('\n') + '\n';
}

function summaryLine(rows) {
  const counts = {};
  for (const r of rows) counts[r.status] = (counts[r.status] || 0) + 1;
  return `${rows.length} cases: ` + Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ');
}

function csv(rows) {
  const cols = Object.keys(rows[0] || { id: '' });
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [cols.join(','), ...rows.map((r) => cols.map((c) => q(r[c])).join(','))].join('\n') + '\n';
}

function cell(v) {
  return String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function readJsonl(file) {
  return fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i].replace(/^--/, '');
    out[k] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return out;
}
