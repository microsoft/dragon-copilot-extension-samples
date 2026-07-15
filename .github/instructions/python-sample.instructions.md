---
applyTo: "**/*.py,**/requirements.txt,**/pyproject.toml"
---

# Python Sample Conventions — Copilot Instructions

Shared Python conventions for sample extensions in this repository. This repository contains samples for multiple Dragon Copilot products (Physicians, Radiologists, and potentially others in the future). Product-specific patterns live in the matching `<product>.instructions.md` overlay.

## Stack

| Component         | Version |
| ----------------- | ------- |
| Python            | 3.12    |
| FastAPI           | 0.116.1 |
| uvicorn           | 0.35.0  |
| pydantic          | 2.11.7  |
| pydantic-settings | 2.10.1  |
| pytest            | 9.0.3   |

Pin these exact versions in `requirements.txt`. Use `requirements.txt`, not `pyproject.toml`, to match the existing precedent and keep installation simple for partners.

> Python 3.12 is recommended over 3.14 because several ML / AI Python SDKs do not yet fully support 3.14.

## Project layout

```
<sample-name>/
├── README.md
├── requirements.txt
└── app/
    ├── __init__.py
    ├── main.py            # FastAPI app, /v1/process, /health endpoints
    ├── config.py          # pydantic-settings
    ├── auth.py            # Entra ID JWT bearer validation (toggleable)
    ├── models.py          # Pydantic mirrors of the C# models (Physicians: DragonStandardPayload; Radiologists: ProcessRequest/ProcessResponse)
    ├── service.py         # Business logic / mock data fallback
    └── tests/
        ├── __init__.py
        └── test_*.py
```

## Endpoint pattern

- Use FastAPI's decorator-based routing: `@app.post("/v1/process")`.
- Define request and response models with Pydantic; do not return raw dicts. The exact DTO types vary by product — Physicians use `DragonStandardPayload`, Radiologists use `ProcessRequest`/`ProcessResponse`. Mirror the corresponding C# models project (`physician/src/models/` or `radiologists/src/models/`).
- Serialize responses with `model_dump(by_alias=True, exclude_none=True)` so `None`-valued properties are omitted from the wire — matching the C# `DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull` convention (the OpenAPI contract marks optional fields as absent, not `null`).
- Health endpoints at `/health/liveness` and `/health/readiness` return JSON status payloads, matching the C# samples and the scaffold prompt.
- Enable FastAPI's automatic Swagger / OpenAPI generation; expose it at `/docs`.

## Configuration

- Use `pydantic_settings.BaseSettings` in `app/config.py`.
- Load `.env` via `model_config = SettingsConfigDict(env_file=".env")`.
- Authentication is disabled by default for development. Document the flag in the sample's README so partners enable it intentionally when they harden for production.

## Naming

- snake_case for filenames inside the `app/` package.
- Mock data filenames use the language's idiomatic casing (e.g., `qualitycheck_response.json` for Radiologists). The exact filename varies — check the corresponding C# sample's `MockData/` folder.
- PascalCase for Pydantic model classes mirroring C# DTOs (`Report`, `PatientInformation`, `DragonStandardPayload`, etc.).
- snake_case for field names exposed by Pydantic; use `alias` / `populate_by_name` if the JSON contract uses camelCase.

## Running locally

```powershell
python3.12 -m venv .venv
. .\.venv\Scripts\Activate.ps1
python3.12 -m pip install --upgrade pip
python3.12 -m pip install -r requirements.txt
python3.12 -m uvicorn app.main:app --host 0.0.0.0 --port <port> --reload
```

```bash
python3.12 -m venv .venv && source .venv/bin/activate && python3.12 -m pip install --upgrade pip && python3.12 -m pip install -r requirements.txt
python3.12 -m uvicorn app.main:app --host 0.0.0.0 --port <port> --reload
```

Pick a port that matches the C# sample default for the same product (Physicians: 5181, Radiologists: 5080) so partners can swap implementations without changing client URLs.

## Testing

- Use `pytest` and FastAPI's `TestClient` (`from fastapi.testclient import TestClient`).
- Keep tests minimal: happy-path `/v1/process`, health endpoints, and deserialization of the mock response.
