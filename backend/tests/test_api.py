"""
backend/tests/test_api.py

API-layer smoke tests using FastAPI's TestClient against the real
app (main.app). Deliberately does NOT call POST /upload: FastAPI's
TestClient executes BackgroundTasks synchronously, which would
invoke the real LangGraph pipeline (real LLM calls) against the
dummy API keys set in conftest.py. Instead, run state is seeded
directly through run_store.create()/complete() - the same store
api/runs.py reads from - keeping these tests fast, deterministic,
and network-free.
"""

from fastapi.testclient import TestClient

from main import app
from services.run_store import run_store

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_get_unknown_run_returns_404():
    response = client.get("/runs/does-not-exist")
    assert response.status_code == 404


def test_get_seeded_run_returns_its_state():
    run_store.create(run_id="test-run-1", filename="weaving_dataset.csv", process_type="weaving")

    response = client.get("/runs/test-run-1")

    assert response.status_code == 200
    body = response.json()
    assert body["run_id"] == "test-run-1"
    assert body["status"] == "queued"
    assert body["filename"] == "weaving_dataset.csv"


def test_report_download_404s_before_report_exists():
    run_store.create(run_id="test-run-2", filename="weaving_dataset.csv", process_type="weaving")

    response = client.get("/runs/test-run-2/report")

    assert response.status_code == 404


def test_report_download_404s_for_unknown_run():
    response = client.get("/runs/does-not-exist/report")
    assert response.status_code == 404


def test_send_report_404s_when_report_not_yet_generated():
    run_store.create(run_id="test-run-3", filename="weaving_dataset.csv", process_type="weaving")

    response = client.post(
        "/runs/test-run-3/send",
        json={"channel": "email", "recipient": "someone@example.com"},
    )

    assert response.status_code == 404


def test_send_report_rejects_invalid_channel():
    run_store.create(run_id="test-run-4", filename="weaving_dataset.csv", process_type="weaving")

    response = client.post(
        "/runs/test-run-4/send",
        json={"channel": "carrier-pigeon", "recipient": "someone@example.com"},
    )

    # Pydantic's Literal["telegram", "email"] rejects this before the
    # handler even runs.
    assert response.status_code == 422


def test_chart_lookup_404s_for_unknown_chart():
    run_store.create(run_id="test-run-5", filename="weaving_dataset.csv", process_type="weaving")
    run_store.complete("test-run-5", {"chart_paths": []})

    response = client.get("/runs/test-run-5/charts/nonexistent.png")

    assert response.status_code == 404