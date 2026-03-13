def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"

def test_v1_health(client):
    r = client.get("/v1/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "healthy"
    assert "/v1/process" in body["endpoints"]["process"]

def test_process_empty_payload(client):
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
