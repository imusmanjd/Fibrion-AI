"""
backend/orchestration/graph.py

Wires the eight agents into the real LangGraph pipeline - the routing
we've been doing by hand in every _check.py this whole build (skip on
error, retry once on failed verification) is now enforced
automatically instead of something each script has to remember.
"""

from langgraph.graph import StateGraph, START, END

from agents.ingestion_agent import run_ingestion
from agents.validation_agent import run_validation
from agents.kpi_agent import run_kpi
from agents.analysis_agent import run_analysis
from agents.visualization_agent import run_visualization
from agents.report_agent import run_report
from agents.verification_agent import run_verification
from agents.notification_agent import run_notification
from orchestration.state import FibrionState


def _after_ingestion(state: FibrionState) -> str:
    return "notification" if state.error else "validation"


def _after_validation(state: FibrionState) -> str:
    return "notification" if state.error else "kpi"


def _after_verification(state: FibrionState) -> str:
    if state.verification_passed:
        return "notification"
    if state.retry_count == 0:
        return "analysis"  # verification_agent already incremented retry_count
    return "notification"  # retried once, still failed - error is already set


def build_graph():
    graph = StateGraph(FibrionState)

    for name, fn in [
        ("ingestion", run_ingestion), ("validation", run_validation), ("kpi", run_kpi),
        ("analysis", run_analysis), ("visualization", run_visualization),
        ("report", run_report), ("verification", run_verification), ("notification", run_notification),
    ]:
        graph.add_node(name, fn)

    graph.add_edge(START, "ingestion")
    graph.add_conditional_edges("ingestion", _after_ingestion, {"validation": "validation", "notification": "notification"})
    graph.add_conditional_edges("validation", _after_validation, {"kpi": "kpi", "notification": "notification"})
    graph.add_edge("kpi", "analysis")
    graph.add_edge("analysis", "visualization")
    graph.add_edge("visualization", "report")
    graph.add_edge("report", "verification")
    graph.add_conditional_edges("verification", _after_verification, {"analysis": "analysis", "notification": "notification"})
    graph.add_edge("notification", END)

    return graph.compile()


fibrion_graph = build_graph()