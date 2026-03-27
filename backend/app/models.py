from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


# ── Enums ─────────────────────────────────────────────────────────────────────

class Severity(str, Enum):
    MILD = "Mild"
    MODERATE = "Moderate"
    SEVERE = "Severe"


class Urgency(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    EMERGENCY = "Emergency"


# ── Doctor ────────────────────────────────────────────────────────────────────

class DoctorProfile(BaseModel):
    id: str
    name: str
    specialty: str
    hospital: str
    location: str
    distance: str
    rating: float = Field(ge=0.0, le=5.0)
    review_count: int = Field(ge=0)
    availability: str
    phone: str
    image_url: str
    accepts_new_patients: bool
    languages: List[str] = []
    board_certified: bool = True
    years_experience: int = 0


# ── Symptom ───────────────────────────────────────────────────────────────────

class SymptomRow(BaseModel):
    symptom: str
    duration: str
    severity: Severity
    urgency: Urgency
    possible_concern: str
    recommended_specialist: str
    next_step: str


# ── Summary ───────────────────────────────────────────────────────────────────

class SummaryData(BaseModel):
    what_you_said: str
    may_indicate: str
    urgency_level: str
    safety_note: str
    next_steps: List[str]
    disclaimer: str = (
        "This is not a medical diagnosis. Always consult a qualified healthcare "
        "professional for medical advice, diagnosis, or treatment."
    )


# ── Agent metrics (Overmind) ──────────────────────────────────────────────────

class AgentMetrics(BaseModel):
    agent_name: str
    duration_ms: float
    success: bool
    tokens_used: Optional[int] = None
    error: Optional[str] = None
    metadata: dict = {}


# ── API request / response ────────────────────────────────────────────────────

class CareGuideRequest(BaseModel):
    transcript: str = Field(..., min_length=3, max_length=4000)


class CareGuideResult(BaseModel):
    summary: SummaryData
    symptoms: List[SymptomRow]
    doctors: List[DoctorProfile]
    is_emergency: bool
    verification_passed: bool
    agent_metrics: List[AgentMetrics] = []


class DoctorSearchRequest(BaseModel):
    specialty: str = Field(..., min_length=2)
    limit: int = Field(default=3, ge=1, le=10)


class DoctorSearchResponse(BaseModel):
    specialty: str
    doctors: List[DoctorProfile]
    total_found: int
