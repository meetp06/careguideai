"""
Agent 2 — Doctor Matcher
-------------------------
Queries Aerospike for doctors matching the primary specialty extracted by
Agent 1.  Falls back to the local JSON dataset when Aerospike is unavailable.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List, Tuple

from app.config import settings
from app.models import AgentMetrics, DoctorProfile
from app.services.aerospike_service import aerospike_service
from app.services.overmind_service import overmind_service

logger = logging.getLogger(__name__)

# Normalise specialty names coming from the LLM to canonical names stored in DB
SPECIALTY_ALIASES: Dict[str, str] = {
    "cardiologist": "Cardiology",
    "neurologist": "Neurology",
    "orthopedist": "Orthopedics",
    "orthopaedics": "Orthopedics",
    "pulmonologist": "Pulmonology",
    "respiratory": "Pulmonology",
    "gp": "Primary Care",
    "general practitioner": "Primary Care",
    "family medicine": "Primary Care",
    "family doctor": "Primary Care",
    "internist": "Primary Care",
    "psychiatrist": "Psychiatry",
    "gastroenterologist": "Gastroenterology",
    "gi": "Gastroenterology",
    "endocrinologist": "Endocrinology",
    "dermatologist": "Dermatology",
    "pediatrician": "Pediatrics",
    "ophthalmologist": "Ophthalmology",
    "nephrologist": "Nephrology",
    "rheumatologist": "Rheumatology",
    "oncologist": "Oncology",
    "er": "Emergency Medicine",
    "emergency": "Emergency Medicine",
}


def _normalise_specialty(specialty: str) -> str:
    key = specialty.strip().lower()
    return SPECIALTY_ALIASES.get(key, specialty.strip().title())


def _load_local_doctors() -> List[Dict[str, Any]]:
    path = os.path.abspath(settings.DOCTORS_JSON_PATH)
    try:
        with open(path, "r") as f:
            return json.load(f)
    except Exception as exc:
        logger.error("Could not load local doctors.json: %s", exc)
        return []


def _local_fallback(specialty: str, limit: int) -> List[Dict[str, Any]]:
    """Filter local JSON dataset by specialty."""
    doctors = _load_local_doctors()
    matched = [d for d in doctors if d.get("specialty", "").lower() == specialty.lower()]
    matched.sort(key=lambda d: d.get("rating", 0), reverse=True)
    if not matched:
        # Broaden to Primary Care if nothing found
        matched = [d for d in doctors if d.get("specialty") == "Primary Care"]
        matched.sort(key=lambda d: d.get("rating", 0), reverse=True)
    return matched[:limit]


def run(
    primary_specialty: str, limit: int = 3
) -> Tuple[List[DoctorProfile], AgentMetrics]:
    """
    Returns (doctor_profiles, metrics).
    """
    normalised = _normalise_specialty(primary_specialty)

    with overmind_service.trace("doctor_matcher", {"specialty": normalised, "limit": limit}):
        if aerospike_service.is_connected:
            raw_doctors = aerospike_service.get_doctors_by_specialty(normalised, limit)
            source = "aerospike"
        else:
            raw_doctors = _local_fallback(normalised, limit)
            source = "local_json"

        logger.info(
            "Doctor matcher: specialty=%s source=%s found=%d",
            normalised, source, len(raw_doctors),
        )

    profiles: List[DoctorProfile] = []
    for d in raw_doctors:
        try:
            profiles.append(
                DoctorProfile(
                    id=d.get("id", ""),
                    name=d.get("name", ""),
                    specialty=d.get("specialty", normalised),
                    hospital=d.get("hospital", ""),
                    location=d.get("location", ""),
                    distance=d.get("distance", "N/A"),
                    rating=float(d.get("rating", 4.5)),
                    review_count=int(d.get("review_count", 0)),
                    availability=d.get("availability", "Call to schedule"),
                    phone=d.get("phone", ""),
                    image_url=d.get("image_url", ""),
                    accepts_new_patients=bool(d.get("accepts_new_patients", True)),
                    languages=d.get("languages", ["English"]),
                    board_certified=bool(d.get("board_certified", True)),
                    years_experience=int(d.get("years_experience", 0)),
                )
            )
        except Exception as exc:
            logger.warning("Skipping malformed doctor record: %s", exc)

    metrics = AgentMetrics(
        agent_name="doctor_matcher",
        duration_ms=0,
        success=True,
        metadata={"specialty": normalised, "source": source, "count": len(profiles)},
    )
    return profiles, metrics
