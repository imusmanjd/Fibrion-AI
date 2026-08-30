"""
backend/api/runs.py

Frontend-facing endpoints for completed Fibrion analysis runs.

Provides:
- run status/results
- PDF report download
- generated chart access
- direct report delivery by email
- direct report delivery by Telegram

The delivery endpoints are intentionally independent from the delivery
choice made when the analysis was originally uploaded.
"""

from __future__ import annotations

from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from services.email_service import send_email
from services.run_store import run_store
from services.telegram_service import send_telegram


router = APIRouter(
    prefix="/runs",
    tags=["runs"],
)


# ---------------------------------------------------------------------------
# Run information
# ---------------------------------------------------------------------------

@router.get("/{run_id}")
def get_run(run_id: str):
    """
    Return the current state/result of a Fibrion analysis run.
    """

    run = run_store.get(run_id)

    if run is None:
        raise HTTPException(
            status_code=404,
            detail="Analysis run not found.",
        )

    return run


# ---------------------------------------------------------------------------
# Report download
# ---------------------------------------------------------------------------

@router.get("/{run_id}/report")
def download_report(run_id: str):
    """
    Download the generated Fibrion PDF report.
    """

    run = run_store.get(run_id)

    if run is None:
        raise HTTPException(
            status_code=404,
            detail="Analysis run not found.",
        )

    result = run.get("result") or {}
    report_path = result.get("report_path")

    if not report_path:
        raise HTTPException(
            status_code=404,
            detail="Report has not been generated for this run.",
        )

    path = Path(report_path)

    if not path.exists() or not path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Report file is no longer available.",
        )

    return FileResponse(
        path=str(path),
        media_type="application/pdf",
        filename=f"fibrion_report_{run_id[:8]}.pdf",
    )


# ---------------------------------------------------------------------------
# Chart access
# ---------------------------------------------------------------------------

@router.get("/{run_id}/charts/{chart_name}")
def get_chart(
    run_id: str,
    chart_name: str,
):
    """
    Return one generated PNG chart belonging to the analysis run.
    """

    run = run_store.get(run_id)

    if run is None:
        raise HTTPException(
            status_code=404,
            detail="Analysis run not found.",
        )

    result = run.get("result") or {}
    chart_paths = result.get("chart_paths") or []

    requested_name = Path(chart_name).name

    for chart_path in chart_paths:
        path = Path(chart_path)

        if path.name != requested_name:
            continue

        if not path.exists() or not path.is_file():
            break

        return FileResponse(
            path=str(path),
            media_type="image/png",
        )

    raise HTTPException(
        status_code=404,
        detail="Chart not found for this run.",
    )


# ---------------------------------------------------------------------------
# Report delivery
# ---------------------------------------------------------------------------

class SendReportRequest(BaseModel):
    """
    Request body used by the frontend when the user chooses to send
    an already-generated report.
    """

    channel: Literal["telegram", "email"]

    recipient: str = Field(
        min_length=1,
        max_length=320,
    )


@router.post("/{run_id}/send")
def send_report(
    run_id: str,
    request: SendReportRequest,
):
    """
    Send an already-generated Fibrion report.

    This endpoint is independent from the original upload-time
    delivery selection.

    Examples:

    Telegram:
        {
            "channel": "telegram",
            "recipient": "123456789"
        }

    Email:
        {
            "channel": "email",
            "recipient": "manager@company.com"
        }
    """

    run = run_store.get(run_id)

    if run is None:
        raise HTTPException(
            status_code=404,
            detail="Analysis run not found.",
        )

    result = run.get("result") or {}
    report_path = result.get("report_path")

    if not report_path:
        raise HTTPException(
            status_code=404,
            detail="Report has not been generated for this run.",
        )

    report_file = Path(report_path)

    if not report_file.exists() or not report_file.is_file():
        raise HTTPException(
            status_code=404,
            detail="Report file is no longer available.",
        )

    # The report page can display these headline numbers alongside
    # the delivery action, so use the deterministic KPI results.
    overall = (
        result
        .get("kpi_results", {})
        .get("overall", {})
    )

    fulfillment = overall.get(
        "overall_fulfillment_pct",
        "?",
    )

    rejection = overall.get(
        "overall_rejection_pct",
        "?",
    )

    message = (
        "Fibrion production report.\n\n"
        f"Fulfillment: {fulfillment}%\n"
        f"Rejection: {rejection}%\n\n"
        "Full verified report attached."
    )

    if request.channel == "telegram":
        outcome = send_telegram(
            request.recipient,
            message,
            str(report_file),
        )

    else:
        outcome = send_email(
            request.recipient,
            "Fibrion Production Report",
            message,
            str(report_file),
        )

    if outcome.get("status") != "sent":
        raise HTTPException(
            status_code=502,
            detail=(
                f"Delivery failed: "
                f"{outcome.get('error', 'Unknown delivery error.')}"
            ),
        )

    return {
        "status": "sent",
        "channel": request.channel,
        "recipient": request.recipient,
        "message": (
            "Report sent successfully."
        ),
    }