FROM node:20-bookworm-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

# ---------------------------------------------------------
# System dependencies
# ---------------------------------------------------------

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-venv \
    python3-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------
# Python environment
# ---------------------------------------------------------

RUN python3 -m venv /opt/venv

ENV PATH="/opt/venv/bin:$PATH"

COPY backend/requirements.txt /app/backend/requirements.txt

RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r /app/backend/requirements.txt

# ---------------------------------------------------------
# Frontend dependencies
# ---------------------------------------------------------

COPY frontend/package.json frontend/package-lock.json /app/frontend/

WORKDIR /app/frontend

RUN npm ci

# ---------------------------------------------------------
# Frontend source + production build
# ---------------------------------------------------------

COPY frontend/ /app/frontend/

RUN npm run build

# ---------------------------------------------------------
# Backend source
# ---------------------------------------------------------

COPY backend/ /app/backend/

# ---------------------------------------------------------
# Startup script
# ---------------------------------------------------------

COPY start.sh /app/start.sh

RUN chmod +x /app/start.sh

WORKDIR /app

EXPOSE 10000

CMD ["/bin/bash", "/app/start.sh"]