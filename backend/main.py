"""
backend/main.py

FastAPI entrypoint. The Telegram bot runs as a separate process
(bot/telegram_bot.py), not through this app - python-telegram-bot
manages its own polling loop independently.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from api.upload import router as upload_router
from core.config import settings
from core.logging_config import configure_logging, get_agent_logger

configure_logging()
logger = get_agent_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Fibrion starting up (env={settings.fibrion_env})")
    yield
    logger.info("Fibrion shutting down")


app = FastAPI(title="Fibrion", lifespan=lifespan)
app.include_router(upload_router)


@app.get("/health")
def health():
    return {"status": "ok"}