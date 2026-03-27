FROM python:3.11-slim

WORKDIR /app

# System deps needed by aerospike-python-client
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY app/     ./app/
COPY data/    ./data/
COPY scripts/ ./scripts/

# Non-root user for security
RUN adduser --disabled-password --gecos "" appuser
USER appuser

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APP_HOST=0.0.0.0 \
    APP_PORT=8000

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host $APP_HOST --port $APP_PORT"]
