import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # ── Aerospike ─────────────────────────────────────────────────────────────
    AEROSPIKE_HOST: str = os.getenv("AEROSPIKE_HOST", "127.0.0.1")
    AEROSPIKE_PORT: int = int(os.getenv("AEROSPIKE_PORT", "3000"))
    AEROSPIKE_NAMESPACE: str = os.getenv("AEROSPIKE_NAMESPACE", "care_compass")
    AEROSPIKE_SET: str = "doctors"

    # ── AWS Bedrock ───────────────────────────────────────────────────────────
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    # Claude Haiku on Bedrock — fast, cheap, accurate enough for extraction
    BEDROCK_MODEL_ID: str = os.getenv(
        "BEDROCK_MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0"
    )

    # ── Overmind ──────────────────────────────────────────────────────────────
    OVERMIND_API_KEY: str = os.getenv("OVERMIND_API_KEY", "")
    OVERMIND_PROJECT: str = os.getenv("OVERMIND_PROJECT", "care-compass-ai")
    OVERMIND_BASE_URL: str = os.getenv(
        "OVERMIND_BASE_URL", "https://api.overmind.ai/v1"
    )

    # ── Airbyte ───────────────────────────────────────────────────────────────
    AIRBYTE_API_KEY: str = os.getenv("AIRBYTE_API_KEY", "")
    AIRBYTE_WORKSPACE_ID: str = os.getenv("AIRBYTE_WORKSPACE_ID", "")
    AIRBYTE_BASE_URL: str = os.getenv(
        "AIRBYTE_BASE_URL", "https://api.airbyte.com/v1"
    )

    # ── App ───────────────────────────────────────────────────────────────────
    APP_HOST: str = os.getenv("APP_HOST", "0.0.0.0")
    APP_PORT: int = int(os.getenv("APP_PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    CORS_ORIGINS: list = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:8080,http://localhost:3000,https://care-compass-ai.lovable.app",
    ).split(",")

    # Path to local doctor JSON (used by Airbyte pipeline as source)
    DOCTORS_JSON_PATH: str = os.path.join(
        os.path.dirname(__file__), "..", "data", "doctors.json"
    )


settings = Settings()
