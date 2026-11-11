# Evaluate your conversational extension end to end

Use this kit to check how Dragon Copilot routes real clinician questions to your conversational extension, and to tune your tool descriptions based on what you see. You write a list of questions with the tool(s) you expect each one to call. The kit asks them in the Dragon Copilot web app, records each answer, matches it against your own service's request log and writes a report.

> **Public Preview.** Applies to manifest schema `0.4.0-preview.2`. Use synthetic patients and questions only. Never put real patient data in a cases file, a request log or a report.

> 🤖 **Automate the loop with your AI coding agent.** The kit ships with an agent skill, [SKILL.md](SKILL.md). Give it to your favorite LLM coding agent (for example GitHub Copilot, Claude Code or Cursor) and ask it to evaluate your extension. The agent drafts your cases, runs them, reads the report, proposes description fixes and re-runs after you upload the updated extension. You still sign in to Dragon Copilot and approve each change yourself.

## 📚 Contents

- [How it works](#how-it-works)
- [Automate with an AI agent](#automate-with-an-ai-agent)
- [Prerequisites](#prerequisites)
- [1. Write your cases](#1-write-your-cases)
- [2. Log the requests your service receives](#2-log-the-requests-your-service-receives)
- [3. Run the questions](#3-run-the-questions)
- [4. Build the report](#4-build-the-report)
- [5. Tune and repeat](#5-tune-and-repeat)
- [Status values](#status-values)
- [Tips](#tips)

## How it works

```
cases.json ──► run.mjs ──► Dragon Copilot web app ──► your extension
                  │                                        │
                  ▼                                        ▼
        results/results.jsonl                     your request log (JSONL)
                  └──────────────► report.mjs ◄────────────┘
                                       │
                                       ▼
                         results/report.md, report.csv
```

Cases run one at a time. Each request in your log is matched to the case whose question was being answered at that moment (send time to answer time, plus a few seconds). That tells you which of your tools Dragon Copilot called and with which arguments. Without a log, the report falls back to the **Source:** caption under each answer, which shows that one of your tools answered but not which one.

## Automate with an AI agent

[SKILL.md](SKILL.md) is an [agent skill](https://agentskills.io/) that walks an LLM coding agent through the whole loop: cases → run → report → tune descriptions → re-run. To use it:

- **Skill-aware agents** (for example GitHub Copilot, Claude Code): copy this folder into your agent's skills folder (such as `.github/skills/` or `.claude/skills/`) in your extension's repo, then ask "Evaluate my Dragon Copilot extension".
- **Any other agent or chat LLM:** open this folder in the agent's workspace, or paste `SKILL.md` into the chat, and ask it to follow the skill.

The agent needs your extension's source (OpenAPI document) to propose description changes, and a terminal to run `node`. It never signs in for you and only uses synthetic questions.

## Prerequisites

- Your extension is uploaded in the Dragon admin center and works for at least one question. See [Installing your Extension](../../QUICKSTART.md#installing-your-extension) and [Testing your Extension](../../QUICKSTART.md#testing-your-extension).
- In Dragon Copilot **Settings → AI apps and agents** (**Extensions** in some versions), your extension is listed. Turn off other extensions so they don't answer your questions.
- Node.js 20 or later and Microsoft Edge (or Chrome).

Install the kit:

```bash
cd physician/tools/conversational-eval
npm install
```

## 1. Write your cases

Copy [cases.example.json](cases.example.json) to `cases.json` and replace the contents.

| Field | Required | Meaning |
| --- | --- | --- |
| `source` (top level) | No | The text your answers show after **Source:**. Used when you don't provide a request log. |
| `id` | Yes | Unique case id. |
| `category` | No | Groups cases in the report summary, for example one category per tool. |
| `question` | Yes | Exactly what a clinician would type. |
| `expectTools` | Yes | Names of the tools you expect to be called, as they appear in your request log. Use `[]` for questions your extension must **not** answer. |
| `followUpOk` | No | `true` when Dragon Copilot may reasonably ask for more information first (see [Tips](#tips)). |
| `newSession` | No | Defaults to `true`: each case runs in a new patient session so earlier answers don't affect it. Set `false` to continue the previous case's conversation. |
| `note` | No | Free text shown in the report. |

Write cases that cover:

- **Each tool**, with 5 or more phrasings: short and long, formal and casual, with and without the clinical details your tool needs.
- **Neighbouring tools.** Questions that sit between two of your tools, to check they are told apart.
- **Out-of-scope questions** (`expectTools: []`): unrelated questions, and questions close to your domain that your extension doesn't handle.
- **Multi-intent questions**, which ask for two things at once. Add a reworded version of each (for example, split it into two sentences with "Also, …") and report both. Multi-intent questions often call only one tool, so keep them in their own category.
- **Questions that need a prerequisite**, such as a documented visit, marked `followUpOk: true`.

Patient context such as an MRN can't be injected from the chat box. If a tool needs it, include the synthetic details in the question or start an ambient recording first, as in [Testing your Extension](../../QUICKSTART.md#testing-your-extension).

## 2. Log the requests your service receives

Write one JSON line per tool call your service receives, to a file such as `requests.jsonl`:

```json
{"time": "2026-01-15T14:03:22.418Z", "tool": "checkDrugInteraction", "args": {"drugs": ["clarithromycin", "simvastatin"]}}
```

- `time`: when the request arrived, ISO 8601 with a time zone. Keep your server clock in sync.
- `tool`: the name you use in `expectTools`, for example the OpenAPI `operationId`.
- `args`: the arguments or request body, so you can see what Dragon Copilot extracted from the question.

Log only for synthetic test runs, and only to a place you control. This step is optional but strongly recommended; without it the report can't tell which tool was called.

## 3. Run the questions

### Automated (recommended)

1. Start a separate browser profile with remote debugging on:

   ```powershell
   & "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --remote-debugging-port=9222 --user-data-dir="$env:TEMP\drc-eval"
   ```

   On macOS: `"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" --remote-debugging-port=9222 --user-data-dir=/tmp/drc-eval`

2. In that browser, open Dragon Copilot, sign in, and finish setup.
3. Run:

   ```bash
   node run.mjs --cases cases.json
   ```

The script uses your signed-in tab. It doesn't handle sign-in or store credentials. For each case it creates a patient session, opens Copilot chat, sends the question, waits for the answer and saves it to `results/`. Use `--only id1,id2` to rerun some cases, `--timeout 300` to wait longer and `--cdp <url>` for a different debugging port. Leave the browser alone while it runs.

The script reads the visible chat text. If a Dragon Copilot update changes the page and the script stops finding the chat box or answers, use manual mode.

### Manual

```bash
node run.mjs --cases cases.json --manual
```

The script prints each question. You paste it into Dragon Copilot chat yourself and press Enter in the terminal when you send it and when the answer is done, then type the **Source:** caption and the number of references. Send and answer times are recorded for matching against your log.

## 4. Build the report

```bash
node report.mjs --log requests.jsonl
```

Leave out `--log` to score by the **Source:** caption only. The report has:

- a pass count per category;
- a **Needs attention** list with the expected and actual tools for each failing case;
- a table of every case with the tools called, their arguments, the source caption, the number of references and latency.

`report.csv` has the same rows plus the start of each answer, so you can review answer quality in a spreadsheet.

## 5. Tune and repeat

For each case in **Needs attention**:

| Status | Usual fix |
| --- | --- |
| `miss` | The description doesn't match how clinicians phrase this. Add "Use when the clinician asks…" wording that covers it. |
| `wrong-tool` or `partial` | Two tools overlap. In each tool's description, say what it is for and which of your other tools handles the neighbouring case. |
| `unexpected-call` | The description is too broad. Add what the tool does **not** cover. |
| Wrong or missing arguments | Improve the parameter or property descriptions: what goes in, in what format, and what to keep from the question. |

See [Writing tool descriptions](../../TOOL-DESCRIPTIONS.md) for which fields Dragon Copilot reads for your tool type and how to write them. Then upload the updated extension and run the same cases again. Compare reports between runs; a fix for one category can break another.

## Status values

| Status | Meaning |
| --- | --- |
| `pass` | Every expected tool was called (or none, for an out-of-scope case). |
| `pass-caption` | No log; the answer showed your **Source:** caption. Some tool of yours answered, but the report can't confirm which one. |
| `unverified` | No log, and the case expects more than one tool. Provide a log to check it. |
| `follow-up` | `followUpOk` case where Dragon Copilot asked a question instead. Counts as passing. |
| `partial` | Some, but not all, expected tools were called. |
| `wrong-tool` | Only tools you didn't expect were called. |
| `miss` | None of your tools were called. |
| `unexpected-call` | An out-of-scope case called one of your tools. |
| `timeout` | No answer within the timeout. |

## Tips

- **Remove `example` values** from your OpenAPI document and schemas. Use clearly synthetic values if you need any.
- **Don't rely on your brand name** in descriptions. Clinicians ask for outcomes, not vendors.
- **Prerequisites are not failures.** Some tools only make sense once something exists, such as a visit note. If Dragon Copilot asks for it, mark the case `followUpOk` and add a second case that provides it.
- **Renaming changes the tool.** The tool name Dragon Copilot sees comes from the manifest tool `name` and the `operationId`. If you rename either, update `expectTools` and your log.
- **Answers vary.** Run important cases more than once before concluding a change helped.
- **Change one thing at a time** between runs, so you know which change moved the numbers.
