"""
backend/services/email_service.py

Gmail SMTP with an app password - same approach as your earlier
Telegram/WhatsApp bot projects.
"""

import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Optional

from core.config import settings
from core.logging_config import get_agent_logger

logger = get_agent_logger("email_service")


def send_email(to_address: str, subject: str, message: str, file_path: Optional[str] = None) -> dict:
    try:
        msg = MIMEMultipart()
        msg["From"] = settings.email_address
        msg["To"] = to_address
        msg["Subject"] = subject
        msg.attach(MIMEText(message, "plain"))

        if file_path and Path(file_path).exists():
            with open(file_path, "rb") as f:
                part = MIMEApplication(f.read(), Name=Path(file_path).name)
            part["Content-Disposition"] = f'attachment; filename="{Path(file_path).name}"'
            msg.attach(part)

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.email_address, settings.email_app_password)
            server.send_message(msg)

        logger.info(f"Email sent to {to_address}")
        return {"status": "sent"}
    except Exception as e:
        logger.error(f"Email send failed: {e}")
        return {"status": "failed", "error": str(e)}