import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Ensure the pyextension root (parent of the 'app' package) is on sys.path so 'app' can be imported
CURRENT_FILE = Path(__file__).resolve()
PYEXT_ROOT = CURRENT_FILE.parents[2]  # .../pyextension
if str(PYEXT_ROOT) not in sys.path:
    sys.path.insert(0, str(PYEXT_ROOT))

from app.main import app  # type: ignore  # noqa: E402


@pytest.fixture()
def client():
    """Shared FastAPI TestClient fixture."""
    return TestClient(app)
