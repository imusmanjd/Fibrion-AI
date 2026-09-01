"""
backend/services/run_store.py

Small in-memory run registry used by the API/frontend.

It stores the current status of a Fibrion analysis while the pipeline
is running and keeps the final result after completion.

Phase 1 intentionally uses memory. For production multi-worker
deployment, replace this with Redis/PostgreSQL without changing the
frontend API contract.
"""

from __future__ import annotations

from datetime import datetime, timezone
from threading import Lock
from typing import Any

import math

def _sanitize_for_json(obj):
    if isinstance(obj, float):
        return None if (math.isnan(obj) or math.isinf(obj)) else obj
    if isinstance(obj, dict):
        return {k: _sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize_for_json(v) for v in obj]
    return obj

class RunStore:
    def __init__(self) -> None:
        self._runs: dict[str, dict[str, Any]] = {}
        self._lock = Lock()

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()

    def create(
        self,
        run_id: str,
        filename: str,
        process_type: str,
    ) -> dict[str, Any]:
        record = {
            "run_id": run_id,
            "filename": filename,
            "process_type": process_type,
            "status": "queued",
            "stage": "queued",
            "message": "Analysis queued.",
            "progress": 0,
            "error": None,
            "result": None,
            "created_at": self._now(),
            "updated_at": self._now(),
        }

        with self._lock:
            self._runs[run_id] = record

        return dict(record)

    def update(self, run_id: str, **fields: Any) -> None:
        with self._lock:
            record = self._runs.get(run_id)
            if record is None:
                return

            record.update(fields)
            record["updated_at"] = self._now()

    def get(self, run_id: str) -> dict[str, Any] | None:
        with self._lock:
            record = self._runs.get(run_id)
            return dict(record) if record else None

    def complete(
        self,
        run_id: str,
        result: dict[str, Any],
    ) -> None:
        self.update(
            run_id,
            status="completed",
            stage="complete",
            message="Fibrion analysis completed successfully.",
            progress=100,
            result=_sanitize_for_json(result),
            error=result.get("error"),
        )

    def fail(
        self,
        run_id: str,
        error: Any,
    ) -> None:
        self.update(
            run_id,
            status="failed",
            stage="error",
            message="Fibrion could not complete the analysis.",
            error=error,
        )


run_store = RunStore()