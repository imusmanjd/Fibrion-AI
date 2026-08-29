"""
backend/main.py

FastAPI entrypoint for the Fibrion web application.

The Telegram bot remains a separate process.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.runs import router as runs_router
from api.upload import router as upload_router
from core.config import settings
from core.logging_config import configure_logging, get_agent_logger


configure_logging()

logger = get_agent_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "Fibrion starting up (env=%s)",
        settings.fibrion_env,
    )

    yield

    logger.info("Fibrion shutting down")


app = FastAPI(
    title="Fibrion AI",
    description="Industrial AI analytics platform",
    version="1.0.0",
    lifespan=lifespan,
)


# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------
#
# Next.js normally runs on localhost:3000 while FastAPI
# runs on localhost:8000 during development.
#
# These origins allow the browser to call the API.
#
# We can later move these into configuration/environment
# variables for production deployment.
#
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# API routes
# ---------------------------------------------------------

app.include_router(upload_router)
app.include_router(runs_router)


# ---------------------------------------------------------
# Health check
# ---------------------------------------------------------

@app.get("/health", tags=["system"])
def health():
    return {
        "status": "ok",
        "service": "fibrion-api",
    }