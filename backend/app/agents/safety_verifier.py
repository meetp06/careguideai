"""
Agent 3 — Safety Verifier (Independent)
-----------------------------------------
Independently reviews the outputs of Agents 1 & 2 for safety.
Can ESCALATE urgency, add missed red-flag symptoms, and rewrite the summary.
This agent is intentionally independent — it does NOT see Agent 1's raw LLM
response, only its structured output, to avoid confirmation bias.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Tuple

from app.models import (
    AgentMetrics,
    DoctorProfile,
    Severity,
    SummaryData,
    SymptomRow,
    Urgency,
)
from app.services.bedrock_service import bedrock_service
from app.services.overmind_service import overmind_service

logger = logging.getLogger(__name__)

# ── Prompts ───────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an independent medical safety reviewer.
You will receive:
  1. A patient's voice transcript
  2. A list of structured symptoms extracted by another AI agent

Your job is to VERIFY and potentially ESCALATE this assessment for safety.

Return ONLY a valid JSON object:
{
  "verification_passed": true|false,
  "is_emergency": true|false,
  "escalated": true|false,
  "escalation_reason": "<why escalated, or null>",
  "missed_symptoms": ["<symptom>", ...],
  "summary": {
    "what_you_said": "<1-sentence paraphrase of transcript>",
    "may_indicate": "<what this may indicate — NOT a diagnosis>",
    "urgency_level": "Low|Medium|High|Emergency",
    "safety_note": "<key safety message for the patient>",
    "next_steps": ["<step 1>", "<step 2>", "<step 3>"]
  }
}

Rules:
- Set is_emergency=true if ANY of: chest pain + shortness of breath, stroke
  symptoms (sudden numbness/weakness/slurred speech), altered consciousness,
  severe allergic reaction, active seizure, uncontrolled bleeding.
- verification_passed=false only if the prior agent MISSED a critical emergency.
- Use cautious language ("may indicate", "could be related to").
- next_steps should be actionable (e.g. "Call 911 immediately", "See a doctor today").
- NEVER provide a definitive diagnosis.
"""


# ── Fallback (no LLM) ─────────────────────────────────────────────────────────

EMERGENCY_PAIRS = [
    ("chest", "breath"),
    ("stroke", "numb"),
    ("unconscious", ""),
    ("seizure", ""),
    ("anaphylaxis", ""),
]


def _rule_based_verify(
    transcript: str,
    symptoms: List[SymptomRow],
    agent1_emergency: bool,
) -> Dict[str, Any]:
    text = transcript.lower()

    # Escalate if emergency phrase pairs found
    rule_emergency = agent1_emergency
    for a, b in EMERGENCY_PAIRS:
        if a in text and (not b or b in text):
            rule_emergency = True
            break

    any_emergency_symptom = any(s.urgency == Urgency.EMERGENCY for s in symptoms)
    is_emergency = rule_emergency or any_emergency_symptom

    urgency_level = "Emergency" if is_emergency else (
        "High" if any(s.urgency == Urgency.HIGH for s in symptoms) else "Medium"
    )

    next_steps = (
        ["Call 911 or go to the nearest Emergency Room immediately"]
        if is_emergency
        else [
            "Schedule an appointment with your recommended specialist",
            "Monitor your symptoms and note any changes",
            "Contact your primary care doctor if symptoms worsen",
        ]
    )

    return {
        "verification_passed": True,
        "is_emergency": is_emergency,
        "escalated": is_emergency and not agent1_emergency,
        "escalation_reason": "Emergency pattern detected by safety rules" if (is_emergency and not agent1_emergency) else None,
        "missed_symptoms": [],
        "summary": {
            "what_you_said": f"Patient reported: {', '.join(s.symptom.lower() for s in symptoms[:3])}",
            "may_indicate": f"Possible {symptoms[0].possible_concern if symptoms else 'health concern'} — not a diagnosis",
            "urgency_level": urgency_level,
            "safety_note": (
                "⚠️ Seek emergency care immediately."
                if is_emergency
                else "These symptoms should be evaluated by a healthcare professional."
            ),
            "next_steps": next_steps,
        },
    }


# ── Main agent function ───────────────────────────────────────────────────────

def run(
    transcript: str,
    symptoms: List[SymptomRow],
    doctors: List[DoctorProfile],
    agent1_emergency: bool,
) -> Tuple[SummaryData, bool, bool, AgentMetrics]:
    """
    Returns (summary, is_emergency, verification_passed, metrics).
    """
    tokens_used = 0

    symptom_list_str = "\n".join(
        f"- {s.symptom} | severity={s.severity} | urgency={s.urgency} | concern={s.possible_concern}"
        for s in symptoms
    )
    user_msg = (
        f"TRANSCRIPT:\n{transcript}\n\n"
        f"EXTRACTED SYMPTOMS:\n{symptom_list_str or 'None extracted'}\n\n"
        f"AGENT 1 EMERGENCY FLAG: {agent1_emergency}"
    )

    with overmind_service.trace("safety_verifier", {"symptoms_count": len(symptoms)}) as ctx:
        if bedrock_service.is_available:
            try:
                raw = bedrock_service.invoke_json(
                    system_prompt=SYSTEM_PROMPT,
                    user_message=user_msg,
                    max_tokens=1024,
                    temperature=0.05,  # very low temp for safety-critical decisions
                )
                token_info = raw.pop("_tokens", {})
                tokens_used = token_info.get("input", 0) + token_info.get("output", 0)
                ctx["tokens"] = token_info
            except Exception as exc:
                logger.warning("Bedrock safety verification failed, using rules: %s", exc)
                raw = _rule_based_verify(transcript, symptoms, agent1_emergency)
        else:
            raw = _rule_based_verify(transcript, symptoms, agent1_emergency)

    if raw.get("escalated"):
        logger.warning(
            "Safety verifier ESCALATED to emergency. Reason: %s",
            raw.get("escalation_reason"),
        )

    s = raw.get("summary", {})
    summary = SummaryData(
        what_you_said=s.get("what_you_said", "You described your symptoms."),
        may_indicate=s.get("may_indicate", "A health concern that needs evaluation."),
        urgency_level=s.get("urgency_level", "Medium"),
        safety_note=s.get(
            "safety_note",
            "Always consult a qualified healthcare professional.",
        ),
        next_steps=s.get("next_steps", ["Schedule a doctor appointment"]),
    )

    metrics = AgentMetrics(
        agent_name="safety_verifier",
        duration_ms=0,
        success=True,
        tokens_used=tokens_used,
        metadata={
            "escalated": raw.get("escalated", False),
            "escalation_reason": raw.get("escalation_reason"),
            "missed_symptoms": raw.get("missed_symptoms", []),
        },
    )

    return (
        summary,
        bool(raw.get("is_emergency", agent1_emergency)),
        bool(raw.get("verification_passed", True)),
        metrics,
    )
