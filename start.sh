#!/bin/bash

set -e

PORT="${PORT:-10000}"

echo "========================================="
echo "Starting Fibrion AI"
echo "========================================="
echo "Public port: ${PORT}"
echo "Backend port: 8000"
echo "Frontend port: ${PORT}"
echo "========================================="

# ---------------------------------------------------------
# Start FastAPI backend
# ---------------------------------------------------------

cd /app/backend

echo "Starting FastAPI..."

uvicorn main:app \
    --host 0.0.0.0 \
    --port 8000 &

BACKEND_PID=$!

# ---------------------------------------------------------
# Start Next.js frontend
# ---------------------------------------------------------

cd /app/frontend

echo "Starting Next.js..."

PORT="${PORT}" npm start &

FRONTEND_PID=$!

# ---------------------------------------------------------
# Shutdown handling
# ---------------------------------------------------------

cleanup() {
    echo "Shutting down Fibrion..."

    kill "$BACKEND_PID" 2>/dev/null || true
    kill "$FRONTEND_PID" 2>/dev/null || true

    wait "$BACKEND_PID" 2>/dev/null || true
    wait "$FRONTEND_PID" 2>/dev/null || true
}

trap cleanup SIGTERM SIGINT EXIT

# ---------------------------------------------------------
# Keep container alive while both services run
# ---------------------------------------------------------

while true; do

    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo "FastAPI process stopped."
        exit 1
    fi

    if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
        echo "Next.js process stopped."
        exit 1
    fi

    sleep 2

done