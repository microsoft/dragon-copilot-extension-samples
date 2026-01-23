from __future__ import annotations
from typing import Any, Dict, List, Optional, Callable
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum

# Expanded model layer to better mirror the C# sample (not full parity but structurally closer)

class Priority(str, Enum):
    High = "High"
    Medium = "Medium"
    Low = "Low"

class ObservationValue(BaseModel):
    text: Optional[str] = None
    conceptId: Optional[str] = None

class Context(BaseModel):
    id: Optional[str] = Field(None, alias="id")
    contentType: Optional[str] = None
    displayDescription: Optional[str] = None

class BaseResource(BaseModel):
    id: Optional[str] = None
    # context: Optional[Context] = None

class MedicalCode(BaseResource):
    type: str = Field("MedicalCode", frozen=True)
    code: Dict[str, Any] | None = None
    priority: Optional[Priority] = None
    reason: Optional[str] = None

class ObservationNumber(BaseResource):
    type: str = Field("ObservationNumber", frozen=True)
    value: Optional[float] = None
    valueUnit: Optional[str] = None
    priority: Optional[Priority] = None

class ObservationConcept(BaseResource):
    type: str = Field("ObservationConcept", frozen=True)
    value: Optional[ObservationValue] = None
    priority: Optional[Priority] = None

class VisualizationResource(BaseResource):
    type: str = Field("AdaptiveCard", frozen=True)
    subtype: str | None = None
    cardTitle: str | None = None
    adaptive_card_payload: Any | None = None
    # actions: List[Dict[str, Any]] | None = None
    payloadSources: List[Dict[str, Any]] | None = None
    dragonCopilotCopyData: str | None = None
    partnerLogo: str | None = None
    references: List[Dict[str, Any]] | None = None

class NoteResource(BaseModel):
    content: Optional[str] = None

## subtype of note shall be lower case 'note'
def _lower_alias(field_name: str) -> str:
    """Generate lowercase aliases for JSON serialization."""
    return field_name.lower()

class Note(BaseModel):
    # Ensure all fields serialize with lowercase keys (even if Python attribute had capitals)
    # model_config = ConfigDict(alias_generator=_lower_alias, populate_by_name=True)
    # # Explicit type indicator (commonly used in DSP resources) kept lowercase per comment
    # type: str = Field(default="note", frozen=True)
    document: Dict[str, Any] | None = None
    resources: List[NoteResource] | None = None

class SessionData(BaseModel):
    sessionId: Optional[str] = None

class DspResponse(BaseModel):
    schema_version: str | None = None
    document: Dict[str, Any] | None = None
    resources: List[Any] = Field(default_factory=list)

class DragonStandardPayload(BaseModel):
    note: Optional[Note] = None
    sessionData: SessionData | None = None

class ProcessResponse(BaseModel):
    success: bool = False
    message: Optional[str] = None
    payload: Dict[str, DspResponse | Any] = Field(default_factory=dict)
