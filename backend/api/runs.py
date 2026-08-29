"""
backend/api/runs.py

Endpoints used by the Next.js frontend to monitor an analysis run.
"""

from fastapi import APIRouter, HTTPException

from services.run_store import run_store


router = APIRouter(prefix="/runs", tags=["runs"])


@router.get("/{run_id}")
def get_run(run_id: str):
    run = run_store.get(run_id)

    if run is None:
        raise HTTPException(
            status_code=404,
            detail="Analysis run not found.",
        )

    return run