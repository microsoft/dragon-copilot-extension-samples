---
name: conversational-extension-eval
description: Evaluate a Dragon Copilot conversational extension end to end. Use when a partner wants to check which of their tools Dragon Copilot calls for a list of clinician questions, score the results, and tune their tool and parameter descriptions. Works with any extension and any question set.
---

# Conversational extension evaluation

Human guide with full details: [README.md](README.md). Description-writing rules: [../../TOOL-DESCRIPTIONS.md](../../TOOL-DESCRIPTIONS.md).

## Rules

- Synthetic patients and questions only. Never write real patient data, tokens or credentials to any file.
- Never sign in for the user. They sign in to Dragon Copilot themselves in a browser started with `--remote-debugging-port`.
- Only report what the evidence shows. Without a request log, a **Source:** caption proves that one of the partner's tools answered, not which one.

## Workflow

1. **Cases.** Ask for the partner's tools (OpenAPI `operationId`s) and what each is for. Build `cases.json` in the [cases.example.json](cases.example.json) format:
   - 5 or more phrasings per tool;
   - questions between neighbouring tools;
   - out-of-scope questions with `expectTools: []`;
   - multi-intent questions in their own category, each with a reworded variant;
   - `followUpOk: true` for tools that need a prerequisite such as a visit note.
   Confirm the list with the user before running.
2. **Request log.** Help the partner log one JSON line per tool call (`time`, `tool`, `args`) in their service, as in README step 2. Skip only if they can't.
3. **Preflight.** Check that the extension is listed in Dragon Copilot settings, other extensions are off, and one question returns the expected **Source:** caption.
4. **Run.** `npm install`, then `node run.mjs --cases cases.json`. If the chat box or answers aren't found, switch to `--manual` and guide the user through it.
5. **Report.** `node report.mjs --log requests.jsonl` (or without `--log`). Summarise pass counts by category and list each case in **Needs attention** with expected vs called tools and arguments.
6. **Tune.** For each failing case, propose specific edits to the operation or tool description and parameter descriptions, following the fix table in README step 5 and TOOL-DESCRIPTIONS.md. Also flag `example` values, brand names used as routing signals and renamed tools. Change one thing at a time.
7. **Repeat.** After the partner uploads the updated extension, rerun the same cases and compare reports. Report multi-intent results both as worded and reworded.
