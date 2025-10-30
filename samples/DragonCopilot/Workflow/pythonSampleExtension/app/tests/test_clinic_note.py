import sys
from pathlib import Path
from fastapi.testclient import TestClient

# Ensure import path
CURRENT_FILE = Path(__file__).resolve()
PYEXT_ROOT = CURRENT_FILE.parents[2]
if str(PYEXT_ROOT) not in sys.path:
    sys.path.insert(0, str(PYEXT_ROOT))

from app.main import app  # type: ignore

client = TestClient(app)

CLINIC_NOTE = """Clinic Note\nPatient Name: John Doe\nDate of Note: 09/09/2025\nLocation: Haddox Medi-clinic \n\nSubjective:\nPatient is a 65-year-old white male here for evaluation of elevated blood pressure and fatigue. No prior diagnosis of hypertension or diabetes. Family history includes hypertension and diabetes in both parents. Patient reports sedentary lifestyle and BMI is elevated.\n\nObjective:\n\nVitals:\nBP: 145/98 mmHg\nHR: 78 bpm\nTemp: 98.6°F\nRR: 16\nSpO₂: 98% RA\n\nHeight: 5'10"\nWeight: 210 lbs\nBMI: 30.1 kg/m²\n\nLabs:\nFasting glucose: 108 mg/dL\nHbA1c: 5.9%\nLipid panel: Total cholesterol 210 mg/dL, LDL 140 mg/dL, HDL 42 mg/dL, Triglycerides 180 mg/dL\n\nPhysical Examination:\nGeneral: Well-nourished, well-developed male in no acute distress\nHEENT: Normocephalic, atraumatic, PERRLA, EOMI, oropharynx clear\nNeck: Supple, no lymphadenopathy or thyromegaly\nCardiovascular: Regular rate and rhythm, no murmurs, rubs, or gallops\nRespiratory: Clear to auscultation bilaterally, no wheezes or rales\nAbdomen: Soft, non-tender, no hepatosplenomegaly\nGenitourinary: Normal external genitalia, no CVA tenderness\nExtremities: No edema, pulses intact\nNeurological: Alert and oriented x3, normal gait\nSkin: Warm, dry, intact\n\nImpression:\nHypertension\n\nPlan:\nHypertension:\nLifestyle counseling: DASH diet, physical activity.\nConsider outpatient follow-up for repeat BP and possible initiation of antihypertensives if persistently elevated.\n\nDiabetes:\nRepeat fasting glucose and HbA1c in 3 months.\nRefer to outpatient diabetes prevention program.\nEncourage weight loss and increased physical activity.\n\nFollow-up:\nPCP visit in 1–2 weeks.\nNutritionist referral."""


def _extract_sections(note: str):
    """Extract logical sections from the clinic note to simulate structured document sections.
    Returns list of tuples: (section_key, display_description, content, loinc_code)
    """
    # Basic markers
    markers = [
        ("Subjective:", "HISTORY OF PRESENT ILLNESS", "10164-2"),
        ("Vitals:", "VITAL SIGNS", "8716-3"),  # sample vitals code
        ("Labs:", "RESULTS", "30954-2"),
        ("Physical Examination:", "PHYSICAL EXAM", "29545-1"),
        ("Impression:", "ASSESSMENT", "51847-2"),
        ("Plan:", "PLAN", "51847-2"),
        ("Follow-up:", "FOLLOW-UP", "8653-8"),
    ]

    # Find indices
    idx_map = {}
    for marker, desc, code in markers:
        pos = note.find(marker)
        if pos != -1:
            idx_map[marker] = pos

    # Sort markers by position
    ordered = [m for m in markers if m[0] in idx_map]
    ordered.sort(key=lambda t: idx_map[t[0]])

    sections = []
    for i, (marker, desc, code) in enumerate(ordered):
        start = idx_map[marker]
        # Advance past marker line
        start_content = start + len(marker)
        end = len(note)
        if i + 1 < len(ordered):
            end = idx_map[ordered[i + 1][0]]
        content = note[start_content:end].strip()
        if content:
            sections.append((marker.rstrip(':'), desc, content, code))
    return sections


def _build_structured_resources():
    resources = []
    for idx, (key, desc, content, code) in enumerate(_extract_sections(CLINIC_NOTE)):
        resources.append({
            "legacy_id": key.lower().replace(' ', '_'),
            "context": {
                "content_type": "document_section",
                "display_description": desc,
                "spoken_forms": [desc.lower(), key.lower(), key],
                "codes": [
                    {"system": "loinc.org", "identifier": code, "system_url": "http://loinc.org"}
                ]
            },
            "content": content
        })
    return resources


def test_clinic_note_entity_extraction():
    # Structured payload modeled after samples/requests/note-payload.json but minimized for test speed
    resources = _build_structured_resources()
    # Ensure at least one resource retains BP reading for entity extraction
    assert any("BP:" in r.get("content", "") for r in resources)

    payload = {
        "sessionData": {
            "correlation_id": "test-correlation-123",
            "session_start": "2025-09-13T00:00:00Z",
            "environment_id": "test-env"
        },
        "note": {
            "payload_version": "1.1.0",
            "schema_version": "0.1",
            "language": "en-US",
            "document": {
                "title": "Outpatient Note",
                "type": {"text": "Clinic Note"}
            },
            "resources": resources
        }
    }
    resp = client.post("/v1/process", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    entities_wrapper = body["payload"].get("sample-entities", {})
    if isinstance(entities_wrapper, dict):
        entities = entities_wrapper.get("resources", [])
    else:
        entities = entities_wrapper
    # Expect at least one vital sign (BP) and one diabetes-related code or concept
    types = {e.get("type") for e in entities if isinstance(e, dict)}
    assert "ObservationNumber" in types  # blood pressure
    assert "MedicalCode" in types or "ObservationConcept" in types  # diabetes indicators
    adaptive_wrapper = body["payload"].get("sample-entities-adaptive-card")
    assert adaptive_wrapper is not None
    # Unwrap DSP response structure -> resources[0] should be the actual adaptive card visualization resource
    if isinstance(adaptive_wrapper, dict) and "resources" in adaptive_wrapper:
        adaptive_resources = adaptive_wrapper.get("resources", [])
        assert len(adaptive_resources) == 1
        adaptive = adaptive_resources[0]
    else:
        adaptive = adaptive_wrapper
    assert adaptive.get("type") == "AdaptiveCard"