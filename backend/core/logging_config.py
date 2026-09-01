"""
Centralized logging for Fibrion.

Destinations:
- Console: development/prod output.
- logs/fibrion.log: all Fibrion logs.
- logs/verification.log: verification-agent logs only.

Every record is tagged with the current pipeline run_id.
Log files rotate at 10 MB and keep 5 backups.
"""

import json
import logging
import os
import sys
from contextvars import ContextVar
from datetime import datetime, timezone
from logging.handlers import RotatingFileHandler
from pathlib import Path

run_id_ctx: ContextVar[str] = ContextVar("run_id", default="-")


class RunIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.run_id = run_id_ctx.get()
        return True


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "run_id": getattr(record, "run_id", "-"),
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_logging() -> None:
    env = os.getenv("FIBRION_ENV", "development")
    level = os.getenv("LOG_LEVEL", "INFO").upper()

    log_dir = Path(__file__).resolve().parent.parent / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)

    run_filter = RunIdFilter()

    if env == "production":
        console_formatter = JsonFormatter()
        file_formatter = JsonFormatter()
    else:
        console_formatter = logging.Formatter(
            "%(asctime)s | %(levelname)-8s | %(name)-28s | "
            "run=%(run_id)s | %(message)s"
        )
        file_formatter = console_formatter

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.addFilter(run_filter)
    console_handler.setFormatter(console_formatter)

    fibrion_handler = RotatingFileHandler(
        log_dir / "fibrion.log",
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    fibrion_handler.setLevel(level)
    fibrion_handler.addFilter(run_filter)
    fibrion_handler.setFormatter(file_formatter)

    verification_handler = RotatingFileHandler(
        log_dir / "verification.log",
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    verification_handler.setLevel(logging.INFO)
    verification_handler.addFilter(run_filter)
    verification_handler.setFormatter(file_formatter)

    root = logging.getLogger("fibrion")
    root.setLevel(level)
    root.handlers.clear()
    root.addHandler(console_handler)
    root.addHandler(fibrion_handler)
    root.propagate = False

    verification_logger = logging.getLogger(
        "fibrion.agents.verification"
    )
    verification_logger.setLevel(level)
    verification_logger.handlers.clear()
    verification_logger.addHandler(verification_handler)
    verification_logger.propagate = True


def get_agent_logger(agent_name: str) -> logging.Logger:
    return logging.getLogger(f"fibrion.agents.{agent_name}")