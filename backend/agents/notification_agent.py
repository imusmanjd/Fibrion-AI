"""
backend/agents/notification_agent.py

Sends the finished report - or a clear error message, if the run
failed - to whichever channel(s) were selected for this specific
request. Never a hardcoded "send everywhere." Pure code, no LLM.
"""

from core.logging_config import get_agent_logger, run_id_ctx
from orchestration.state import FibrionState
from services.email_service import send_email
from services.telegram_service import send_telegram

logger = get_agent_logger("notification")


def _build_message(state: FibrionState) -> str:
    if state.error:
        return (
            f"Fibrion could not complete this report.\n\n"
            f"Error: {state.error.get('type', 'unknown')}\n"
            f"Details: {state.error.get('detail', state.error)}"
        )
    overall = state.kpi_results.get("overall", {}) if state.kpi_results else {}
    return (
        f"Fibrion production report ready.\n\n"
        f"Fulfillment: {overall.get('overall_fulfillment_pct', '?')}%\n"
        f"Rejection: {overall.get('overall_rejection_pct', '?')}%\n"
        f"Shrink variance: {overall.get('avg_shrink_variance_pct', '?')}%\n\n"
        f"Full report attached."
    )


def run_notification(state: FibrionState) -> dict:
    run_id_ctx.set(state.run_id)
    message = _build_message(state)
    file_path = state.report_path if not state.error and state.report_path else None
    delivery_status = {}

    for channel in state.delivery_channels:
        if channel == "telegram":
            if not state.telegram_chat_id:
                delivery_status["telegram"] = "skipped - no chat_id"
                continue
            delivery_status["telegram"] = send_telegram(state.telegram_chat_id, message, file_path)["status"]
        elif channel == "email":
            if not state.recipient_email:
                delivery_status["email"] = "skipped - no recipient_email"
                continue
            subject = "Fibrion Production Report - Error" if state.error else "Fibrion Production Report"
            delivery_status["email"] = send_email(state.recipient_email, subject, message, file_path)["status"]
        elif channel == "whatsapp":
            delivery_status["whatsapp"] = "not yet implemented"
            logger.warning("WhatsApp delivery requested but not yet built")

    logger.info(f"Notification complete: {delivery_status}")
    return {"delivery_status": delivery_status}