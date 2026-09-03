"""
backend/api/upload.py

Frontend-facing upload endpoint.

The API accepts a production dataset, creates a Fibrion run, starts
the existing LangGraph pipeline in a background thread, and immediately
returns the run_id.

The frontend can then poll /runs/{run_id} for progress and results.
"""

from __future__ import annotations

import shutil
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, File, Form, UploadFile, HTTPException
from pydantic import BaseModel, Field

from core.logging_config import get_agent_logger
from orchestration.graph import fibrion_graph
from orchestration.state import FibrionState
from services.run_store import run_store


logger = get_agent_logger("api.upload")

router = APIRouter(tags=["analysis"])

UPLOAD_DIR = Path("outputs/tmp/uploads")


class UploadResponse(BaseModel):
    run_id: str
    status: str = "queued"
    message: str = "Analysis queued."


def _run_pipeline(
    run_id: str,
    initial_state: FibrionState,
) -> None:
    """
    Execute the existing Fibrion graph.

    The graph itself remains the source of truth. This wrapper only
    updates frontend-facing progress information around the execution.
    """

    try:
        run_store.update(
            run_id,
            status="running",
            stage="ingestion",
            progress=10,
            message="Fibrion is starting the analysis pipeline.",
        )

        logger.info(
            "Starting pipeline run %s for %s",
            run_id,
            initial_state.file_path,
        )

        # The current graph is synchronous, so execute it in the
        # background task rather than blocking the HTTP request.
        result = fibrion_graph.invoke(initial_state)

        if not isinstance(result, dict):
            result = dict(result)

        if result.get("error"):
            run_store.fail(
                run_id,
                result.get("error"),
            )
            return

        run_store.complete(
            run_id,
            result,
        )

        logger.info(
            "Pipeline run %s completed successfully",
            run_id,
        )

    except Exception as exc:
        logger.exception(
            "Pipeline run %s failed unexpectedly",
            run_id,
        )

        run_store.fail(
            run_id,
            {
                "type": type(exc).__name__,
                "message": str(exc),
            },
        )


@router.post(
    "/upload",
    response_model=UploadResponse,
)
async def upload_production_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    process_type: str = Form("weaving"),
    delivery_channels: str = Form(""),
    telegram_chat_id: Optional[str] = Form(None),
    recipient_email: Optional[str] = Form(None),
    data_dictionary: Optional[str] = Form(None),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file must have a filename.")

    run_id = str(uuid.uuid4())

    UPLOAD_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    safe_filename = Path(file.filename).name
    saved_path = UPLOAD_DIR / f"{run_id}_{safe_filename}"

    with saved_path.open("wb") as output_file:
        shutil.copyfileobj(
            file.file,
            output_file,
        )

    channels = [
        channel.strip()
        for channel in delivery_channels.split(",")
        if channel.strip()
    ]

    initial_state = FibrionState(
        run_id=run_id,
        file_path=str(saved_path),
        process_type=process_type,
        delivery_channels=channels,
        telegram_chat_id=telegram_chat_id,
        recipient_email=recipient_email,
        data_dictionary=data_dictionary,
    )

    run_store.create(
        run_id=run_id,
        filename=safe_filename,
        process_type=process_type,
    )

    background_tasks.add_task(
        _run_pipeline,
        run_id,
        initial_state,
    )

    logger.info(
        "Created frontend analysis run %s for %s",
        run_id,
        safe_filename,
    )

    return UploadResponse(
        run_id=run_id,
        status="queued",
        message="Dataset uploaded. Fibrion analysis has started.",
    )