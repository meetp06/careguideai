"""
Seed Aerospike
--------------
Loads doctors.json into Aerospike and verifies the data.
Run once after spinning up Aerospike for the first time.

  python scripts/seed_aerospike.py
  python scripts/seed_aerospike.py --verify
  python scripts/seed_aerospike.py --specialty Cardiology
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed")

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "doctors.json")


def seed(verify: bool = False, test_specialty: str = "Cardiology") -> None:
    try:
        import aerospike
        from aerospike import exception as aex
    except ImportError:
        logger.error("aerospike package not installed. Run: pip install aerospike==11.0.0")
        sys.exit(1)

    host = os.getenv("AEROSPIKE_HOST", "127.0.0.1")
    port = int(os.getenv("AEROSPIKE_PORT", "3000"))
    namespace = os.getenv("AEROSPIKE_NAMESPACE", "care_compass")
    set_name = "doctors"

    logger.info("Connecting to Aerospike at %s:%d", host, port)
    client = aerospike.client({"hosts": [(host, port)]}).connect()
    logger.info("Connected.")

    # Create secondary index on specialty
    try:
        client.index_string_create(namespace, set_name, "specialty", "idx_specialty")
        logger.info("Created secondary index: idx_specialty")
    except aex.IndexFoundError:
        logger.info("Secondary index idx_specialty already exists.")

    # Load and seed
    with open(DATA_PATH, "r") as f:
        doctors = json.load(f)

    logger.info("Seeding %d doctors...", len(doctors))
    success = failed = 0
    for doc in doctors:
        key = (namespace, set_name, doc["id"])
        try:
            client.put(key, doc)
            logger.info("  ✓ %s (%s)", doc["name"], doc["specialty"])
            success += 1
        except Exception as exc:
            logger.error("  ✗ %s: %s", doc.get("id"), exc)
            failed += 1

    logger.info("\nSeeding complete: %d inserted, %d failed", success, failed)

    if verify:
        logger.info("\nVerification — querying specialty: %s", test_specialty)
        query = client.query(namespace, set_name)
        try:
            query.where(aerospike.predicates.equals("specialty", test_specialty))
            results = query.results()
        except aex.IndexNotFound:
            scan = client.scan(namespace, set_name)
            results = [
                (k, m, b) for k, m, b in scan.results()
                if b.get("specialty", "").lower() == test_specialty.lower()
            ]

        doctors_found = [bins for _, _, bins in results]
        doctors_found.sort(key=lambda d: d.get("rating", 0), reverse=True)

        logger.info("Found %d doctor(s) for '%s':", len(doctors_found), test_specialty)
        for d in doctors_found[:3]:
            logger.info(
                "  • %s | %s | Rating: %.1f | %s",
                d.get("name"), d.get("hospital"), d.get("rating", 0), d.get("availability"),
            )

    client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed Aerospike with mock doctor data")
    parser.add_argument("--verify", action="store_true", help="Query back after seeding")
    parser.add_argument("--specialty", default="Cardiology", help="Specialty to test in verification")
    args = parser.parse_args()
    seed(verify=args.verify, test_specialty=args.specialty)
