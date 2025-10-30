import sys
from pathlib import Path
from fastapi.testclient import TestClient

CURRENT_FILE = Path(__file__).resolve()
PYEXT_ROOT = CURRENT_FILE.parents[2]
if str(PYEXT_ROOT) not in sys.path:
    sys.path.insert(0, str(PYEXT_ROOT))

from app.main import app  # type: ignore

client = TestClient(app)

# Minimal note payload that triggers at least one entity (blood pressure) so counts are deterministic
NOTE_CONTENT = "BP: 145/98 mmHg Patient denies chest pain. Diabetes risk evaluated. Medication review done."

payload = {
    "note": {
        "resources": [
            {"content": NOTE_CONTENT}
        ]
    }
}

def test_sample_plugin_result_structure():
    resp = client.post("/v1/process", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    plugin = body["payload"].get("samplePluginResult")
    assert plugin is not None, "samplePluginResult missing from payload"
    assert isinstance(plugin, dict)
    resources = plugin.get("resources") or []
    assert len(resources) == 2, "Expected 2 resources in samplePluginResult (summary + timeline)"

    # Validate both are AdaptiveCards
    types = [r.get("type") for r in resources if isinstance(r, dict)]
    assert all(t == "AdaptiveCard" for t in types), f"Unexpected resource types: {types}"

    # Identify cards by titles
    titles = {r.get("cardTitle"): r for r in resources if isinstance(r, dict)}
    summary_card = next((r for r in resources if "Medication" in (r.get("cardTitle") or "")), None)
    timeline_card = next((r for r in resources if "Timeline" in (r.get("cardTitle") or "")), None)
    assert summary_card is not None, "Medication summary card not found"
    assert timeline_card is not None, "Timeline card not found"

    # Basic action validation (at least one action per card)
    for card in (summary_card, timeline_card):
        actions = card.get("actions") or []
        assert len(actions) >= 1, f"Card {card.get('cardTitle')} missing actions"

    # Ensure adaptive card payload present
    for card in (summary_card, timeline_card):
        # Python model uses camelCase adaptiveCardPayload
        assert "adaptiveCardPayload" in card, f"Adaptive card payload missing for {card.get('cardTitle')}"
        ac = card["adaptiveCardPayload"]
        assert isinstance(ac, dict)
        assert ac.get("type") == "AdaptiveCard"
        assert ac.get("version") in {"1.3", "1.2", "1.4"}

    # Validate dragonCopilotCopyData has a recognizable pattern
    for card in (summary_card, timeline_card):
        dccd = card.get("dragonCopilotCopyData", "")
        assert dccd, "dragonCopilotCopyData missing"
        assert "demo:1" in dccd or "generated:" in dccd

