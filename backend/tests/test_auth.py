"""
backend/tests/test_auth.py

End-to-end auth tests against the real FastAPI app, using an
isolated in-memory SQLite database per test (not the dev database
file, and not shared between tests) so registering "test@example.com"
in one test can't collide with another.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from core.database import Base, get_db
from main import app


@pytest.fixture()
def client():
    # StaticPool + check_same_thread=False: a single shared in-memory
    # SQLite connection for the whole test, since ":memory:" databases
    # are normally per-connection and would otherwise vanish between
    # requests within the same test.
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
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_register_creates_account_and_logs_in(client):
    response = client.post(
        "/auth/register",
        json={"email": "new@example.com", "password": "password123", "full_name": "New User"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "new@example.com"
    assert body["full_name"] == "New User"
    assert "hashed_password" not in body  # never leaks the hash

    # Registering sets the session cookie - already logged in.
    me = client.get("/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "new@example.com"


def test_register_rejects_duplicate_email(client):
    client.post("/auth/register", json={"email": "dup@example.com", "password": "password123"})
    response = client.post("/auth/register", json={"email": "dup@example.com", "password": "password123"})

    assert response.status_code == 409


def test_register_rejects_short_password(client):
    response = client.post("/auth/register", json={"email": "a@example.com", "password": "short"})
    assert response.status_code == 422


def test_register_rejects_invalid_email(client):
    response = client.post("/auth/register", json={"email": "not-an-email", "password": "password123"})
    assert response.status_code == 422


def test_login_with_correct_password_succeeds(client):
    client.post("/auth/register", json={"email": "user@example.com", "password": "correct-password"})
    client.post("/auth/logout")

    response = client.post("/auth/login", json={"email": "user@example.com", "password": "correct-password"})

    assert response.status_code == 200
    assert response.json()["email"] == "user@example.com"


def test_login_with_wrong_password_fails(client):
    client.post("/auth/register", json={"email": "user2@example.com", "password": "correct-password"})
    client.post("/auth/logout")

    response = client.post("/auth/login", json={"email": "user2@example.com", "password": "wrong-password"})

    assert response.status_code == 401


def test_login_with_unknown_email_fails(client):
    response = client.post("/auth/login", json={"email": "nobody@example.com", "password": "whatever123"})
    assert response.status_code == 401


def test_me_without_session_returns_401(client):
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_logout_clears_the_session(client):
    client.post("/auth/register", json={"email": "logout@example.com", "password": "password123"})
    assert client.get("/auth/me").status_code == 200

    client.post("/auth/logout")

    assert client.get("/auth/me").status_code == 401


def test_tampered_cookie_is_rejected(client):
    client.post("/auth/register", json={"email": "tamper@example.com", "password": "password123"})

    client.cookies.set("fibrion_session", "not-a-real-token")
    response = client.get("/auth/me")

    assert response.status_code == 401