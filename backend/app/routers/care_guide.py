"""
Care Guide Router
-----------------
POST /care-guide   — Full 3-agent pipeline (transcript → result)
GET  /health       — Health check (Aerospike + Bedrock status)
"""

from __future__ import annotations

import logging
import time

from fastapi import APIRouter, HTTPException

from app.agents import doctor_matcher, safety_verifier, symptom_extractor
from app.models import AgentMetrics, CareGuideRequest, CareGuideResult
from app.services.aerospike_service import aerospike_service
from app.services.bedrock_service import bedrock_service

router = APIRouter(tags=["care-guide"])
logger = logging.getLogger(__name__)


@router.post("/care-guide", response_model=CareGuideResult)
async def run_care_guide(body: CareGuideRequest) -> CareGuideResult:
    """
    Full agentic pipeline:
      Agent 1 — Symptom extraction (Bedrock / keyword fallback)
      Agent 2 — Doctor matching   (Aerospike / JSON fallback)
      Agent 3 — Safety verification (independent Bedrock / rule fallback)

    All agent metrics are returned for observability.
    """
    all_metrics: list[AgentMetrics] = []

    # ── Agent 1: Symptom extraction ───────────────────────────────────────────
    t0 = time.perf_counter()
    try:
        symptoms, is_emergency_1, primary_specialty, m1 = symptom_extractor.run(
            body.transcript
        )
    except Exception as exc:
        logger.error("Symptom extractor crashed: %s", exc)
        raise HTTPException(status_code=500, detail="Symptom extraction failed")
    m1.duration_ms = (time.perf_counter() - t0) * 1000
    all_metrics.append(m1)

    # ── Agent 2: Doctor matching ──────────────────────────────────────────────
    t1 = time.perf_counter()
    try:
        doctors, m2 = doctor_matcher.run(primary_specialty, limit=3)
    except Exception as exc:
        logger.error("Doctor matcher crashed: %s", exc)
        raise HTTPException(status_code=500, detail="Doctor matching failed")
    m2.duration_ms = (time.perf_counter() - t1) * 1000
    all_metrics.append(m2)

    # ── Agent 3: Safety verification ──────────────────────────────────────────
    t2 = time.perf_counter()
    try:
        summary, is_emergency_final, verification_passed, m3 = safety_verifier.run(
            transcript=body.transcript,
            symptoms=symptoms,
            doctors=doctors,
            agent1_emergency=is_emergency_1,
        )
    except Exception as exc:
        logger.error("Safety verifier crashed: %s", exc)
        raise HTTPException(status_code=500, detail="Safety verification failed")
    m3.duration_ms = (time.perf_counter() - t2) * 1000
    all_metrics.append(m3)

    total_ms = sum(m.duration_ms for m in all_metrics)
    logger.info(
        "Pipeline complete: specialty=%s emergency=%s verified=%s total_ms=%.1f",
        primary_specialty,
        is_emergency_final,
        verification_passed,
        total_ms,
    )

    return CareGuideResult(
        summary=summary,
        symptoms=symptoms,
        doctors=doctors,
        is_emergency=is_emergency_final,
        verification_passed=verification_passed,
        agent_metrics=all_metrics,
    )


@router.get("/health")
async def health_check() -> dict:
    return {
        "status": "ok",
        "aerospike": aerospike_service.health(),
        "bedrock": {
            "available": bedrock_service.is_available,
            "model": bedrock_service._client and "anthropic.claude-3-haiku-20240307-v1:0",
        },
    }
