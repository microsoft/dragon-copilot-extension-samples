## Agents Guide (Concise)

Minimal contract for tools/agents working with the Python sample extension.

### 1. Discovery Order
1. `$VIRTUAL_ENV/bin/python`
2. `.vscode/settings.json` → `python.defaultInterpreterPath`
3. `python3` in PATH
4. `python` in PATH
5. (Serve fallback) try `uvicorn`
Fail fast if none found.

### 2. Use Existing Scripts
Prefer:
```bash
./scripts/start-python-dev.sh            # run
./scripts/start-python-dev.sh --tests    # tests
PORT=5182 ./scripts/start-python-dev.sh  # alt port
```
Avoid re-implementing interpreter logic.

### 3. Test & Compare Flow
```bash
(PORT=5182 ./scripts/start-python-dev.sh &)  # python service
./scripts/start-csharp-dev.sh               # c# service
python3 scripts/compare_extensions.py --payload samples/requests/note-payload.json
```
Parity when diff `notes` is empty.

### 4. Dependency Sync (Optional)
Hash `requirements.txt`. If changed:
```bash
/path/python -m pip install -r samples/DragonCopilot/Workflow/pythonSampleExtension/requirements.txt --no-cache-dir
```
Don’t uninstall arbitrary packages.

### 5. Ports
Default 5181. If busy → choose 5182+. Log chosen port.

### 6. Error Matrix
| Issue | Action |
|-------|--------|
| No interpreter | Stop; list attempted paths |
| Install fail | Retry once then abort |
| Port conflict | Increment up to +5 |
| Comparison diff | Report keys/types; no auto-fix |
| Missing tests dir | Recompute relative path |

### 7. Minimal Checklist
- [ ] Interpreter resolved
- [ ] Dependencies current
- [ ] Tests pass
- [ ] Service (if needed) healthy
- [ ] Comparison (if dual) done
- [ ] Diffs (if any) reported

### 8. Snippets
Interpreter candidates:
```bash
[[ -n "$VIRTUAL_ENV" ]] && echo "$VIRTUAL_ENV/bin/python"; \
jq -r '."python.defaultInterpreterPath" // empty' .vscode/settings.json 2>/dev/null; \
command -v python3; command -v python
```
Module check:
```bash
python - <<'PY'
import importlib
for m in ("fastapi","uvicorn","pydantic"):
    try: importlib.import_module(m); print("OK", m)
    except Exception as e: print("MISSING", m, e)
PY
```

### 9. Safety
- Don’t edit `.vscode/settings.json` silently
- No PHI in test payloads
- Log only high-level paths & chosen interpreter

### 10. Future (Optional)
`/internal/env`, lint/format flags, JSON logs, comparison task.

End.
