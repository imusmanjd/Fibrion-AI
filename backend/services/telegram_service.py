"""
backend/services/telegram_service.py

Synchronous wrapper around python-telegram-bot's async Bot API.

The Fibrion pipeline is synchronous, so this function runs the Telegram
coroutine using asyncio.run(). The Telegram bot handler executes the
Fibrion graph in a worker thread, preventing nested event-loop errors.
"""

import asyncio
from pathlib import Path
from typing import Optional

from telegram import Bot
from telegram.error import TelegramError

from core.config import settings
from core.logging_config import get_agent_logger

logger = get_agent_logger("telegram_service")


async def _send(
    chat_id: str,
    message: str,
    file_path: Optional[str],
) -> None:
    bot = Bot(token=settings.telegram_bot_token)

    async with bot:
        if file_path and Path(file_path).exists():
            with open(file_path, "rb") as f:
                await bot.send_document(
                    chat_id=chat_id,
                    document=f,
                    caption=message[:1024],
                )
        else:
            await bot.send_message(
                chat_id=chat_id,
                text=message,
            )


def send_telegram(
    chat_id: str,
    message: str,
    file_path: Optional[str] = None,
) -> dict:
    try:
        asyncio.run(
            _send(
                chat_id,
                message,
                file_path,
            )
        )

        logger.info(
            f"Telegram message sent to {chat_id}"
        )

        return {"status": "sent"}

    except TelegramError as exc:
        logger.error(
            f"Telegram send failed: {exc}"
        )

        return {
            "status": "failed",
            "error": str(exc),
        }

    except Exception as exc:
        logger.exception(
            f"Unexpected Telegram delivery error: {exc}"
        )

        return {
            "status": "failed",
            "error": str(exc),
        }