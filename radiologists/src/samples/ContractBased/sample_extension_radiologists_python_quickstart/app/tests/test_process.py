"""Health probe and /v1/process happy-path / validation tests."""

from __future__ import annotations


def test_liveness_returns_healthy(client):
    response = client.get("/health/liveness")
    assert response.status_code == 200
    assert response.json() == {"status": "Healthy"}


def test_readiness_returns_healthy_when_mock_data_present(client):
    response = client.get("/health/readiness")
    assert response.status_code == 200
    assert response.json() == {"status": "Healthy"}


def test_process_happy_path_returns_canned_response(client, sample_request):
    response = client.post("/v1/process", json=sample_request)

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["message"] == "Payload processed successfully."

    recommendations = body["payload"]["qualityCheckResult"]["recommendations"]
    assert len(recommendations) == 3

    types = {rec["qualityCheckType"] for rec in recommendations}
    assert "Clinical" in types
    assert "Billing" in types

    paddock = next(
        rec for rec in recommendations if "paddock steatosis" in rec["description"]
    )
    assert paddock["severityScorePercent"] == 85


def test_process_missing_required_fields_returns_validation_error(client):
    # sessionData is required by the contract; omitting it triggers FastAPI's
    # default 422 validation error.
    response = client.post("/v1/process", json={})
    assert response.status_code == 422
