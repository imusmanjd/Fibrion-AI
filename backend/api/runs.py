"""
backend/api/runs.py
"""

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from services.email_service import send_email
from services.run_store import run_store
from services.telegram_service import send_telegram

router = APIRouter(prefix="/runs", tags=["runs"])


@router.get("/{run_id}")
def get_run(run_id: str):
    run = run_store.get(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Analysis run not found.")
    return run


@router.get("/{run_id}/report")
def download_report(run_id: str):
    run = run_store.get(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Analysis run not found.")
    report_path = (run.get("result") or {}).get("report_path")
    if not report_path or not Path(report_path).exists():
        raise HTTPException(status_code=404, detail="Report not available for this run.")
    return FileResponse(report_path, media_type="application/pdf", filename=f"fibrion_report_{run_id[:8]}.pdf")


@router.get("/{run_id}/charts/{chart_name}")
def get_chart(run_id: str, chart_name: str):
    run = run_store.get(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Analysis run not found.")
    chart_paths = (run.get("result") or {}).get("chart_paths", [])
    matches = [p for p in chart_paths if Path(p).name == chart_name]
    if not matches or not Path(matches[0]).exists():
        raise HTTPException(status_code=404, detail="Chart not found for this run.")
    return FileResponse(matches[0], media_type="image/png")


class SendReportRequest(BaseModel):
    channel: str  # "telegram" or "email"
    recipient: str  # chat_id or email address


@router.post("/{run_id}/send")
def send_report(run_id: str, request: SendReportRequest):
    """
    Sends an already-generated report to a channel/recipient chosen
    on the report page itself - independent of whatever delivery
    choice, if any, was made at upload time.
    """
    run = run_store.get(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Analysis run not found.")
    result = run.get("result") or {}
    report_path = result.get("report_path")
    if not report_path or not Path(report_path).exists():
        raise HTTPException(status_code=404, detail="Report not available for this run.")

    overall = (result.get("kpi_results") or {}).get("overall", {})
    message = (
        f"Fibrion production report.\n\n"
        f"Fulfillment: {overall.get('overall_fulfillment_pct', '?')}%\n"
        f"Rejection: {overall.get('overall_rejection_pct', '?')}%\n"
        f"Full report attached."
    )

    if request.channel == "telegram":
        outcome = send_telegram(request.recipient, message, report_path)
    elif request.channel == "email":
        outcome = send_email(request.recipient, "Fibrion Production Report", message, report_path)
    else:
        raise HTTPException(status_code=400, detail="channel must be 'telegram' or 'email'.")

    if outcome["status"] != "sent":
        raise HTTPException(status_code=502, detail=f"Delivery failed: {outcome.get('error')}")
    return {"status": "sent", "channel": request.channel}