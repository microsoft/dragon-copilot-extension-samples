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

---
## 2. Quick Start
From repository python sample dir:

### 2.1 Quick Start for Linux and Mac
Ensure python3.12 is installed and can be executed from your cmd shell as `python3.12`.

Run the following cmds in bash/zsh to start server.
```shell
# 1. change to the pythonSampleExtension directory
cd ./samples/DragonCopilot/Workflow/pythonSampleExtension;

# 2. create venv, activate venv and install packages
python3.12 -m venv .venv && source .venv/bin/activate && python3.12 -m pip install --upgrade pip && python3.12 -m pip install -r requirements.txt;

# 3. start server with uvicorn invocation
python3.12 -m uvicorn app.main:app --host 0.0.0.0 --port 5181 --reload
```

### 2.2 Quick Start for Windows
Ensure `python3.12` is installed over Microsoft Store and can be executed from your powershell as `python3.12`.

Run the following cmds in the Powershell to start server.
```powershell
# 1. change to the pythonSampleExtension directory
cd .\samples\DragonCopilot\Workflow\pythonSampleExtension;

# 2. create venv, activate venv and install packages
python3.12 -m venv .venv && .\.venv\Scripts\activate && python3.12 -m pip install --upgrade pip && python3.12 -m pip install -r requirements.txt;

# 3. start server with uvicorn invocation
python3.12 -m uvicorn app.main:app --host 0.0.0.0 --port 5181 --reload
```

## 3 Access the Swagger / OpenAPI 
After server start, you shall be able to access the python workflow sample server via Swagger / OpenAPI from your browser with the: `http://localhost:5181/docs`

---
## 4. Testing APIs with Sample Requests
After server started successfully, you can test the python workflow samples from commandline.

### 4.1 Testing APIs for Linux / Mac
**Health API**:
```shell
curl -s http://localhost:5181/health | jq
curl -s http://localhost:5181/v1/health | jq
```

**Process API**:
Minimal process payload:
```shell
curl -s -X POST http://localhost:5181/v1/process \
	-H 'Content-Type: application/json' \
	-d '{"note":{"resources":[{"content":"Patient has history of diabetes and currently taking metformin. BP recorded."}]}}' | jq
```

Include IDs:
```shell
curl -s -X POST http://localhost:5181/v1/process \
	-H 'Content-Type: application/json' \
	-H 'x-ms-request-id: demo-req-1' \
	-H 'x-ms-correlation-id: demo-corr-1' \
	-d '{"note":{"resources":[{"content":"BP 145/98 mmHg; Diabetes risk; taking metformin"}]}}' | jq
```

### 4.2 Testing APIs for Windows
**Health API**:
```powershell
Invoke-RestMethod -Uri "http://localhost:5181/health" | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri "http://localhost:5181/v1/health" | ConvertTo-Json -Depth 5
```

**Process API**:
Minimal process payload:
```powershell
Invoke-RestMethod -Uri "http://localhost:5181/v1/process" -Method Post -ContentType "application/json" -Body '{"note":{"resources":[{"content":"Patient has history of diabetes and currently taking metformin. BP recorded."}]}}' | ConvertTo-Json -Depth 10
```

Include IDs:
```powershell
Invoke-RestMethod -Uri "http://localhost:5181/v1/process" -Method Post -ContentType "application/json" -Headers @{"x-ms-request-id"="demo-req-1"; "x-ms-correlation-id"="demo-corr-1"} -Body '{"note":{"resources":[{"content":"BP 145/98 mmHg; Diabetes risk; taking metformin"}]}}' | ConvertTo-Json -Depth 10
```

---
## 5. Response Structure Example
You shall see the workflow sample server returns response similar to the following response structure.

```json
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
---
## 6. License
See root `LICENSE`.
