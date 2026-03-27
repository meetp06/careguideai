"""
AWS Bedrock Service
-------------------
Wraps the Bedrock Converse API for structured LLM calls.
Model: anthropic.claude-3-haiku-20240307-v1:0  (fast & cheap for extraction)

Falls back to a rule-based mock if AWS credentials are not configured so the
server stays fully functional during local development.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, Optional

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.config import settings

logger = logging.getLogger(__name__)


class BedrockService:
    def __init__(self) -> None:
        self._client = self._build_client()

    # ── Client bootstrap ──────────────────────────────────────────────────────

    def _build_client(self) -> Optional[Any]:
        if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY:
            logger.warning(
                "AWS credentials not configured — Bedrock disabled; using mock LLM."
            )
            return None
        try:
            return boto3.client(
                "bedrock-runtime",
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )
        except Exception as exc:
            logger.error("Failed to create Bedrock client: %s", exc)
            return None

    @property
    def is_available(self) -> bool:
        return self._client is not None

    # ── Core call ─────────────────────────────────────────────────────────────

    def invoke(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int = 1024,
        temperature: float = 0.1,
    ) -> Dict[str, Any]:
        """
        Call Bedrock Converse API and return:
          {"text": str, "input_tokens": int, "output_tokens": int}
        Raises RuntimeError on failure so callers can handle gracefully.
        """
        if not self._client:
            raise RuntimeError("Bedrock client unavailable")

        try:
            response = self._client.converse(
                modelId=settings.BEDROCK_MODEL_ID,
                system=[{"text": system_prompt}],
                messages=[
                    {"role": "user", "content": [{"text": user_message}]}
                ],
                inferenceConfig={
                    "maxTokens": max_tokens,
                    "temperature": temperature,
                },
            )
        except (BotoCoreError, ClientError) as exc:
            raise RuntimeError(f"Bedrock API error: {exc}") from exc

        output_text = (
            response["output"]["message"]["content"][0]["text"]
        )
        usage = response.get("usage", {})
        return {
            "text": output_text,
            "input_tokens": usage.get("inputTokens", 0),
            "output_tokens": usage.get("outputTokens", 0),
        }

    # ── JSON extraction helper ────────────────────────────────────────────────

    def invoke_json(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int = 1024,
        temperature: float = 0.1,
    ) -> Dict[str, Any]:
        """
        Like invoke(), but parses the response as JSON.
        Strips markdown code fences if present.
        """
        result = self.invoke(system_prompt, user_message, max_tokens, temperature)
        raw = result["text"].strip()
        # Strip ```json ... ``` wrappers
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()
        parsed = json.loads(raw)
        return {
            **parsed,
            "_tokens": {
                "input": result["input_tokens"],
                "output": result["output_tokens"],
            },
        }


# Module-level singleton
bedrock_service = BedrockService()
