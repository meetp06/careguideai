"""
CareCompass AI — FastAPI Backend
=================================
Endpoints
---------
POST /care-guide              Full agentic pipeline (transcript → result)
GET  /health                  Service health (Aerospike + Bedrock)
GET  /doctors/search          Search doctors by specialty
GET  /doctors/specialties     List available specialties
GET  /doctors/{doctor_id}     Fetch single doctor
GET  /docs                    Swagger UI (debug only)
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import care_guide, doctors

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)

app = FastAPI(
    title="CareCompass AI",
    description="Multi-agent medical navigation backend powered by AWS Bedrock + Aerospike.",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url=None,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(care_guide.router)
app.include_router(doctors.router)


@app.get("/", include_in_schema=False)
async def root():
    return {"service": "CareCompass AI", "version": "1.0.0", "status": "running"}
