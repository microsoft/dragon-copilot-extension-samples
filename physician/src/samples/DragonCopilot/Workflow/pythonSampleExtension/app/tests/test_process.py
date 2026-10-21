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

def test_process_api_1_2_0_payload_with_additional_inputs(client):
    from app.models import DragonStandardPayload

    body = {
        "extensibilityApiVersion": "1.2.0",
        "sessionData": {
            "correlation_id": "f40dd0d0-4201-d29d-79b4-df40189fd2f0",
            "environment_id": "01bd0d47-1621-4a29-941d-00e9a9420f20",
            "customer_tenant_id": "01bd0d47-1621-4a29-941d-00e9a9420f20",
        },
        "encounter-context": {"resourceType": "Bundle", "type": "collection", "entry": []},
        "card-content": {"action": {"verb": "accept"}},
    }

    r = client.post("/v1/process?api-version=1.2.0", json=body)
    assert r.status_code == 200
    assert r.json()["success"] is True

    payload = DragonStandardPayload.model_validate(body)
    assert payload.sessionData.customer_tenant_id == body["sessionData"]["customer_tenant_id"]
    assert set(payload.model_extra) == {"encounter-context", "card-content"}
