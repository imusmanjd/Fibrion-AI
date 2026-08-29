"""
backend/bot/telegram_bot.py

Telegram entrypoint into the same Fibrion graph used by the API.
Receives CSV/Excel documents, asks for the delivery channel, then
runs the synchronous Fibrion graph in a worker thread so it does not
block python-telegram-bot's asyncio event loop.
"""

import asyncio
import uuid
from pathlib import Path

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from core.config import settings
from core.logging_config import get_agent_logger
from orchestration.graph import fibrion_graph
from orchestration.state import FibrionState

logger = get_agent_logger("telegram_bot")

UPLOAD_DIR = Path("outputs/tmp/uploads")

# Per-chat pending upload.
_pending_uploads: dict[int, str] = {}


async def handle_document(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
):
    if not update.message or not update.message.document:
        return

    chat_id = update.effective_chat.id
    doc = update.message.document

    # Fibrion currently supports data files only.
    filename = doc.file_name or "uploaded_file"
    suffix = Path(filename).suffix.lower()

    allowed = {".csv", ".xlsx", ".xls"}

    if suffix not in allowed:
        await update.message.reply_text(
            f"❌ Unsupported file type: {suffix or 'unknown'}\n\n"
            "Please send a CSV, XLSX, or XLS file."
        )
        return

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    file_path = UPLOAD_DIR / f"{uuid.uuid4()}_{filename}"

    try:
        tg_file = await context.bot.get_file(doc.file_id)
        await tg_file.download_to_drive(str(file_path))

        _pending_uploads[chat_id] = str(file_path)

        keyboard = InlineKeyboardMarkup(
            [
                [
                    InlineKeyboardButton(
                        "📱 Telegram",
                        callback_data="deliver:telegram",
                    )
                ]
            ]
        )

        await update.message.reply_text(
            f"✅ Received: {filename}\n\n"
            "Choose where you want the finished report delivered:",
            reply_markup=keyboard,
        )

        logger.info(
            f"Uploaded {filename} for chat {chat_id}: {file_path}"
        )

    except Exception as exc:
        logger.exception("Telegram upload failed")

        if file_path.exists():
            file_path.unlink(missing_ok=True)

        await update.message.reply_text(
            f"❌ Could not download the file.\n\n{exc}"
        )


async def handle_channel_choice(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
):
    query = update.callback_query

    if not query:
        return

    await query.answer()

    chat_id = query.message.chat_id
    file_path = _pending_uploads.pop(chat_id, None)

    if not file_path:
        await query.edit_message_text(
            "⚠️ That upload expired. Please send the file again."
        )
        return

    await query.edit_message_text(
        "⏳ Processing your file...\n\n"
        "This may take a minute. You can leave this chat open."
    )

    state = FibrionState(
        run_id=str(uuid.uuid4()),
        file_path=file_path,
        delivery_channels=["telegram"],
        telegram_chat_id=str(chat_id),
    )

    logger.info(
        f"Bot-triggered run {state.run_id} for chat {chat_id}"
    )

    try:
        # IMPORTANT:
        # fibrion_graph.invoke() is synchronous.
        # Run it in a worker thread so it does not block
        # python-telegram-bot's asyncio event loop.
        await asyncio.to_thread(
            fibrion_graph.invoke,
            state,
        )

        logger.info(
            f"Bot-triggered run {state.run_id} completed"
        )

    except Exception as exc:
        logger.exception(
            f"Bot-triggered run {state.run_id} failed"
        )

        # Notification may already have attempted delivery.
        # This message is only for unexpected graph-level failures.
        try:
            await context.bot.send_message(
                chat_id=chat_id,
                text=(
                    "❌ Fibrion encountered an unexpected error.\n\n"
                    f"{type(exc).__name__}: {exc}"
                ),
            )
        except Exception:
            logger.exception(
                "Could not send graph failure message to Telegram"
            )


def run_bot():
    app = (
        Application.builder()
        .token(settings.telegram_bot_token)
        .build()
    )

    app.add_handler(
        MessageHandler(
            filters.Document.ALL,
            handle_document,
        )
    )

    app.add_handler(
        CallbackQueryHandler(
            handle_channel_choice,
            pattern=r"^deliver:",
        )
    )

    logger.info("Fibrion Telegram bot starting (polling)")

    app.run_polling()


if __name__ == "__main__":
    run_bot()