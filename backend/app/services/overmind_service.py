"""
Overmind Service
----------------
Tracks agent performance metrics and sends them to the Overmind AI
observability platform.  All calls are fire-and-forget: failures are logged
but never allowed to break the request pipeline.

Dashboard: https://app.overmind.ai  (requires OVERMIND_API_KEY)

Metric schema sent per agent run:
{
  "project":    "care-compass-ai",
  "agent":      "symptom_extractor",
  "run_id":     "uuid4",
  "status":     "success" | "failure",
  "duration_ms": 342.1,
  "tokens":     {"input": 120, "output": 85},
  "metadata":   {...},
  "timestamp":  "2026-03-27T12:00:00Z"
}
"""

from __future__ import annotations

import json
import logging
import threading
import time
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Dict, Generator, Optional

import urllib.request
import urllib.error

from app.config import settings

logger = logging.getLogger(__name__)


class OvermindService:
    def __init__(self) -> None:
        self._enabled = bool(settings.OVERMIND_API_KEY)
        if not self._enabled:
            logger.info("Overmind API key not set — metrics will be logged locally only.")

    # ── Context manager for timing an agent run ───────────────────────────────

    @contextmanager
    def trace(
        self,
        agent_name: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Generator[Dict[str, Any], None, None]:
        """
        Usage::

            with overmind.trace("symptom_extractor") as ctx:
                result = do_work()
                ctx["tokens"] = {"input": 100, "output": 50}

        The context dict ``ctx`` can be updated inside the block with any
        extra keys you want forwarded to Overmind (e.g. token counts).
        """
        run_id = str(uuid.uuid4())
        ctx: Dict[str, Any] = {"run_id": run_id, "tokens": {}}
        start = time.perf_counter()
        error: Optional[str] = None
        try:
            yield ctx
        except Exception as exc:
            error = str(exc)
            raise
        finally:
            duration_ms = (time.perf_counter() - start) * 1000
            self._emit(
                agent_name=agent_name,
                run_id=run_id,
                status="failure" if error else "success",
                duration_ms=duration_ms,
                tokens=ctx.get("tokens", {}),
                metadata={**(metadata or {}), **{k: v for k, v in ctx.items() if k not in ("run_id", "tokens")}},
                error=error,
            )

    # ── Emit ──────────────────────────────────────────────────────────────────

    def _emit(
        self,
        agent_name: str,
        run_id: str,
        status: str,
        duration_ms: float,
        tokens: Dict[str, int],
        metadata: Dict[str, Any],
        error: Optional[str] = None,
    ) -> None:
        payload = {
            "project": settings.OVERMIND_PROJECT,
            "agent": agent_name,
            "run_id": run_id,
            "status": status,
            "duration_ms": round(duration_ms, 2),
            "tokens": tokens,
            "metadata": metadata,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        if error:
            payload["error"] = error

        # Always log locally for debugging
        logger.info(
            "[Overmind] agent=%s status=%s duration=%.1fms tokens=%s",
            agent_name, status, duration_ms, tokens,
        )

        if self._enabled:
            # Send async so we never block the request
            thread = threading.Thread(
                target=self._post,
                args=(payload,),
                daemon=True,
            )
            thread.start()

    def _post(self, payload: Dict[str, Any]) -> None:
        url = f"{settings.OVERMIND_BASE_URL}/metrics"
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {settings.OVERMIND_API_KEY}",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status not in (200, 201, 202, 204):
                    logger.warning("Overmind returned HTTP %d", resp.status)
        except (urllib.error.URLError, OSError) as exc:
            logger.warning("Overmind metrics delivery failed: %s", exc)


# Module-level singleton
overmind_service = OvermindService()
