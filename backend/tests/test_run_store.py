"""
backend/tests/test_run_store.py

Tests services/run_store.py's Postgres-backed lifecycle and its JSON
sanitization (the fix for the DB rejecting raw NaN/Infinity that
Python's json module would otherwise accept silently).

Each test gets its own isolated in-memory SQLite session (same
pattern as test_auth.py/test_api.py), so tests can't interfere with
each other. A fixed UUID string stands in for a real user_id - these
are unit tests of run_store's own logic, not of the users<->runs
foreign key relationship (test_api.py's tests cover that end to end,
with real registered users).
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from core.database import Base
from services import run_store

FAKE_USER_ID = "11111111-1111-1111-1111-111111111111"


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    yield session
    session.close()


def test_create_returns_queued_record_with_zero_progress(db):
    record = run_store.create(db, run_id="r1", filename="data.csv", process_type="weaving", user_id=FAKE_USER_ID)

    assert record["status"] == "queued"
    assert record["stage"] == "queued"
    assert record["progress"] == 0
    assert record["result"] is None
    assert record["filename"] == "data.csv"


def test_get_returns_a_copy_not_the_live_record(db):
    run_store.create(db, run_id="r1", filename="data.csv", process_type="weaving", user_id=FAKE_USER_ID)

    fetched = run_store.get(db, "r1")
    fetched["status"] = "tampered"

    # Mutating the returned dict must not affect the stored record.
    assert run_store.get(db, "r1")["status"] == "queued"


def test_get_unknown_run_returns_none(db):
    assert run_store.get(db, "does-not-exist") is None


def test_update_merges_fields_and_bumps_updated_at(db):
    run_store.create(db, run_id="r1", filename="data.csv", process_type="weaving", user_id=FAKE_USER_ID)
    original_updated_at = run_store.get(db, "r1")["updated_at"]

    run_store.update(db, "r1", status="running", progress=45)
    record = run_store.get(db, "r1")

    assert record["status"] == "running"
    assert record["progress"] == 45
    assert record["updated_at"] >= original_updated_at


def test_update_on_unknown_run_is_a_silent_no_op(db):
    # Must not raise — background pipeline code calls update() without
    # checking existence first.
    run_store.update(db, "does-not-exist", status="running")


def test_complete_sets_status_and_sanitizes_result(db):
    run_store.create(db, run_id="r1", filename="data.csv", process_type="weaving", user_id=FAKE_USER_ID)

    run_store.complete(db, "r1", {"kpi_results": {"overall_fulfillment_pct": float("nan")}})
    record = run_store.get(db, "r1")

    assert record["status"] == "completed"
    assert record["progress"] == 100
    assert record["result"]["kpi_results"]["overall_fulfillment_pct"] is None


def test_fail_sets_status_and_preserves_error_detail(db):
    run_store.create(db, run_id="r1", filename="data.csv", process_type="weaving", user_id=FAKE_USER_ID)

    run_store.fail(db, "r1", {"type": "ValueError", "message": "bad column"})
    record = run_store.get(db, "r1")

    assert record["status"] == "failed"
    assert record["error"]["message"] == "bad column"


def test_list_for_user_excludes_other_users_runs(db):
    run_store.create(db, run_id="r1", filename="first.csv", process_type="weaving", user_id=FAKE_USER_ID)
    run_store.create(db, run_id="r2", filename="second.csv", process_type="weaving", user_id=FAKE_USER_ID)
    run_store.create(db, run_id="r3", filename="not-mine.csv", process_type="weaving", user_id="22222222-2222-2222-2222-222222222222")

    runs = run_store.list_for_user(db, FAKE_USER_ID)

    # Two runs created back-to-back can land in the same DB timestamp
    # tick (SQLite's CURRENT_TIMESTAMP is second-resolution), so their
    # relative order isn't a meaningful guarantee to test here - only
    # that both of this user's runs are present and the other user's
    # isn't.
    assert {r["run_id"] for r in runs} == {"r1", "r2"}


def test_clear_wipes_all_runs(db):
    run_store.create(db, run_id="r1", filename="data.csv", process_type="weaving", user_id=FAKE_USER_ID)
    run_store.clear(db)

    assert run_store.get(db, "r1") is None


def test_sanitize_for_json_replaces_nan_and_inf_with_none():
    dirty = {
        "a": float("nan"),
        "b": float("inf"),
        "c": float("-inf"),
        "d": 42.5,
        "e": [float("nan"), 1, {"f": float("inf")}],
    }

    clean = run_store._sanitize_for_json(dirty)

    assert clean["a"] is None
    assert clean["b"] is None
    assert clean["c"] is None
    assert clean["d"] == 42.5
    assert clean["e"][0] is None
    assert clean["e"][1] == 1
    assert clean["e"][2]["f"] is None


def test_sanitize_for_json_leaves_normal_values_untouched():
    assert run_store._sanitize_for_json({"a": 1, "b": "text", "c": True}) == {"a": 1, "b": "text", "c": True}