"""FastAPI application for the Radiology quality-check sample extension.

Exposes ``POST /v1/process`` plus liveness/readiness probes, mirroring the C#
Quickstart. CORS is fully open for local testing (lock this down in
production). Swagger UI is served by FastAPI at ``/docs``; ``GET /`` redirects
there.
"""

from __future__ import annotations

import logging

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

from .auth import require_auth
from .config import get_settings
from .models import ProcessRequest, ProcessResponse, serialize_response
from .service import QualityCheckService

logger = logging.getLogger("dragon.radiology.pyextension")
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s %(name)s - %(message)s",
)

settings = get_settings()
service = QualityCheckService(settings)

app = FastAPI(
    title="Simple Radiology Extension API",
    version=settings.version,
    description=(
        "A simple radiology extension sample that demonstrates the extension "
        "pattern for Dragon Copilot."
    ),
)

# CORS is fully open here for easy local testing.
# WARNING: restrict allowed origins, methods, and headers for production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _health_payload() -> dict[str, str]:
    return {"status": "Healthy"}


@app.get("/", include_in_schema=False)
async def root_redirect() -> RedirectResponse:
    """Redirect the root to the bundled Swagger UI (mirrors the C# sample)."""

    return RedirectResponse(url="/docs")


@app.get("/health/liveness", tags=["health"])
async def liveness() -> dict[str, str]:
    """Liveness probe. Returns ``{"status": "Healthy"}``."""

    return _health_payload()


@app.get("/health/readiness", tags=["health"])
async def readiness() -> JSONResponse:
    """Readiness probe. Healthy only when the canned mock data is present."""

    if service.mock_data_exists():
        return JSONResponse(status_code=200, content=_health_payload())
    return JSONResponse(status_code=503, content={"status": "Unhealthy"})


@app.post("/v1/process", response_model=ProcessResponse)
async def process(
    payload: ProcessRequest,
    _claims: dict | None = Depends(require_auth),
) -> JSONResponse:
    """Analyze a radiology report and return quality-check recommendations.

    This sample returns stubbed data loaded from
    ``MockData/qualitycheck_response.json``. Replace
    :meth:`QualityCheckService.process_async` with your real implementation.
    """

    logger.info(
        "Received POST /v1/process - correlation_id=%s",
        payload.session_data.correlation_id,
    )
    result = await service.process_async(payload)
    logger.info(
        "Response POST /v1/process - success=%s message=%s",
        result.success,
        result.message,
    )
    return JSONResponse(status_code=200, content=serialize_response(result))
