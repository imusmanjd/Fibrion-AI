"""
backend/agents/analysis_agent.py

Writes the narrative summary. Constrained by prompt to only reason
over the KPI numbers it's given - never sees raw rows, never allowed
to invent a figure. Uses the reasoning tier, since this is genuine
analytical writing, not a narrow extraction task like ingestion's
column mapping.
"""

from pydantic import BaseModel, Field

from core.llm_client import call_structured
from core.logging_config import get_agent_logger, run_id_ctx
from core.schema_registry.base import get_process_module
from orchestration.state import FibrionState

logger = get_agent_logger("analysis")


class AnalysisOutput(BaseModel):
    executive_summary: str = Field(description="2-3 sentence high-level summary of this reporting period")
    key_findings: list[str] = Field(description="3-5 findings, each citing a specific number from the given data")
    likely_causes: list[str] = Field(description="Possible explanations grounded in the domain context given - not invented specifics")
    recommendations: list[str] = Field(description="2-4 concrete, actionable recommendations")


def _distribution_summary(by_order: list[dict]) -> dict:
    """Bucket fulfillment_pct into ranges - gives the Analysis Agent
    the actual shape of the distribution as numbers, rather than
    asking it to describe a chart it never sees."""
    primary = [o for o in by_order if not o.get("is_supplementary") and not o.get("is_non_order_material")]
    values = [o["fulfillment_pct"] for o in primary if o.get("fulfillment_pct") is not None]
    if not values:
        return {}
    return {
        "total_orders_analyzed": len(values),
        "buckets": {
            "0-10%": sum(1 for v in values if v < 10),
            "10-90%": sum(1 for v in values if 10 <= v < 90),
            "90-110%": sum(1 for v in values if 90 <= v < 110),
            "110-200%": sum(1 for v in values if 110 <= v < 200),
            "200%+": sum(1 for v in values if v >= 200),
        },
    }

def _full_rejection_orders(by_order: list[dict]) -> list[str]:
    primary = [o for o in by_order if not o.get("is_supplementary") and not o.get("is_non_order_material")]
    return [o["order_id"] for o in primary if o.get("rejection_pct") == 100]

def _format_overall_kpis(overall: dict) -> str:
    labels = {
        "total_produced_grey_yds": "Total Produced (grey fabric, yards)",
        "total_required_grey_yds": "Total Required (grey fabric, yards)",
        "overall_fulfillment_pct": "Overall Fulfillment",
        "overall_rejection_pct": "Overall Rejection Rate",
        "avg_shrink_variance_pct": "Average Shrinkage Variance",
    }
    return "\n".join(
        f"- {label}: {overall[key]:,.2f}" if isinstance(overall.get(key), float) else f"- {label}: {overall.get(key)}"
        for key, label in labels.items() if key in overall
    )

def _build_prompt(state: FibrionState, module, distribution: dict, full_rejection_orders: list[str]) -> str:
    top_anomalies = sorted(state.anomalies, key=lambda a: abs(a["z_score"]), reverse=True)[:8]
    excluded = state.kpi_results.get("excluded_orders", {})
    quality_notes = []
    dup_frac = state.validation_report.get("duplicates", {}).get("fraction", 0)
    if dup_frac > 0.1:
        quality_notes.append(
            f"{dup_frac:.0%} of raw rows were exact duplicates - expected for this kind of "
            f"daily report (forward-filled unchanged records), not a quality problem."
        )
    if excluded.get("count"):
        quality_notes.append(
            f"{excluded['count']} orders had no data available to compute fulfillment and "
            f"were excluded from analysis, not counted as failures."
        )

    return (
        f"You are writing the executive analysis section of a {module.process_name} "
        f"production report. Domain context (general background on this process type - "
        f"NOT a description of what data this specific file contains): {module.domain_context}\n\n"
        f"CRITICAL RULE: only use the numbers given below, and only claim something was "
        f"tracked or is available if it explicitly appears in the data given below. Do "
        f"not assume any capability mentioned in the domain context above is present in "
        f"this run just because it's a normal part of the process in general.\n\n"
        f"Overall KPIs for this period:\n{_format_overall_kpis(state.kpi_results['overall'])}\n\n"
        f"Fulfillment distribution across {distribution.get('total_orders_analyzed', 0)} "
        f"analyzed orders:\n{distribution.get('buckets', {})}\n\n"
        f"""
            IMPORTANT DISTRIBUTION INTERPRETATION RULES:

            The fulfillment distribution is:

            {distribution.get('buckets', {})}

            There are {distribution.get('total_orders_analyzed', 0)} analyzed orders.

            When describing these buckets:

            - Do NOT use "most", "majority", "dominant", or similar words unless
            the corresponding bucket is strictly greater than 50% of analyzed orders.
            - Prefer exact counts and percentages.
            - Do not describe a bucket as "most" merely because it is the largest bucket.
            - If a bucket represents approximately half of the orders, say so explicitly
            using its count and percentage.
            - Do not make qualitative claims that contradict the supplied counts.
        """
        f"Top flagged anomalies (statistical outliers, not necessarily problems - sorted "
        f"by z-score across all metrics):\n{top_anomalies}\n\n"
        f"Verified fact - these are the ONLY orders with exactly 100% rejection, the "
        f"complete list, not a sample: {full_rejection_orders} "
        f"({len(full_rejection_orders)} total). Use this exact list and count for "
        f"100%-rejection orders specifically - do not infer it from the anomaly list "
        f"above, which is sorted by z-score across different metrics and may not "
        f"include every 100%-rejection order.\n\n"
        f"Data quality notes: {quality_notes if quality_notes else 'none'}\n\n"
        f"Write a professional executive summary, key findings that each cite one of the "
        f"numbers given above, likely causes grounded in the domain context, and concrete "
        f"recommendations."
    )

def run_analysis(state: FibrionState) -> dict:
    run_id_ctx.set(state.run_id)
    if state.error or not state.kpi_results:
        logger.warning("Skipping analysis - no KPI results available")
        return {}

    module = get_process_module(state.process_type)
    distribution = _distribution_summary(state.kpi_results.get("by_order", []))
    full_rejection_orders = _full_rejection_orders(state.kpi_results.get("by_order", []))
    prompt = _build_prompt(state, module, distribution, full_rejection_orders)

    result, meta = call_structured(
        tier="reasoning", prompt=prompt, output_schema=AnalysisOutput, max_tokens=2000,
    )
    llm_calls = state.llm_calls + [{"task": "analysis_narrative", **meta}]
    if result is None:
        logger.error(f"Analysis generation failed: {meta}")
        return {"error": {"type": "analysis_generation_failed", "detail": meta}, "llm_calls": llm_calls}

    analysis_text = (
        f"{result.executive_summary}\n\n"
        "Key Findings:\n" + "\n".join(f"- {f}" for f in result.key_findings) + "\n\n"
        "Likely Causes:\n" + "\n".join(f"- {c}" for c in result.likely_causes) + "\n\n"
        "Recommendations:\n" + "\n".join(f"- {r}" for r in result.recommendations)
    )

    logger.info("Analysis generation complete")
    return {
        "analysis_text": analysis_text,
        "analysis_executive_summary": result.executive_summary,
        "analysis_key_findings": result.key_findings,
        "analysis_likely_causes": result.likely_causes,
        "analysis_recommendations": result.recommendations,
    }