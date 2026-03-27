"""
Doctors Router
--------------
GET  /doctors/search?specialty=Cardiology&limit=3
GET  /doctors/{doctor_id}
GET  /doctors/specialties          (list all available specialties)
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.models import DoctorProfile, DoctorSearchResponse
from app.services.aerospike_service import aerospike_service

router = APIRouter(prefix="/doctors", tags=["doctors"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _load_local_doctors() -> List[Dict[str, Any]]:
    path = os.path.abspath(settings.DOCTORS_JSON_PATH)
    with open(path, "r") as f:
        return json.load(f)


def _raw_to_profile(d: Dict[str, Any]) -> DoctorProfile:
    return DoctorProfile(
        id=d.get("id", ""),
        name=d.get("name", ""),
        specialty=d.get("specialty", ""),
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


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/search", response_model=DoctorSearchResponse)
async def search_doctors(
    specialty: str = Query(..., min_length=2, description="Medical specialty"),
    limit: int = Query(default=3, ge=1, le=10),
) -> DoctorSearchResponse:
    """
    Return up to `limit` doctors for the given specialty, sorted by rating.
    Reads from Aerospike when available, falls back to local JSON.
    """
    if aerospike_service.is_connected:
        raw = aerospike_service.get_doctors_by_specialty(specialty, limit)
        if not raw:
            # Broaden to local JSON if Aerospike has no matching records
            local = _load_local_doctors()
            raw = [d for d in local if d.get("specialty", "").lower() == specialty.lower()]
            raw.sort(key=lambda d: d.get("rating", 0), reverse=True)
            raw = raw[:limit]
    else:
        local = _load_local_doctors()
        raw = [d for d in local if d.get("specialty", "").lower() == specialty.lower()]
        raw.sort(key=lambda d: d.get("rating", 0), reverse=True)
        raw = raw[:limit]

    return DoctorSearchResponse(
        specialty=specialty,
        doctors=[_raw_to_profile(d) for d in raw],
        total_found=len(raw),
    )


@router.get("/specialties", response_model=List[str])
async def list_specialties() -> List[str]:
    """Return all unique specialties available in the database."""
    if aerospike_service.is_connected:
        all_docs = aerospike_service.get_all_doctors()
    else:
        all_docs = _load_local_doctors()

    specialties = sorted({d.get("specialty", "") for d in all_docs if d.get("specialty")})
    return specialties


@router.get("/{doctor_id}", response_model=DoctorProfile)
async def get_doctor(doctor_id: str) -> DoctorProfile:
    """Fetch a single doctor by ID."""
    if aerospike_service.is_connected:
        raw = aerospike_service.get_doctor_by_id(doctor_id)
    else:
        local = _load_local_doctors()
        raw = next((d for d in local if d.get("id") == doctor_id), None)

    if not raw:
        raise HTTPException(status_code=404, detail=f"Doctor {doctor_id!r} not found")

    return _raw_to_profile(raw)
