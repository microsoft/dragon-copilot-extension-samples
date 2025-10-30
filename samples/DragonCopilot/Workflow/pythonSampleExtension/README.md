## Dragon Copilot Python Sample Extension

A Python FastAPI implementation that mirrors the C# `SampleExtension.Web` for Dragon Copilot. It demonstrates:

- Clinical entity heuristic extraction (vitals, diabetes code, medication concept)
- DSP-style `ProcessResponse` with multiple payload keys
- Adaptive Card visualization + composite plugin result (`samplePluginResult`)
- Comparison tooling against the C# service
- Section-based test payload simulating real clinical note structure

> Disclaimer: This is a learning/sample artifact – not production hardened. Do **not** use with real PHI. Authentication is intentionally disabled for development.

---
## 1. Features
**Implemented**
- `/health` & `/v1/health` endpoints
- `/v1/process` returning:
	- `sample-entities`
	- `sample-entities-adaptive-card`
	- `samplePluginResult` (Medication Summary + Timeline cards)
- Visualization actions (Accept / Copy / Reject variants)
- Interpreter auto-detection (`scripts/start-python-dev.sh`)
- Test suite (entity extraction + composite plugin result)
- Cross-language comparison script (`scripts/compare_extensions.py`)

**Planned**
- Auth stubs (JWT + license key)
- Structured JSON logging
- Transcript & streaming payload support
- Lint/format script flags (ruff / black)
- CI workflow (GitHub Actions .NET + Python)
- Additional provenance & reference metadata

---
## 2. Quick Start
From repository root:
```bash
./scripts/start-python-dev.sh --install   # one-time dependency install
./scripts/start-python-dev.sh             # start on port 5181
PORT=5182 ./scripts/start-python-dev.sh   # alternate port
```
Swagger / OpenAPI: http://localhost:5181/docs

Run tests only:
```bash
./scripts/start-python-dev.sh --tests
```

Direct (advanced) uvicorn invocation:
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 5181 --reload
```

---
## 3. Scripts Overview
| Script | Purpose |
|--------|---------|
| `scripts/start-python-dev.sh` | Interpreter discovery, optional install, test or run server. |
| `scripts/start-csharp-dev.sh` | Launch C# sample extension (adds dotnet path if needed). |
| `scripts/compare_extensions.py` | Posts a shared payload to both services and summarizes differences. |

Interpreter selection order:
1. Active virtual environment (`$VIRTUAL_ENV`)
2. VS Code `python.defaultInterpreterPath`
3. `python3` or `python` in PATH
4. Fallback: run `uvicorn` directly

Flags (Python script):
```
--install   install dependencies
--tests     run pytest instead of serving
PORT=XXXX   override port
```

---
## 4. Comparison With C# Service
Start both (example: Python on 5182, C# on 5181):
```bash
(PORT=5182 ./scripts/start-python-dev.sh &) && ./scripts/start-csharp-dev.sh
```
Run comparison:
```bash
python3 scripts/compare_extensions.py --payload samples/requests/note-payload.json
```
Output shows:
- top key diff
- payload key diff
- resource counts & type sets

When parity is complete, `notes` array is empty.

---
## 5. Response Structure Example
```jsonc
{
	"success": true,
	"message": "Payload processed successfully",
	"payload": {
		"sample-entities": {
			"schema_version": "0.1",
			"resources": [ { "type": "ObservationNumber" }, { "type": "MedicalCode" } ]
		},
		"sample-entities-adaptive-card": {
			"schema_version": "0.1",
			"resources": [ { "type": "AdaptiveCard", "adaptiveCardPayload": { "type": "AdaptiveCard", "version": "1.3" } } ]
		},
		"samplePluginResult": {
			"schema_version": "0.1",
			"resources": [
				{ "type": "AdaptiveCard", "cardTitle": "Medication Summary & Recommendations (Demo)" },
				{ "type": "AdaptiveCard", "cardTitle": "Recent Clinical Entities Timeline (Demo)" }
			]
		}
	}
}
```

Key differences vs C# naming:
- Python uses `adaptiveCardPayload` (camelCase) internally; C# serialized uses snake_case due to serializer configuration.

---
## 6. Sectioned Clinical Note Testing
`test_clinic_note.py` programmatically splits a realistic clinic note into sections (HPI, Vitals, Labs, Exam, Impression, Plan, Follow‑up) assigning representative LOINC codes. This mirrors the shape of `samples/requests/note-payload.json` while keeping deterministic entity extraction (blood pressure, diabetes, medication keywords).

`test_sample_plugin_result.py` validates:
- Presence of `samplePluginResult`
- Two AdaptiveCard resources (summary + timeline)
- Each card has actions & adaptive card payload
- Copy data markers (demo metadata)

Run all tests:
```bash
pytest -q app/tests
```

Run single test:
```bash
pytest -q app/tests/test_sample_plugin_result.py::test_sample_plugin_result_structure
```

---
## 7. Sample Requests
Health:
```bash
curl -s http://localhost:5181/health | jq
curl -s http://localhost:5181/v1/health | jq
```

Minimal process payload:
```bash
curl -s -X POST http://localhost:5181/v1/process \
	-H 'Content-Type: application/json' \
	-d '{"note":{"resources":[{"content":"Patient has history of diabetes and currently taking metformin. BP recorded."}]}}' | jq
```

Include IDs:
```bash
curl -s -X POST http://localhost:5181/v1/process \
	-H 'Content-Type: application/json' \
	-H 'x-ms-request-id: demo-req-1' \
	-H 'x-ms-correlation-id: demo-corr-1' \
	-d '{"note":{"resources":[{"content":"BP 145/98 mmHg; Diabetes risk; taking metformin"}]}}' | jq
```

---
## 8. Roadmap
| Area | Next Step |
|------|-----------|
| Auth | Add JWT & license-key middleware toggled by env config |
| Logging | Structured JSON (requestId, correlationId, latency) |
| Data Types | Transcript + iterative transcript stubs |
| Quality | Lint/format (`--lint`, `--format` flags) |
| CI | GitHub Actions build + test matrix (.NET / Python) |
| Testing | Additional card action + provenance tests |
| Tooling | Dependency hash cache in start script |

---
## 9. Troubleshooting
| Issue | Resolution |
|-------|------------|
| `ModuleNotFoundError: app` | Run from project root or add pyextension path to `PYTHONPATH`. |
| Port already in use | Stop prior server or run `PORT=5182 ./scripts/start-python-dev.sh`. |
| Missing entities | Ensure note text includes keywords (BP, diabetes, medication). |
| Pydantic deprecation warning | Plan migration to `ConfigDict` (safe short-term). |
| C# service not starting | Install .NET 9+ or ensure PATH; use `scripts/start-csharp-dev.sh`. |

---
## 10. Security & Compliance (Sample Caveats)
- No PHI in test inputs.
- Auth intentionally disabled – add before any real deployment.
- Logging currently minimal; not production ready.

---
## 11. Appendix: Manual Environment Setup
Create & activate a virtual environment manually (alternative to scripts):
```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

Then run:
```bash
./scripts/start-python-dev.sh
```

Coverage (optional):
```bash
pip install pytest-cov
pytest --cov=app --cov-report=term-missing app/tests
```

---
## 12. License
See root `LICENSE`.
