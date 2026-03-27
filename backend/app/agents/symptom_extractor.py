"""
Agent 1 — Symptom Extractor
----------------------------
Receives the raw voice transcript and uses AWS Bedrock (Claude Haiku) to
extract structured symptom data.  Falls back to a keyword-based heuristic
when Bedrock is unavailable.
"""

from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Tuple

from app.models import AgentMetrics, Severity, SymptomRow, Urgency
from app.services.bedrock_service import bedrock_service
from app.services.overmind_service import overmind_service

logger = logging.getLogger(__name__)

# ── Prompts ───────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a medical intake assistant. Extract structured
symptom information from a patient's spoken transcript.

Return ONLY a valid JSON object with this exact shape:
{
  "symptoms": [
    {
      "symptom": "<symptom name>",
      "duration": "<how long, e.g. '2 days'>",
      "severity": "Mild|Moderate|Severe",
      "urgency": "Low|Medium|High|Emergency",
      "possible_concern": "<brief possible condition, NOT a diagnosis>",
      "recommended_specialist": "<e.g. Cardiologist, Primary Care>",
      "next_step": "<action the patient should take>"
    }
  ],
  "is_emergency": true|false,
  "primary_specialty": "<most urgent specialty needed>"
}

Rules:
- severity "Severe" or urgency "Emergency" if ANY life-threatening keywords
  are present: chest pain radiating, difficulty breathing, stroke symptoms,
  loss of consciousness, severe bleeding, anaphylaxis.
- Use cautious language: say "possible concern" not "you have".
- Extract up to 5 symptoms.
- If no symptoms found, return {"symptoms": [], "is_emergency": false, "primary_specialty": "Primary Care"}
"""

# ── Keyword-based fallback (no LLM) ──────────────────────────────────────────

EMERGENCY_KEYWORDS = [
    "chest pain", "can't breathe", "difficulty breathing", "stroke",
    "unconscious", "severe bleeding", "heart attack", "anaphylaxis",
    "seizure", "not breathing", "choking",
]

SPECIALTY_MAP = {
    "heart": "Cardiology", "chest pain": "Cardiology", "palpitations": "Cardiology",
    "headache": "Neurology", "dizziness": "Neurology", "numbness": "Neurology",
    "nausea": "Gastroenterology", "vomiting": "Gastroenterology", "stomach": "Gastroenterology",
    "cough": "Pulmonology", "breathing": "Pulmonology", "shortness": "Pulmonology",
    "joint": "Orthopedics", "knee": "Orthopedics", "back pain": "Orthopedics",
    "rash": "Dermatology", "skin": "Dermatology",
    "fever": "Primary Care", "fatigue": "Primary Care", "cold": "Primary Care",
    "anxiety": "Psychiatry", "depression": "Psychiatry", "sleep": "Psychiatry",
    "diabetes": "Endocrinology", "thyroid": "Endocrinology",
}


def _keyword_fallback(transcript: str) -> Dict[str, Any]:
    text = transcript.lower()
    is_emergency = any(kw in text for kw in EMERGENCY_KEYWORDS)

    # Pick specialist by first keyword match
    specialist = "Primary Care"
    for kw, spec in SPECIALTY_MAP.items():
        if kw in text:
            specialist = spec
            break

    urgency = "Emergency" if is_emergency else "Medium"
    severity = "Severe" if is_emergency else "Moderate"

    # Extract rough symptom tokens (words before "and", "with", etc.)
    words = re.findall(r"\b(?:pain|ache|nausea|cough|fever|rash|fatigue|dizziness|headache|vomiting|bleeding|swelling|shortness)\b", text)
    symptoms = []
    for w in words[:3]:
        symptoms.append({
            "symptom": w.capitalize(),
            "duration": "Unknown",
            "severity": severity,
            "urgency": urgency,
            "possible_concern": f"Possible {specialist} concern",
            "recommended_specialist": specialist,
            "next_step": "Consult a healthcare provider promptly" if urgency != "Emergency" else "Call 911 immediately",
        })

    if not symptoms:
        symptoms.append({
            "symptom": "Reported symptoms",
            "duration": "Unknown",
            "severity": "Moderate",
            "urgency": "Medium",
            "possible_concern": "General health concern",
            "recommended_specialist": specialist,
            "next_step": "Schedule an appointment with your doctor",
        })

    return {
        "symptoms": symptoms,
        "is_emergency": is_emergency,
        "primary_specialty": specialist,
    }


# ── Main agent function ───────────────────────────────────────────────────────

def run(transcript: str) -> Tuple[List[SymptomRow], bool, str, AgentMetrics]:
    """
    Returns (symptom_rows, is_emergency, primary_specialty, metrics).
    """
    tokens_used = 0

    with overmind_service.trace("symptom_extractor", {"transcript_len": len(transcript)}) as ctx:
        if bedrock_service.is_available:
            try:
                raw = bedrock_service.invoke_json(
                    system_prompt=SYSTEM_PROMPT,
                    user_message=f"Patient transcript:\n{transcript}",
                    max_tokens=1024,
                    temperature=0.1,
                )
                token_info = raw.pop("_tokens", {})
                tokens_used = token_info.get("input", 0) + token_info.get("output", 0)
                ctx["tokens"] = token_info
            except Exception as exc:
                logger.warning("Bedrock extraction failed, using fallback: %s", exc)
                raw = _keyword_fallback(transcript)
        else:
            raw = _keyword_fallback(transcript)

    symptom_rows: List[SymptomRow] = []
    for s in raw.get("symptoms", []):
        try:
            symptom_rows.append(
                SymptomRow(
                    symptom=s["symptom"],
                    duration=s.get("duration", "Unknown"),
                    severity=Severity(s.get("severity", "Moderate")),
                    urgency=Urgency(s.get("urgency", "Medium")),
                    possible_concern=s.get("possible_concern", ""),
                    recommended_specialist=s.get("recommended_specialist", "Primary Care"),
                    next_step=s.get("next_step", "Consult a healthcare provider"),
                )
            )
        except Exception as exc:
            logger.warning("Skipping malformed symptom record: %s", exc)

    metrics = AgentMetrics(
        agent_name="symptom_extractor",
        duration_ms=0,  # filled by caller via timing
        success=True,
        tokens_used=tokens_used,
    )

    return (
        symptom_rows,
        bool(raw.get("is_emergency", False)),
        raw.get("primary_specialty", "Primary Care"),
        metrics,
    )
