"""
backend/tests/test_run_store.py

Tests services/run_store.py's RunStore lifecycle and its JSON
sanitization (the fix for FastAPI rejecting raw NaN/Infinity that
Python's json module would otherwise accept silently).

Each test builds its own RunStore() instance rather than using the
shared run_store singleton, so tests can't interfere with each other.
"""

from services.run_store import RunStore, _sanitize_for_json


def test_create_returns_queued_record_with_zero_progress():
    store = RunStore()
    record = store.create(run_id="r1", filename="data.csv", process_type="weaving")

    assert record["status"] == "queued"
    assert record["stage"] == "queued"
    assert record["progress"] == 0
    assert record["result"] is None
    assert record["filename"] == "data.csv"


def test_get_returns_a_copy_not_the_live_record():
    store = RunStore()
    store.create(run_id="r1", filename="data.csv", process_type="weaving")

    fetched = store.get("r1")
    fetched["status"] = "tampered"

    # Mutating what get() returned must not affect the stored record.
    assert store.get("r1")["status"] == "queued"


def test_get_unknown_run_returns_none():
    store = RunStore()
    assert store.get("does-not-exist") is None


def test_update_merges_fields_and_bumps_updated_at():
    store = RunStore()
    store.create(run_id="r1", filename="data.csv", process_type="weaving")
    original_updated_at = store.get("r1")["updated_at"]

    store.update("r1", status="running", progress=45)
    record = store.get("r1")

    assert record["status"] == "running"
    assert record["progress"] == 45
    assert record["updated_at"] >= original_updated_at


def test_update_on_unknown_run_is_a_silent_no_op():
    store = RunStore()
    # Must not raise — background pipeline code calls update() without
    # checking existence first.
    store.update("does-not-exist", status="running")


def test_complete_sets_status_and_sanitizes_result():
    store = RunStore()
    store.create(run_id="r1", filename="data.csv", process_type="weaving")

    store.complete("r1", {"kpi_results": {"overall_fulfillment_pct": float("nan")}})
    record = store.get("r1")

    assert record["status"] == "completed"
    assert record["progress"] == 100
    assert record["result"]["kpi_results"]["overall_fulfillment_pct"] is None


def test_fail_sets_status_and_preserves_error_detail():
    store = RunStore()
    store.create(run_id="r1", filename="data.csv", process_type="weaving")

    store.fail("r1", {"type": "ValueError", "message": "bad column"})
    record = store.get("r1")

    assert record["status"] == "failed"
    assert record["error"]["message"] == "bad column"


def test_sanitize_for_json_replaces_nan_and_inf_with_none():
    dirty = {
        "a": float("nan"),
        "b": float("inf"),
        "c": float("-inf"),
        "d": 42.5,
        "e": [float("nan"), 1, {"f": float("inf")}],
    }

    clean = _sanitize_for_json(dirty)

    assert clean["a"] is None
    assert clean["b"] is None
    assert clean["c"] is None
    assert clean["d"] == 42.5
    assert clean["e"][0] is None
    assert clean["e"][1] == 1
    assert clean["e"][2]["f"] is None


def test_sanitize_for_json_leaves_normal_values_untouched():
    assert _sanitize_for_json({"a": 1, "b": "text", "c": True}) == {"a": 1, "b": "text", "c": True}