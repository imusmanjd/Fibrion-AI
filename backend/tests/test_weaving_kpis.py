"""
backend/tests/test_weaving_kpis.py

Tests core/schema_registry/weaving.py's compute_kpis() directly
against a small synthetic DataFrame - the actual arithmetic that
produces the numbers a customer sees, kept independent of the LLM
pipeline around it.
"""

import pandas as pd

from core.schema_registry.weaving import WeavingModule


def _sample_df() -> pd.DataFrame:
    return pd.DataFrame([
        {
            "order_id": "13001-1",
            "total_pdn_per_order_yds": 900.0,
            "rejection_yds": 90.0,
            "req_grey_fabric_yds": 1000.0,
            "act_shrink_pct": 5.0,
            "shrink_allow_pct": 5.0,
            "fabric_construction": "40x40/110x80",
            "month": "January",
            "total_pdn_today_yds": 900.0,
        },
        {
            "order_id": "13002-1",
            "total_pdn_per_order_yds": 500.0,
            "rejection_yds": 0.0,
            "req_grey_fabric_yds": 500.0,
            "act_shrink_pct": 4.5,
            "shrink_allow_pct": 5.0,
            "fabric_construction": "40x40/110x80",
            "month": "January",
            "total_pdn_today_yds": 500.0,
        },
        {
            # Supplementary order — must be excluded from headline KPIs.
            "order_id": "13001-1(A)",
            "total_pdn_per_order_yds": 100.0,
            "rejection_yds": 5.0,
            "req_grey_fabric_yds": 100.0,
            "act_shrink_pct": 5.0,
            "shrink_allow_pct": 5.0,
            "fabric_construction": "40x40/110x80",
            "month": "January",
            "total_pdn_today_yds": 100.0,
        },
        {
            # Non-order material (no digit in the id) — also excluded.
            "order_id": "Beam",
            "total_pdn_per_order_yds": 50.0,
            "rejection_yds": 0.0,
            "req_grey_fabric_yds": 50.0,
            "act_shrink_pct": 5.0,
            "shrink_allow_pct": 5.0,
            "fabric_construction": "40x40/110x80",
            "month": "January",
            "total_pdn_today_yds": 50.0,
        },
    ])


def test_overall_fulfillment_and_rejection_exclude_supplementary_and_non_order():
    result = WeavingModule().compute_kpis(_sample_df())
    overall = result["overall"]

    # Only 13001-1 (900/1000) and 13002-1 (500/500) count toward the
    # primary totals — 1400 produced / 1500 required.
    assert overall["total_produced_grey_yds"] == 1400.0
    assert overall["total_required_grey_yds"] == 1500.0
    assert overall["overall_fulfillment_pct"] == round(1400 / 1500 * 100, 2)

    # Only 13001-1's 90 rejected yards count — 90 / 1400 produced.
    assert overall["overall_rejection_pct"] == round(90 / 1400 * 100, 2)


def test_supplementary_and_non_order_flags_set_correctly():
    result = WeavingModule().compute_kpis(_sample_df())
    by_order = {row["order_id"]: row for row in result["by_order"]}

    assert by_order["13001-1(A)"]["is_supplementary"] is True
    assert by_order["13001-1"]["is_supplementary"] is False

    assert by_order["Beam"]["is_non_order_material"] is True
    assert by_order["13001-1"]["is_non_order_material"] is False


def test_per_order_fulfillment_and_shrink_variance():
    result = WeavingModule().compute_kpis(_sample_df())
    by_order = {row["order_id"]: row for row in result["by_order"]}

    order = by_order["13001-1"]
    assert order["fulfillment_pct"] == 90.0  # 900 / 1000 * 100
    assert order["rejection_pct"] == 10.0    # 90 / 900 * 100
    assert order["shrink_variance_pct"] == 0.0  # 5.0 actual - 5.0 planned


def test_division_by_zero_produces_none_not_nan_or_inf():
    df = _sample_df()
    df.loc[df["order_id"] == "13002-1", "req_grey_fabric_yds"] = 0.0

    result = WeavingModule().compute_kpis(df)
    by_order = {row["order_id"]: row for row in result["by_order"]}

    # 500 / 0 must become None (JSON-safe), never NaN or inf — this is
    # the exact bug noted in the project's own learnings: FastAPI
    # rejects raw NaN/Infinity that Python's json module accepts.
    assert by_order["13002-1"]["fulfillment_pct"] is None