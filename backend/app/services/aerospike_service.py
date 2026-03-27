"""
Aerospike Service
-----------------
Wraps all Aerospike reads/writes for the care-compass-ai backend.

Namespace : care_compass
Set       : doctors

Secondary Index (create once via aql or seed script):
  CREATE INDEX idx_specialty ON care_compass.doctors (specialty) STRING
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import aerospike
from aerospike import exception as aex

from app.config import settings

logger = logging.getLogger(__name__)


class AerospikeService:
    def __init__(self) -> None:
        self._client: Optional[aerospike.Client] = None
        self._connect()

    # ── Connection ────────────────────────────────────────────────────────────

    def _connect(self) -> None:
        config = {
            "hosts": [(settings.AEROSPIKE_HOST, settings.AEROSPIKE_PORT)],
            "policies": {
                "read": {"total_timeout": 2000},
                "write": {"total_timeout": 2000},
            },
        }
        try:
            self._client = aerospike.client(config).connect()
            logger.info(
                "Aerospike connected at %s:%d",
                settings.AEROSPIKE_HOST,
                settings.AEROSPIKE_PORT,
            )
            self._ensure_index()
        except aex.ClientError as exc:
            logger.warning("Aerospike unavailable — running in fallback mode. %s", exc)
            self._client = None

    @property
    def is_connected(self) -> bool:
        return self._client is not None

    # ── Index bootstrap ───────────────────────────────────────────────────────

    def _ensure_index(self) -> None:
        """Create secondary index on specialty if it does not already exist."""
        if not self._client:
            return
        try:
            self._client.index_string_create(
                settings.AEROSPIKE_NAMESPACE,
                settings.AEROSPIKE_SET,
                "specialty",
                "idx_specialty",
            )
            logger.info("Secondary index idx_specialty ensured.")
        except aex.IndexFoundError:
            pass  # already exists
        except Exception as exc:
            logger.warning("Could not create secondary index: %s", exc)

    # ── Write ─────────────────────────────────────────────────────────────────

    def upsert_doctor(self, doctor: Dict[str, Any]) -> bool:
        """Insert or update a doctor record keyed by doctor['id']."""
        if not self._client:
            return False
        key = (settings.AEROSPIKE_NAMESPACE, settings.AEROSPIKE_SET, doctor["id"])
        try:
            self._client.put(key, doctor)
            return True
        except Exception as exc:
            logger.error("Failed to upsert doctor %s: %s", doctor.get("id"), exc)
            return False

    def bulk_upsert(self, doctors: List[Dict[str, Any]]) -> Dict[str, int]:
        """Bulk upsert; returns {"success": N, "failed": M}."""
        success, failed = 0, 0
        for doc in doctors:
            if self.upsert_doctor(doc):
                success += 1
            else:
                failed += 1
        return {"success": success, "failed": failed}

    # ── Read ──────────────────────────────────────────────────────────────────

    def get_doctors_by_specialty(
        self, specialty: str, limit: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Query doctors by specialty using the secondary index.
        Falls back to a scan + Python-side filter if the index isn't available.
        Returns top `limit` doctors sorted by rating (desc).
        """
        if not self._client:
            logger.warning("Aerospike not connected; returning []")
            return []

        try:
            query = self._client.query(
                settings.AEROSPIKE_NAMESPACE, settings.AEROSPIKE_SET
            )
            query.where(aerospike.predicates.equals("specialty", specialty))
            records = query.results()
        except aex.IndexNotFound:
            # Fall back to full scan + filter
            logger.warning("Secondary index missing; falling back to scan+filter")
            records = self._scan_filter_specialty(specialty)
        except Exception as exc:
            logger.error("Aerospike query error: %s", exc)
            return []

        doctors: List[Dict[str, Any]] = []
        for _key, _meta, bins in records:
            doctors.append(bins)

        doctors.sort(key=lambda d: d.get("rating", 0), reverse=True)
        return doctors[:limit]

    def _scan_filter_specialty(self, specialty: str) -> list:
        """Full-scan fallback (used when index is absent)."""
        if not self._client:
            return []
        try:
            scan = self._client.scan(
                settings.AEROSPIKE_NAMESPACE, settings.AEROSPIKE_SET
            )
            all_records = scan.results()
            return [
                (k, m, b)
                for k, m, b in all_records
                if b.get("specialty", "").lower() == specialty.lower()
            ]
        except Exception as exc:
            logger.error("Aerospike scan error: %s", exc)
            return []

    def get_all_doctors(self) -> List[Dict[str, Any]]:
        """Return every doctor record (used for admin/debug)."""
        if not self._client:
            return []
        try:
            scan = self._client.scan(
                settings.AEROSPIKE_NAMESPACE, settings.AEROSPIKE_SET
            )
            return [bins for _k, _m, bins in scan.results()]
        except Exception as exc:
            logger.error("Aerospike scan error: %s", exc)
            return []

    def get_doctor_by_id(self, doctor_id: str) -> Optional[Dict[str, Any]]:
        if not self._client:
            return None
        key = (settings.AEROSPIKE_NAMESPACE, settings.AEROSPIKE_SET, doctor_id)
        try:
            _key, _meta, bins = self._client.get(key)
            return bins
        except aex.RecordNotFound:
            return None
        except Exception as exc:
            logger.error("Aerospike get error: %s", exc)
            return None

    # ── Health ────────────────────────────────────────────────────────────────

    def health(self) -> Dict[str, Any]:
        if not self._client:
            return {"status": "disconnected"}
        try:
            info = self._client.info_all("statistics")
            return {"status": "connected", "nodes": len(info)}
        except Exception as exc:
            return {"status": "error", "detail": str(exc)}


# Module-level singleton
aerospike_service = AerospikeService()
