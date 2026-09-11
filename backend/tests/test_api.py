"""
backend/tests/test_api.py

API-layer tests using FastAPI's TestClient against the real app
(main.app), with an isolated in-memory database per test (same
pattern as test_auth.py) plus a cleared run_store per test, since
that's a separate global singleton.

Deliberately does NOT call POST /upload: FastAPI's TestClient
executes BackgroundTasks synchronously, which would invoke the real
LangGraph pipeline (real LLM calls) against the dummy API keys set
in conftest.py. Instead, run state is seeded directly through
run_store.create()/complete() - the same store api/runs.py reads
from - keeping these tests fast, deterministic, and network-free.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from core.database import Base, get_db
from main import app
from services.run_store import run_store


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    run_store.clear()
    yield TestClient(app)
    run_store.clear()
    app.dependency_overrides.clear()


def _register(client, email="owner@example.com"):
    """Registers + logs in a user, returns their id. The TestClient
    keeps the session cookie for subsequent calls automatically."""
    response = client.post("/auth/register", json={"email": email, "password": "password123"})
    return response.json()["id"]


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_get_run_without_login_returns_401(client):
    response = client.get("/runs/does-not-exist")
    assert response.status_code == 401


def test_get_unknown_run_returns_404_when_logged_in(client):
    _register(client)
    response = client.get("/runs/does-not-exist")
    assert response.status_code == 404


def test_get_own_run_returns_its_state(client):
    user_id = _register(client)
    run_store.create(run_id="run-1", filename="weaving_dataset.csv", process_type="weaving", user_id=user_id)

    response = client.get("/runs/run-1")

    assert response.status_code == 200
    body = response.json()
    assert body["run_id"] == "run-1"
    assert body["status"] == "queued"
    assert body["filename"] == "weaving_dataset.csv"


def test_cannot_see_another_users_run(client):
    other_user_id = "some-other-user-id"
    run_store.create(run_id="run-2", filename="not-yours.csv", process_type="weaving", user_id=other_user_id)

    _register(client, email="attacker@example.com")
    response = client.get("/runs/run-2")

    # Same 404 as a run that doesn't exist at all - never confirms
    # that "run-2" belongs to someone else.
    assert response.status_code == 404


def test_report_download_404s_before_report_exists(client):
    user_id = _register(client)
    run_store.create(run_id="run-3", filename="weaving_dataset.csv", process_type="weaving", user_id=user_id)

    response = client.get("/runs/run-3/report")

    assert response.status_code == 404


def test_report_download_requires_login(client):
    response = client.get("/runs/run-3/report")
    assert response.status_code == 401


def test_send_report_404s_when_report_not_yet_generated(client):
    user_id = _register(client)
    run_store.create(run_id="run-4", filename="weaving_dataset.csv", process_type="weaving", user_id=user_id)

    response = client.post(
        "/runs/run-4/send",
        json={"channel": "email", "recipient": "someone@example.com"},
    )

    assert response.status_code == 404


def test_send_report_rejects_invalid_channel(client):
    user_id = _register(client)
    run_store.create(run_id="run-5", filename="weaving_dataset.csv", process_type="weaving", user_id=user_id)

    response = client.post(
        "/runs/run-5/send",
        json={"channel": "carrier-pigeon", "recipient": "someone@example.com"},
    )

    # Pydantic's Literal["telegram", "email"] rejects this before the
    # handler even runs.
    assert response.status_code == 422


def test_chart_lookup_404s_for_unknown_chart(client):
    user_id = _register(client)
    run_store.create(run_id="run-6", filename="weaving_dataset.csv", process_type="weaving", user_id=user_id)
    run_store.complete("run-6", {"chart_paths": []})

    response = client.get("/runs/run-6/charts/nonexistent.png")

    assert response.status_code == 404