"""
backend/tests/test_anomaly_detection.py

Tests agents/kpi_agent.py's _detect_anomalies() — z-score based
outlier flagging over a group-level KPI breakdown.
"""

from agents.kpi_agent import _detect_anomalies, Z_SCORE_THRESHOLD


def test_too_few_points_returns_no_anomalies():
    # Fewer than 3 points — a z-score wouldn't mean anything.
    by_order = [
        {"order_id": "A", "fulfillment_pct": 50.0},
        {"order_id": "B", "fulfillment_pct": 95.0},
    ]
    assert _detect_anomalies(by_order, "order_id") == []


def test_flags_a_genuine_outlier():
    # 6 orders performing identically, one collapsed to near-zero.
    # (With n data points, no single z-score can exceed sqrt(n-1) —
    # Samuelson's inequality — so this needs enough points for a
    # real outlier to clear the 2.0 threshold; 5 points caps out
    # at exactly 2.0 and can never strictly exceed it.)
    by_order = [
        {"order_id": "A", "fulfillment_pct": 95.0},
        {"order_id": "B", "fulfillment_pct": 95.0},
        {"order_id": "C", "fulfillment_pct": 95.0},
        {"order_id": "D", "fulfillment_pct": 95.0},
        {"order_id": "E", "fulfillment_pct": 95.0},
        {"order_id": "F", "fulfillment_pct": 95.0},
        {"order_id": "G", "fulfillment_pct": 10.0},
    ]

    anomalies = _detect_anomalies(by_order, "order_id")
    flagged_ids = {a["group_value"] for a in anomalies}

    assert "G" in flagged_ids
    outlier = next(a for a in anomalies if a["group_value"] == "G")
    assert outlier["metric"] == "fulfillment_pct"
    assert abs(outlier["z_score"]) > Z_SCORE_THRESHOLD


def test_uniform_values_flag_nothing():
    # Zero standard deviation — every order performs identically.
    # No anomaly is mathematically well-defined here, so nothing
    # should be flagged (and this must not divide by zero).
    by_order = [
        {"order_id": "A", "fulfillment_pct": 100.0},
        {"order_id": "B", "fulfillment_pct": 100.0},
        {"order_id": "C", "fulfillment_pct": 100.0},
    ]
    assert _detect_anomalies(by_order, "order_id") == []


def test_missing_metric_column_is_skipped_not_an_error():
    by_order = [
        {"order_id": "A", "rejection_pct": 1.0},
        {"order_id": "B", "rejection_pct": 1.0},
        {"order_id": "C", "rejection_pct": 1.0},
        {"order_id": "D", "rejection_pct": 1.0},
        {"order_id": "E", "rejection_pct": 1.0},
        {"order_id": "F", "rejection_pct": 1.0},
        {"order_id": "G", "rejection_pct": 90.0},
    ]
    # fulfillment_pct and shrink_variance_pct simply aren't present —
    # should not raise, should still catch the rejection_pct outlier.
    anomalies = _detect_anomalies(by_order, "order_id")
    assert any(a["metric"] == "rejection_pct" and a["group_value"] == "G" for a in anomalies)