"""
backend/api/upload.py

Accepts a file upload plus delivery preferences, runs the full graph
synchronously, returns the result. No job queue yet - a request waits
for the pipeline to finish, the phase-1 decision made early in this
build; revisit once concurrency actually matters.
"""

import shutil
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Form, UploadFile
from pydantic import BaseModel

from core.logging_config import get_agent_logger
from orchestration.graph import fibrion_graph
from orchestration.state import FibrionState

logger = get_agent_logger("api.upload")
router = APIRouter()
UPLOAD_DIR = Path("outputs/tmp/uploads")


class UploadResponse(BaseModel):
    run_id: str
    error: Optional[dict] = None
    verification_passed: Optional[bool] = None
    report_path: Optional[str] = None
    delivery_status: dict = {}


@router.post("/upload", response_model=UploadResponse)
async def upload_production_file(
    file: UploadFile,
    process_type: str = Form("weaving"),
    delivery_channels: str = Form("telegram"),
    telegram_chat_id: Optional[str] = Form(None),
    recipient_email: Optional[str] = Form(None),
    data_dictionary: Optional[str] = Form(None),
):
    run_id = str(uuid.uuid4())
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    saved_path = UPLOAD_DIR / f"{run_id}_{file.filename}"
    with open(saved_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    channels = [c.strip() for c in delivery_channels.split(",") if c.strip()]
    initial_state = FibrionState(
        run_id=run_id, file_path=str(saved_path), process_type=process_type,
        delivery_channels=channels, telegram_chat_id=telegram_chat_id,
        recipient_email=recipient_email, data_dictionary=data_dictionary,
    )

    logger.info(f"Starting pipeline run {run_id} for {file.filename}")
    result = fibrion_graph.invoke(initial_state)

    return UploadResponse(
        run_id=run_id, error=result.get("error"),
        verification_passed=result.get("verification_passed"),
        report_path=result.get("report_path"),
        delivery_status=result.get("delivery_status", {}),
    )