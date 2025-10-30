import sys
from pathlib import Path

# Ensure the pyextension root (parent of the 'app' package) is on sys.path so 'app' can be imported
CURRENT_FILE = Path(__file__).resolve()
PYEXT_ROOT = CURRENT_FILE.parents[2]  # .../pyextension
if str(PYEXT_ROOT) not in sys.path:
    sys.path.insert(0, str(PYEXT_ROOT))

from fastapi.testclient import TestClient  # type: ignore
from app.main import app  # type: ignore

client = TestClient(app)

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"

def test_v1_health():
    r = client.get("/v1/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "healthy"
    assert "/v1/process" in body["endpoints"]["process"]

def test_process_empty_payload():
    r = client.post("/v1/process", json={})
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert "payload" in data
    # payload keys may now map to DSP response objects
    if "sample-entities" in data["payload"]:
        se = data["payload"]["sample-entities"]
        if isinstance(se, dict):
            # DSP response shape expectation
            assert "resources" in se
