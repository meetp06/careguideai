"""
Airbyte Pipeline — Doctors JSON → Aerospike
============================================
Simulates (and optionally triggers) a real Airbyte sync:

  Source      : Local JSON file  (or Airbyte File Connector)
  Destination : Aerospike        (via custom destination connector)

Usage
-----
  # Dry run (print what would be loaded)
  python scripts/run_airbyte_pipeline.py --dry-run

  # Real run — loads JSON into Aerospike
  python scripts/run_airbyte_pipeline.py

  # Trigger a real Airbyte Cloud sync job (needs AIRBYTE_* env vars)
  python scripts/run_airbyte_pipeline.py --airbyte-cloud

Environment variables
---------------------
  AIRBYTE_API_KEY        — Airbyte Cloud API key
  AIRBYTE_WORKSPACE_ID   — Airbyte Cloud workspace ID
  AIRBYTE_CONNECTION_ID  — Connection ID to trigger  (optional; auto-discover)
  AEROSPIKE_HOST / PORT / NAMESPACE
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional

# Allow running from repo root: python scripts/...
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("airbyte_pipeline")

# ── Config ────────────────────────────────────────────────────────────────────

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "doctors.json")
AIRBYTE_BASE_URL = os.getenv("AIRBYTE_BASE_URL", "https://api.airbyte.com/v1")
AIRBYTE_API_KEY = os.getenv("AIRBYTE_API_KEY", "")
AIRBYTE_WORKSPACE_ID = os.getenv("AIRBYTE_WORKSPACE_ID", "")
AIRBYTE_CONNECTION_ID = os.getenv("AIRBYTE_CONNECTION_ID", "")


# ── Source: read local JSON ───────────────────────────────────────────────────

def extract(path: str) -> List[Dict[str, Any]]:
    """EXTRACT — read doctors from JSON source."""
    logger.info("[EXTRACT] Reading from %s", os.path.abspath(path))
    with open(path, "r") as f:
        records = json.load(f)
    logger.info("[EXTRACT] %d records loaded", len(records))
    return records


# ── Transform ─────────────────────────────────────────────────────────────────

def transform(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """TRANSFORM — normalise and validate each record."""
    cleaned: List[Dict[str, Any]] = []
    for r in records:
        if not r.get("id") or not r.get("name") or not r.get("specialty"):
            logger.warning("[TRANSFORM] Skipping invalid record: %s", r.get("id"))
            continue
        cleaned.append(
            {
                "id": str(r["id"]),
                "name": str(r["name"]),
                "specialty": str(r["specialty"]),
                "hospital": str(r.get("hospital", "")),
                "location": str(r.get("location", "")),
                "distance": str(r.get("distance", "N/A")),
                "rating": float(r.get("rating", 4.5)),
                "review_count": int(r.get("review_count", 0)),
                "availability": str(r.get("availability", "Call to schedule")),
                "phone": str(r.get("phone", "")),
                "image_url": str(r.get("image_url", "")),
                "accepts_new_patients": bool(r.get("accepts_new_patients", True)),
                "languages": r.get("languages", ["English"]),
                "board_certified": bool(r.get("board_certified", True)),
                "years_experience": int(r.get("years_experience", 0)),
            }
        )
    logger.info("[TRANSFORM] %d valid records after cleaning", len(cleaned))
    return cleaned


# ── Load: write to Aerospike ──────────────────────────────────────────────────

def load(records: List[Dict[str, Any]], dry_run: bool = False) -> Dict[str, int]:
    """LOAD — upsert records into Aerospike."""
    if dry_run:
        logger.info("[LOAD] DRY-RUN — would write %d records to Aerospike", len(records))
        for r in records[:3]:
            logger.info("  Sample: %s (%s)", r["name"], r["specialty"])
        return {"success": len(records), "failed": 0, "dry_run": True}

    # Import here so the script can run --dry-run without Aerospike installed
    try:
        import aerospike  # type: ignore
        from aerospike import exception as aex
    except ImportError:
        logger.error("[LOAD] aerospike-python-client not installed. Run: pip install aerospike")
        sys.exit(1)

    host = os.getenv("AEROSPIKE_HOST", "127.0.0.1")
    port = int(os.getenv("AEROSPIKE_PORT", "3000"))
    namespace = os.getenv("AEROSPIKE_NAMESPACE", "care_compass")
    set_name = "doctors"

    client = aerospike.client({"hosts": [(host, port)]}).connect()
    logger.info("[LOAD] Connected to Aerospike at %s:%d", host, port)

    # Create secondary index
    try:
        client.index_string_create(namespace, set_name, "specialty", "idx_specialty")
    except aex.IndexFoundError:
        pass

    success = failed = 0
    for r in records:
        key = (namespace, set_name, r["id"])
        try:
            client.put(key, r)
            success += 1
        except Exception as exc:
            logger.error("[LOAD] Failed to write %s: %s", r["id"], exc)
            failed += 1

    client.close()
    logger.info("[LOAD] Wrote %d records (%d failed)", success, failed)
    return {"success": success, "failed": failed}


# ── Airbyte Cloud trigger (optional) ─────────────────────────────────────────

def _airbyte_request(method: str, path: str, body: Optional[dict] = None) -> dict:
    url = f"{AIRBYTE_BASE_URL}{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {AIRBYTE_API_KEY}",
            "Content-Type": "application/json",
        },
        method=method,
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def trigger_airbyte_cloud_sync(connection_id: Optional[str] = None) -> None:
    """Trigger a real Airbyte Cloud sync job and poll until complete."""
    if not AIRBYTE_API_KEY:
        logger.error("[AIRBYTE] AIRBYTE_API_KEY not set")
        sys.exit(1)

    cid = connection_id or AIRBYTE_CONNECTION_ID
    if not cid:
        logger.info("[AIRBYTE] No connection ID — listing connections...")
        resp = _airbyte_request("GET", f"/connections?workspaceId={AIRBYTE_WORKSPACE_ID}")
        connections = resp.get("data", [])
        if not connections:
            logger.error("[AIRBYTE] No connections found in workspace %s", AIRBYTE_WORKSPACE_ID)
            sys.exit(1)
        cid = connections[0]["connectionId"]
        logger.info("[AIRBYTE] Using connection: %s (%s)", cid, connections[0].get("name"))

    logger.info("[AIRBYTE] Triggering sync for connection %s", cid)
    job = _airbyte_request("POST", "/jobs", {"connectionId": cid, "jobType": "sync"})
    job_id = job["jobId"]
    logger.info("[AIRBYTE] Sync job started: %s", job_id)

    # Poll until complete
    for _ in range(60):
        time.sleep(5)
        status_resp = _airbyte_request("GET", f"/jobs/{job_id}")
        status = status_resp.get("status", "running")
        logger.info("[AIRBYTE] Job %s status: %s", job_id, status)
        if status == "succeeded":
            logger.info("[AIRBYTE] Sync completed successfully!")
            return
        if status in ("failed", "cancelled"):
            logger.error("[AIRBYTE] Sync %s", status)
            sys.exit(1)

    logger.error("[AIRBYTE] Timed out waiting for sync job %s", job_id)
    sys.exit(1)


# ── CLI ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Airbyte-style ETL: doctors.json → Aerospike")
    parser.add_argument("--dry-run", action="store_true", help="Print what would be loaded")
    parser.add_argument("--airbyte-cloud", action="store_true", help="Trigger real Airbyte Cloud sync")
    parser.add_argument("--connection-id", help="Override Airbyte connection ID")
    args = parser.parse_args()

    if args.airbyte_cloud:
        trigger_airbyte_cloud_sync(args.connection_id)
        return

    logger.info("=" * 60)
    logger.info("CareCompass AI — Airbyte ETL Pipeline")
    logger.info("Source      : %s", os.path.abspath(DATA_PATH))
    logger.info("Destination : Aerospike care_compass.doctors")
    logger.info("=" * 60)

    records = extract(DATA_PATH)
    records = transform(records)
    result = load(records, dry_run=args.dry_run)

    logger.info("Pipeline complete: %s", result)


if __name__ == "__main__":
    main()
