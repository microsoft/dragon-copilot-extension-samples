# Minimal note payload that triggers at least one entity (blood pressure) so counts are deterministic
NOTE_CONTENT = "BP: 145/98 mmHg Patient denies chest pain. Diabetes risk evaluated. Medication review done."

payload = {
    "note": {
        "resources": [
            {"content": NOTE_CONTENT}
        ]
    }
}

# Disabled: samplePluginResult is no longer included in the response payload
# because it caused an extra section rejected by the final application.


def test_adaptive_card_structure(client):
    """Validate the adaptive-card payload key and its AdaptiveCard content."""
    resp = client.post("/v1/process", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True

    # Payload should contain 'sample-entities' and 'adaptive-card' (not 'samplePluginResult')
    assert "adaptive-card" in body["payload"], "adaptive-card key missing from payload"
    assert "samplePluginResult" not in body["payload"], "samplePluginResult should not be present"

    adaptive_wrapper = body["payload"]["adaptive-card"]
    assert isinstance(adaptive_wrapper, dict)
    resources = adaptive_wrapper.get("resources") or []
    assert len(resources) == 1, "Expected 1 resource in adaptive-card"

    card = resources[0]
    assert card.get("type") == "AdaptiveCard"
    assert card.get("subtype") == "note"

    # Validate adaptive card payload
    assert "adaptive_card_payload" in card, "adaptive_card_payload missing"
    ac = card["adaptive_card_payload"]
    assert isinstance(ac, dict)
    assert ac.get("type") == "AdaptiveCard"
    assert ac.get("version") == "1.6"

    # Validate actions exist
    actions = ac.get("actions") or []
    assert len(actions) >= 1, "Card missing actions"

    # Validate metadata fields
    assert card.get("dragonCopilotCopyData"), "dragonCopilotCopyData missing"
    assert card.get("payloadSources"), "payloadSources missing"

