"""Shared pytest fixtures for the Radiologists Python Quickstart tests."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Ensure the sample root (parent of the ``app`` package) is importable.
CURRENT_FILE = Path(__file__).resolve()
SAMPLE_ROOT = CURRENT_FILE.parents[2]
if str(SAMPLE_ROOT) not in sys.path:
    sys.path.insert(0, str(SAMPLE_ROOT))

from app.config import get_settings  # type: ignore  # noqa: E402
from app.main import app  # type: ignore  # noqa: E402


@pytest.fixture()
def client() -> TestClient:
    """FastAPI TestClient with cached settings cleared between tests."""

    get_settings.cache_clear()
    return TestClient(app)


@pytest.fixture()
def sample_request() -> dict:
    """Canonical complete request body (radiology FullRequest example)."""

    return {
        "extensibilityApiVersion": "1.1.1",
        "sessionData": {
            "correlation_id": "11111111-2222-3333-4444-555555555555",
            "session_start": "2025-01-01T10:00:00Z",
            "environment_id": "local-dev",
        },
        "patientInformation": {
            "dateOfBirth": "1980-05-12",
            "biologicalSex": "Female",
        },
        "report": {
            "reportText": (
                "CT ABDOMEN WITH CONTRAST: The liver demonstrates paddock "
                "steatosis. Chest X-ray performed with for views shows clear "
                "lung fields."
            )
        },
    }


@pytest.fixture()
def mock_response_json() -> dict:
    """The canned mock-data file, parsed."""

    mock_path = SAMPLE_ROOT / "MockData" / "qualitycheck_response.json"
    return json.loads(mock_path.read_text(encoding="utf-8"))
