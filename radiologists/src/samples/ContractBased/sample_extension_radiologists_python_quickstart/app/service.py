"""Quality-check service.

Returns a stubbed response loaded from ``MockData/qualitycheck_response.json``.
This is the single integration point: partners replace
:meth:`QualityCheckService.process_async` with their real implementation.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from .config import Settings, get_settings
from .models import ProcessRequest, ProcessResponse, QualityCheckResult

logger = logging.getLogger("dragon.radiologists.pyextension")

_QUALITY_CHECK_PAYLOAD_KEY = "qualityCheckResult"


class QualityCheckService:
    """Loads canned quality-check data and returns it for any request."""

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        # MockData lives at the sample root, next to the ``app`` package.
        sample_root = Path(__file__).resolve().parents[1]
        self._mock_data_path = sample_root / self._settings.mock_data_file
        self._mock_response: ProcessResponse | None = None

    def mock_data_exists(self) -> bool:
        """Whether the canned mock-data file is present (readiness probe)."""

        return self._mock_data_path.is_file()

    async def process_async(self, payload: ProcessRequest) -> ProcessResponse:
        """Run the quality check for an incoming request.

        The only logic here is returning the canned mock data. Partners replace
        this method with their real implementation.
        """

        report_length = len(payload.report.report_text) if payload.report else 0
        logger.info(
            "Running quality check on radiology request. correlation_id=%s report_length=%s",
            payload.session_data.correlation_id,
            report_length,
        )
        logger.info("No model provider configured. Returning mock data.")
        return self._process_with_mock_data()

    def _process_with_mock_data(self) -> ProcessResponse:
        template = self._load_mock_response()
        result = ProcessResponse(
            success=template.success,
            message=template.message,
            payload={},
        )

        if template.payload and _QUALITY_CHECK_PAYLOAD_KEY in template.payload:
            template_qc = template.payload[_QUALITY_CHECK_PAYLOAD_KEY]
            result.payload[_QUALITY_CHECK_PAYLOAD_KEY] = QualityCheckResult(
                recommendations=list(template_qc.recommendations)
            )

        return result

    def _load_mock_response(self) -> ProcessResponse:
        if self._mock_response is not None:
            return self._mock_response

        if not self._mock_data_path.is_file():
            logger.warning(
                "Mock data file not found at %s. Returning an empty successful response.",
                self._mock_data_path,
            )
            self._mock_response = ProcessResponse(
                success=True, message="No mock data configured."
            )
            return self._mock_response

        raw = json.loads(self._mock_data_path.read_text(encoding="utf-8"))
        response = ProcessResponse.model_validate(raw)
        count = (
            len(response.payload[_QUALITY_CHECK_PAYLOAD_KEY].recommendations)
            if response.payload and _QUALITY_CHECK_PAYLOAD_KEY in response.payload
            else 0
        )
        logger.info(
            "Loaded %s mock recommendation(s) from %s.", count, self._mock_data_path
        )
        self._mock_response = response
        return self._mock_response
