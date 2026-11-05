"""Pydantic mirrors of the C# Dragon.Copilot.Radiologists.Models wire types.

Internal Python attributes use snake_case (idiomatic), while the JSON wire
contract uses the casing defined in radiologists-extensibility-api.yaml. The
mapping is expressed with pydantic ``alias`` values, mirroring the
``[JsonPropertyName]`` attributes on the C# models:

* Top-level envelope and ``PatientInformation`` / ``Report`` -> camelCase.
* ``SessionData`` -> snake_case (inherited from the upstream Dragon contract).

``populate_by_name=True`` lets tests and internal code construct models with
either the Python attribute name or the wire alias.
"""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class _WireModel(BaseModel):
    """Base model: serialize by alias, accept either alias or field name."""

    model_config = ConfigDict(populate_by_name=True)


class BiologicalSex(str, Enum):
    """Biological sex of the patient (mirrors C# BiologicalSex enum)."""

    Male = "Male"
    Female = "Female"
    Unknown = "Unknown"
    Other = "Other"


class QualityCheckType(str, Enum):
    """The type of quality check (mirrors C# QualityCheckType enum)."""

    Billing = "Billing"
    Clinical = "Clinical"


class SessionData(_WireModel):
    """Session context for request correlation and tracking.

    JSON property names on this type are snake_case by design, inherited from
    the upstream Dragon SessionData contract.
    """

    correlation_id: str | None = Field(default=None, alias="correlation_id")
    session_start: datetime | None = Field(default=None, alias="session_start")
    environment_id: str | None = Field(default=None, alias="environment_id")


class PatientInformation(_WireModel):
    """Patient demographic information."""

    date_of_birth: date | None = Field(default=None, alias="dateOfBirth")
    biological_sex: BiologicalSex | None = Field(default=None, alias="biologicalSex")


class Report(_WireModel):
    """Radiology report text payload."""

    report_text: str = Field(alias="reportText")


class Provenance(_WireModel):
    """Identifies a section in the report used to generate a recommendation."""

    text: str | None = None
    start_position: float | None = Field(default=None, alias="startPosition")
    end_position: float | None = Field(default=None, alias="endPosition")


class ReferenceResource(_WireModel):
    """A reference resource that helps understand the recommendation."""

    type: str | None = None
    content: str | None = None


class Recommendation(_WireModel):
    """A quality-check recommendation produced by an extension."""

    quality_check_type: QualityCheckType = Field(alias="qualityCheckType")
    description: str
    reason: str
    severity_score_percent: float | None = Field(
        default=None, alias="severityScorePercent"
    )
    provenance: list[Provenance] | None = None
    reference_resources: list[ReferenceResource] | None = Field(
        default=None, alias="referenceResources"
    )
    additional_info: dict[str, str] | None = Field(default=None, alias="additionalInfo")


class QualityCheckResult(_WireModel):
    """Quality-check result payload containing billing and clinical findings."""

    recommendations: list[Recommendation] = Field(default_factory=list)


class ProcessRequest(_WireModel):
    """Request envelope for the /v1/process endpoint.

    Only ``session_data`` is required. ``additionalProperties: true`` in the
    OpenAPI schema means partner payloads may carry extra named inputs; pydantic
    ignores unknown keys by default, so the extension keeps working as the API
    evolves.
    """

    extensibility_api_version: str | None = Field(
        default=None, alias="extensibilityApiVersion"
    )
    session_data: SessionData = Field(alias="sessionData")
    patient_information: PatientInformation | None = Field(
        default=None, alias="patientInformation"
    )
    report: Report | None = None


class ProcessResponse(_WireModel):
    """Response envelope for the /v1/process endpoint.

    ``payload`` is a map of named outputs (e.g. ``qualityCheckResult``), each
    value being a :class:`QualityCheckResult`. Output names are declared in the
    extension's manifest. There is intentionally no version field on the
    response.
    """

    success: bool | None = None
    message: str | None = None
    payload: dict[str, QualityCheckResult] | None = None


def serialize_response(response: ProcessResponse) -> dict[str, Any]:
    """Serialize a ProcessResponse to a wire-shaped dict (camelCase aliases)."""

    return response.model_dump(by_alias=True, exclude_none=True)
