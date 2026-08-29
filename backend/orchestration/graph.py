"""
backend/orchestration/graph.py

Wires the Fibrion agents into the LangGraph pipeline and reports
real node-level progress to the frontend run store.

The graph remains usable outside the web API: if a run_id is not
registered in RunStore, progress updates are simply ignored.

Pipeline:

START
  ↓
ingestion
  ↓
validation
  ↓
kpi
  ↓
analysis
  ↓
visualization
  ↓
report
  ↓
verification
  ├── success → notification
  └── first failure → analysis (one retry)
  ↓
notification
  ↓
END
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from langgraph.graph import END, START, StateGraph

from agents.analysis_agent import run_analysis
from agents.ingestion_agent import run_ingestion
from agents.kpi_agent import run_kpi
from agents.notification_agent import run_notification
from agents.report_agent import run_report
from agents.validation_agent import run_validation
from agents.verification_agent import run_verification
from agents.visualization_agent import run_visualization
from orchestration.state import FibrionState
from services.run_store import run_store


# -------------------------------------------------------------------
# Frontend-facing stage information
# -------------------------------------------------------------------

STAGES: dict[str, dict[str, Any]] = {
    "ingestion": {
        "progress": 12,
        "message": "Fibrion is reading and preparing your dataset.",
    },
    "validation": {
        "progress": 28,
        "message": "Validation Agent is checking data quality and structure.",
    },
    "kpi": {
        "progress": 45,
        "message": "KPI Engine is calculating production and quality metrics.",
    },
    "analysis": {
        "progress": 62,
        "message": "AI Analyst is identifying findings, causes, and recommendations.",
    },
    "visualization": {
        "progress": 75,
        "message": "Visualization Agent is building analytical charts.",
    },
    "report": {
        "progress": 86,
        "message": "Report Agent is preparing the management report.",
    },
    "verification": {
        "progress": 94,
        "message": "Verification Agent is checking analytical consistency.",
    },
    "notification": {
        "progress": 98,
        "message": "Fibrion is preparing the requested delivery channels.",
    },
}


def _set_stage(
    state: FibrionState,
    stage: str,
) -> None:
    """
    Update the frontend-visible progress for the current graph node.

    RunStore safely ignores updates for runs that were not created
    through the web API. This keeps CLI/_check.py usage working.
    """

    run_id = getattr(state, "run_id", None)

    if not run_id:
        return

    stage_info = STAGES.get(
        stage,
        {
            "progress": 0,
            "message": "Fibrion is processing your dataset.",
        },
    )

    run_store.update(
        run_id,
        status="running",
        stage=stage,
        progress=stage_info["progress"],
        message=stage_info["message"],
    )


def _tracked_node(
    name: str,
    fn: Callable[[FibrionState], dict[str, Any]],
) -> Callable[[FibrionState], dict[str, Any]]:
    """
    Wrap an existing Fibrion agent without changing its implementation.

    Before the agent runs, the frontend sees the agent as active.
    After it finishes, the frontend receives a completion message.

    The actual agent output remains untouched.
    """

    def wrapped(state: FibrionState) -> dict[str, Any]:
        _set_stage(state, name)

        result = fn(state)

        run_id = getattr(state, "run_id", None)

        if run_id:
            stage_info = STAGES.get(name, {})

            if state.error:
                run_store.update(
                    run_id,
                    status="running",
                    stage=name,
                    message=(
                        f"{name.replace('_', ' ').title()} completed "
                        "with an error; Fibrion is routing the run."
                    ),
                )
            else:
                run_store.update(
                    run_id,
                    status="running",
                    stage=name,
                    progress=stage_info.get("progress", 0),
                    message=(
                        f"{name.replace('_', ' ').title()} completed. "
                        "Fibrion is moving to the next stage."
                    ),
                )

        return result

    return wrapped


# -------------------------------------------------------------------
# Routing
# -------------------------------------------------------------------

def _after_ingestion(state: FibrionState) -> str:
    return "notification" if state.error else "validation"


def _after_validation(state: FibrionState) -> str:
    return "notification" if state.error else "kpi"


def _after_verification(state: FibrionState) -> str:
    """
    Verification controls whether the pipeline completes or gets
    one analysis retry.

    verification_agent increments retry_count when it requests a
    retry, so retry_count == 0 means this is the first failed pass.
    """

    if state.verification_passed:
        return "notification"

    if state.retry_count == 0:
        return "analysis"

    return "notification"


# -------------------------------------------------------------------
# Graph construction
# -------------------------------------------------------------------

def build_graph():
    graph = StateGraph(FibrionState)

    # Wrap each existing agent with frontend progress reporting.
    graph.add_node(
        "ingestion",
        _tracked_node("ingestion", run_ingestion),
    )

    graph.add_node(
        "validation",
        _tracked_node("validation", run_validation),
    )

    graph.add_node(
        "kpi",
        _tracked_node("kpi", run_kpi),
    )

    graph.add_node(
        "analysis",
        _tracked_node("analysis", run_analysis),
    )

    graph.add_node(
        "visualization",
        _tracked_node("visualization", run_visualization),
    )

    graph.add_node(
        "report",
        _tracked_node("report", run_report),
    )

    graph.add_node(
        "verification",
        _tracked_node("verification", run_verification),
    )

    graph.add_node(
        "notification",
        _tracked_node("notification", run_notification),
    )

    # ---------------------------------------------------------------
    # Main pipeline
    # ---------------------------------------------------------------

    graph.add_edge(
        START,
        "ingestion",
    )

    graph.add_conditional_edges(
        "ingestion",
        _after_ingestion,
        {
            "validation": "validation",
            "notification": "notification",
        },
    )

    graph.add_conditional_edges(
        "validation",
        _after_validation,
        {
            "kpi": "kpi",
            "notification": "notification",
        },
    )

    graph.add_edge(
        "kpi",
        "analysis",
    )

    graph.add_edge(
        "analysis",
        "visualization",
    )

    graph.add_edge(
        "visualization",
        "report",
    )

    graph.add_edge(
        "report",
        "verification",
    )

    graph.add_conditional_edges(
        "verification",
        _after_verification,
        {
            "analysis": "analysis",
            "notification": "notification",
        },
    )

    graph.add_edge(
        "notification",
        END,
    )

    return graph.compile()


fibrion_graph = build_graph()