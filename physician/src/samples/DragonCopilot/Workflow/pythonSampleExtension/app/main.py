from fastapi import FastAPI, Header, HTTPException, Request
# RequestValidationError import kept for reference; handler is commented out below
# from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, RedirectResponse
from .models import DragonStandardPayload, ProcessResponse
from .service import ProcessingService
from datetime import datetime, timezone
from .config import get_settings
import logging

logger = logging.getLogger("dragon.pyextension")
logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s %(name)s - %(message)s")

settings = get_settings()
app = FastAPI(title=settings.app_name, version=settings.version)
service = ProcessingService()

@app.middleware("http")
async def header_logging_middleware(request: Request, call_next):  # basic structured log of tracing headers
    req_id = request.headers.get("x-ms-request-id")
    corr_id = request.headers.get("x-ms-correlation-id")
    logger.info("Incoming %s %s req_id=%s corr_id=%s", request.method, request.url.path, req_id, corr_id)
    try:
        response = await call_next(request)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Unhandled exception processing request")
        return JSONResponse(status_code=500, content={"success": False, "error": "Internal server error"})
    return response

@app.get("/", include_in_schema=False)
async def root_redirect():
    # Mirror C# swagger root exposure
    return RedirectResponse(url="/docs")

@app.get("/health")
async def root_health():
    return {"status": "healthy", "version": settings.version}

@app.get("/v1/health")
async def versioned_health():
    return {
        "service": settings.app_name,
        "status": "healthy",
        "version": settings.version,
        "endpoints": {"process": "/v1/process", "health": "/v1/health"}
    }

# @app.exception_handler(RequestValidationError)
# async def validation_exception_handler(request: Request, exc: RequestValidationError):  # noqa: D401
#     """Return structured details for 422 errors and log them for diagnostics."""
#     logger.warning(
#         "Validation failed on %s %s errors=%s", request.method, request.url.path, exc.errors()
#     )
#     return JSONResponse(
#         status_code=422,
#         content={
#             "success": False,
#             "message": "Request validation failed",
#             "errors": exc.errors(),
#         },
#     )

@app.post("/v1/process", response_model=ProcessResponse)
async def process_endpoint(
    payload: DragonStandardPayload,
    x_ms_request_id: str | None = Header(default=None, alias="x-ms-request-id"),
    x_ms_correlation_id: str | None = Header(default=None, alias="x-ms-correlation-id"),
):
    try:
        start_time = datetime.now(timezone.utc)
        logger.info("Processing incoming request at %s", start_time)
        resp = service.process(payload, x_ms_request_id, x_ms_correlation_id)
        elapsed = datetime.now(timezone.utc) - start_time
        logger.info("Request processed in %s", elapsed)
        return resp
    except HTTPException:
        raise
    except Exception:  # noqa: BLE001
        logger.exception("Processing failure")
        raise HTTPException(status_code=500, detail="Internal server error")
