"""
backend/services/run_store.py

Postgres-backed run registry (via the Run model in core/models.py).
Replaces the earlier in-memory dict from Phase 1 - runs now survive
restarts and are queryable, which is what actually unlocks a real
Datasets/Reports history on the frontend instead of a localStorage
stopgap.

Every function takes `db: Session` explicitly rather than owning its
own session, the same pattern the auth routes already use via
Depends(get_db) - so a request handler passes through its
already-injected session, and a background task (which has no
request-scoped session, since it runs after the response is sent)
opens its own with SessionLocal() and closes it when done.
"""

from __future__ import annotations

import math
import uuid
from typing import Any

from sqlalchemy.orm import Session
from pydantic import BaseModel
from core.models import Run


def _sanitize_for_json(obj):
    """
    Postgres' JSON column type rejects raw NaN/Infinity outright
    (psycopg2 raises ValueError: "Out of range float values are not
    JSON compliant") - this replaces them with None before anything
    is ever written, same as it did for the in-memory version, just
    more load-bearing now since the failure mode is a write error
    instead of a later JSON-serialization error.

    Also unwraps any Pydantic model (e.g. FieldResolution) that
    survives into the final state dict - LangGraph merges node
    outputs into FibrionState, but nested BaseModel instances inside
    dict/list fields aren't auto-serialized just because the state
    itself gets dumped to a dict.
    """
    if isinstance(obj, BaseModel):
        obj = obj.model_dump(mode="json")
    if isinstance(obj, float):
        return None if (math.isnan(obj) or math.isinf(obj)) else obj
    if isinstance(obj, dict):
        return {k: _sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize_for_json(v) for v in obj]
    return obj


def _to_dict(run: Run) -> dict[str, Any]:
    """
    Keeps the exact same external shape the in-memory version
    returned (run_id as the key, not id; ISO-string timestamps, not
    datetime objects) so api/runs.py, the frontend contract, and the
    existing tests didn't need to change at all when this moved to
    Postgres underneath.
    """
    return {
        "run_id": run.id,
        "user_id": str(run.user_id),
        "filename": run.filename,
        "process_type": run.process_type,
        "status": run.status,
        "stage": run.stage,
        "message": run.message,
        "progress": run.progress,
        "error": run.error,
        "result": run.result,
        "created_at": run.created_at.isoformat() if run.created_at else None,
        "updated_at": run.updated_at.isoformat() if run.updated_at else None,
    }


def create(
    db: Session,
    run_id: str,
    filename: str,
    process_type: str,
    user_id: str,
) -> dict[str, Any]:
    run = Run(
        id=run_id,
        user_id=uuid.UUID(user_id) if isinstance(user_id, str) else user_id,
        filename=filename,
        process_type=process_type,
        status="queued",
        stage="queued",
        message="Analysis queued.",
        progress=0,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return _to_dict(run)


def update(db: Session, run_id: str, **fields: Any) -> None:
    run = db.query(Run).filter(Run.id == run_id).first()
    if run is None:
        return

    for key, value in fields.items():
        setattr(run, key, value)

    db.commit()


def get(db: Session, run_id: str) -> dict[str, Any] | None:
    run = db.query(Run).filter(Run.id == run_id).first()
    return _to_dict(run) if run else None


def list_for_user(db: Session, user_id: str) -> list[dict[str, Any]]:
    user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    runs = (
        db.query(Run)
        .filter(Run.user_id == user_uuid)
        .order_by(Run.created_at.desc())
        .all()
    )
    return [_to_dict(run) for run in runs]


def complete(db: Session, run_id: str, result: dict[str, Any]) -> None:
    update(
        db,
        run_id,
        status="completed",
        stage="complete",
        message="Fibrion analysis completed successfully.",
        progress=100,
        result=_sanitize_for_json(result),
        error=result.get("error"),
    )


def fail(db: Session, run_id: str, error: Any) -> None:
    update(
        db,
        run_id,
        status="failed",
        stage="error",
        message="Fibrion could not complete the analysis.",
        error=error,
    )


def clear(db: Session) -> None:
    """Wipes all runs. Used by tests to isolate from each other -
    never called from application code."""
    db.query(Run).delete()
    db.commit()