"""
backend/agents/verification_agent.py

Final verification gate before delivery.

Layers:
1. Deterministic structural checks.
2. Deterministic numeric grounding against computed KPI values.
3. Lightweight LLM readability check.

Numeric verification is intentionally conservative: a number must trace
back to a value actually produced by the pipeline or to an explicitly
allowed reporting threshold.

Important:
Numeric ranges such as "0-10%" and "90-110%" are treated as ranges,
not as negative numbers. They are intentionally excluded from numeric
grounding because the individual endpoints are analytical thresholds,
not independently reported KPI values.
"""

import re
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field

from core.llm_client import call_structured
from core.logging_config import get_agent_logger, run_id_ctx
from orchestration.state import FibrionState


logger = get_agent_logger("verification")


# ---------------------------------------------------------------------------
# Patterns
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Numeric ranges
# ---------------------------------------------------------------------------
#
# Examples:
#   0-10%
#   90-110%
#   0 - 10%
#   90 – 110%
#   90 to 110%
#
# These must be removed BEFORE numeric extraction.
#
# Otherwise:
#
#   "90-110%"
#
# can incorrectly become:
#
#   "-110%"
#
# which the verifier then treats as a real negative number.
#
_RANGE_PATTERN = re.compile(
    r"""
    (?<![A-Za-z0-9_])
    -?\d[\d,]*(?:\.\d+)?
    \s*
    (?:
        -
        |
        –
        |
        —
        |
        \bto\b
    )
    \s*
    \d[\d,]*(?:\.\d+)?
    \s*
    %?
    (?![A-Za-z0-9_])
    """,
    re.IGNORECASE | re.VERBOSE,
)


# Numbers that are NOT attached to letters.

_NUMBER_PATTERN = re.compile(
    r"(?<![A-Za-z0-9_])"
    r"-?(?:\d[\d,]*(?:\.\d+)?)"
    r"(?![A-Za-z0-9_])"
)


# Order IDs such as:
#   12345-ABC
#   1001-PO-22

_ORDER_ID_PATTERN = re.compile(
    r"""
    \b
    (?:
        [A-Za-z]{1,10}-\d{3,}(?:-[A-Za-z0-9]+)*
        |
        \d{3,}-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*
        |
        \d{3,}-\d{3,}
    )
    \b
    """,
    re.VERBOSE,
)


# Values written as:
#   3.76 million
#   3.8 million
#   1.25 billion

_SCALED_NUMBER_PATTERN = re.compile(
    r"(?P<value>\d[\d,]*(?:\.\d+)?)\s*"
    r"(?P<scale>million|billion|thousand|m|bn|k)\b",
    re.IGNORECASE,
)


_PERCENT_PATTERN = re.compile(
    r"(?P<value>-?\d[\d,]*(?:\.\d+)?)\s*%"
)


# ---------------------------------------------------------------------------
# Numeric helpers
# ---------------------------------------------------------------------------

def _normalize_number(token: object) -> Optional[float]:
    """Convert a numeric token to float."""
    try:
        return float(str(token).replace(",", "").strip())
    except (ValueError, TypeError):
        return None


def _round_value(value: float) -> float:
    """
    Normalize floating-point noise without destroying useful precision.
    """
    return round(float(value), 4)


def _add_known(known: set[float], value: object) -> None:
    """
    Add a real computed value to the grounding set.

    We store:
      - original value
      - rounded 2-decimal representation
      - rounded whole-number representation

    Only if the value is numeric.
    """
    value = _normalize_number(value)

    if value is None:
        return

    known.add(_round_value(value))
    known.add(_round_value(round(value, 2)))
    known.add(_round_value(round(value, 0)))


def _collect_known_values(state: FibrionState) -> set[float]:
    """
    Collect numeric values that are explicitly produced by the pipeline.

    The verifier must know every legitimate number that the Analysis Agent
    is allowed to report.

    IMPORTANT:
    We only add values that can be traced to state/KPI computation.
    """

    known: set[float] = set()

    kpi_results = state.kpi_results or {}

    # ------------------------------------------------------------------
    # Overall KPIs
    # ------------------------------------------------------------------

    overall = kpi_results.get("overall") or {}

    if isinstance(overall, dict):
        for value in overall.values():
            _add_known(known, value)

    # ------------------------------------------------------------------
    # Derived shortfall
    # ------------------------------------------------------------------

    required = _normalize_number(
        overall.get("total_required_grey_yds")
    )

    produced = _normalize_number(
        overall.get("total_produced_grey_yds")
    )

    if required is not None and produced is not None:
        shortfall = max(required - produced, 0)

        _add_known(known, shortfall)

        # Report-friendly scaled forms
        _add_known(
            known,
            shortfall / 1_000_000,
        )

        _add_known(
            known,
            round(shortfall / 1_000_000, 1),
        )

    # ------------------------------------------------------------------
    # Anomalies
    # ------------------------------------------------------------------

    for anomaly in state.anomalies or []:
        if not isinstance(anomaly, dict):
            continue

        for key in (
            "value",
            "run_mean",
            "z_score",
        ):
            _add_known(
                known,
                anomaly.get(key),
            )

    # ------------------------------------------------------------------
    # Excluded orders
    # ------------------------------------------------------------------

    excluded = kpi_results.get("excluded_orders") or {}

    if isinstance(excluded, dict):
        _add_known(
            known,
            excluded.get("count"),
        )

    # ------------------------------------------------------------------
    # Supplementary / non-order material
    # ------------------------------------------------------------------

    supplementary = (
        kpi_results.get(
            "supplementary_and_non_order_summary"
        )
        or {}
    )

    if isinstance(supplementary, dict):
        _add_known(
            known,
            supplementary.get(
                "supplementary_order_count"
            ),
        )

        _add_known(
            known,
            supplementary.get(
                "non_order_material_count"
            ),
        )

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    validation = state.validation_report or {}

    if isinstance(validation, dict):

        _add_known(
            known,
            validation.get("row_count"),
        )

        duplicates = (
            validation.get("duplicates")
            or {}
        )

        if isinstance(duplicates, dict):

            fraction = _normalize_number(
                duplicates.get("fraction")
            )

            if fraction is not None:
                _add_known(
                    known,
                    fraction * 100,
                )

    # ------------------------------------------------------------------
    # Order-level metrics
    # ------------------------------------------------------------------

    by_order = (
        kpi_results.get("by_order")
        or []
    )

    primary_orders = [
        order
        for order in by_order
        if (
            isinstance(order, dict)
            and not order.get("is_supplementary")
            and not order.get("is_non_order_material")
        )
    ]

    # Total analyzed orders
    total_orders = len(primary_orders)

    _add_known(
        known,
        total_orders,
    )

    # ------------------------------------------------------------------
    # Fulfillment distribution
    #
    # MUST exactly mirror analysis_agent._distribution_summary()
    # ------------------------------------------------------------------

    fulfillment_values = [
        _normalize_number(
            order.get("fulfillment_pct")
        )
        for order in primary_orders
    ]

    fulfillment_values = [
        value
        for value in fulfillment_values
        if value is not None
    ]

    if fulfillment_values:

        bucket_0_10 = sum(
            1
            for value in fulfillment_values
            if value < 10
        )

        bucket_10_90 = sum(
            1
            for value in fulfillment_values
            if 10 <= value < 90
        )

        bucket_90_110 = sum(
            1
            for value in fulfillment_values
            if 90 <= value < 110
        )

        bucket_110_200 = sum(
            1
            for value in fulfillment_values
            if 110 <= value < 200
        )

        bucket_200_plus = sum(
            1
            for value in fulfillment_values
            if value >= 200
        )

        # Add EVERY distribution bucket count.
        for count in (
            bucket_0_10,
            bucket_10_90,
            bucket_90_110,
            bucket_110_200,
            bucket_200_plus,
        ):
            _add_known(
                known,
                count,
            )

        # Distribution percentages if the analysis chooses
        # to express a bucket as a percentage.
        total = len(fulfillment_values)

        if total:
            for count in (
                bucket_0_10,
                bucket_10_90,
                bucket_90_110,
                bucket_110_200,
                bucket_200_plus,
            ):
                _add_known(
                    known,
                    count / total * 100,
                )

        # Explicitly calculated metrics already used by the
        # previous verifier implementation.
        _add_known(
            known,
            bucket_90_110,
        )

        _add_known(
            known,
            bucket_0_10,
        )

        # Fully rejected orders
        fully_rejected_count = sum(
            1
            for order in primary_orders
            if (
                _normalize_number(
                    order.get("rejection_pct")
                ) == 100
            )
        )

        _add_known(
            known,
            fully_rejected_count,
        )

    return known

# ---------------------------------------------------------------------------
# Text preprocessing
# ---------------------------------------------------------------------------

def _prepare_numeric_text(text: str) -> str:
    """
    Prepare report prose for numeric verification.

    Removes:
      1. order IDs
      2. numeric ranges

    Numeric ranges are removed because expressions such as:

        90-110%
        0-10%

    are analytical ranges, not negative numbers.

    This function deliberately does NOT remove standalone negative
    numbers such as:

        -10
        -10.5
        -3%

    Those remain eligible for grounding.
    """
    if not text:
        return ""

    cleaned = _ORDER_ID_PATTERN.sub(
        " ",
        text,
    )

    cleaned = _RANGE_PATTERN.sub(
        " ",
        cleaned,
    )

    return cleaned


# ---------------------------------------------------------------------------
# Numeric extraction
# ---------------------------------------------------------------------------

def _extract_numeric_values(text: str) -> list[float]:
    """
    Extract numeric values from prose.

    Order IDs and numeric ranges are removed before extraction.
    """
    if not text:
        return []

    cleaned = _prepare_numeric_text(text)

    values: list[float] = []

    # --------------------------------------------------------------
    # First extract scaled values such as "3.76 million".
    # --------------------------------------------------------------

    scaled_spans: list[tuple[int, int]] = []

    for match in _SCALED_NUMBER_PATTERN.finditer(
        cleaned
    ):
        raw_value = _normalize_number(
            match.group("value")
        )

        if raw_value is None:
            continue

        scale = match.group(
            "scale"
        ).lower()

        multiplier = {
            "thousand": 1_000,
            "k": 1_000,
            "million": 1_000_000,
            "m": 1_000_000,
            "billion": 1_000_000_000,
            "bn": 1_000_000_000,
        }.get(scale)

        if multiplier:
            values.append(raw_value)
            values.append(
                raw_value * multiplier
            )

        scaled_spans.append(
            match.span()
        )

    # --------------------------------------------------------------
    # Extract percentages.
    # --------------------------------------------------------------

    percent_spans: list[tuple[int, int]] = []

    for match in _PERCENT_PATTERN.finditer(
        cleaned
    ):
        value = _normalize_number(
            match.group("value")
        )

        if value is not None:
            values.append(value)

        percent_spans.append(
            match.span()
        )

    # --------------------------------------------------------------
    # Extract ordinary numbers.
    # --------------------------------------------------------------

    for match in _NUMBER_PATTERN.finditer(
        cleaned
    ):
        start, end = match.span()

        # Don't duplicate numbers already consumed
        # as scaled values.
        if any(
            span_start <= start < span_end
            for span_start, span_end
            in scaled_spans
        ):
            continue

        # Don't duplicate numbers already consumed
        # as percentages.
        if any(
            span_start <= start < span_end
            for span_start, span_end
            in percent_spans
        ):
            continue

        value = _normalize_number(
            match.group(0)
        )

        if value is not None:
            values.append(value)

    return values


# ---------------------------------------------------------------------------
# Numeric grounding
# ---------------------------------------------------------------------------

def _numbers_match(
    value: float,
    known: set[float],
    tolerance: float = 0.05,
) -> bool:
    """
    Match a reported number to a computed pipeline value.

    Uses:
      - absolute tolerance for small values
      - small relative tolerance for large values
    """

    for kv in known:

        diff = abs(
            value - kv
        )

        # Absolute tolerance for small numbers.
        if diff <= tolerance:
            return True

        # Relative tolerance for large values.
        if abs(kv) >= 10000:
            if diff <= max(
                1.0,
                abs(kv) * 0.0005,
            ):
                return True

    return False


def _check_numeric_grounding(
    text: str,
    known: set[float],
) -> list[str]:
    """
    Verify reported numeric values against the pipeline's
    computed values.

    Returns numeric tokens that cannot be grounded.

    Numeric ranges such as:
        0-10%
        90-110%

    are ignored as ranges.
    """

    if not text:
        return []

    cleaned = _prepare_numeric_text(
        text
    )

    suspicious: list[str] = []

    # --------------------------------------------------------------
    # Allowed analytical constants.
    # --------------------------------------------------------------

    allowed_constants = {
        10.0,
        90.0,
        100.0,
        110.0,
        200.0,
    }

    # --------------------------------------------------------------
    # Mark scaled and percentage spans so ordinary-number
    # extraction does not duplicate them.
    # --------------------------------------------------------------

    skip_spans: list[
        tuple[int, int]
    ] = []

    for match in _SCALED_NUMBER_PATTERN.finditer(
        cleaned
    ):
        skip_spans.append(
            match.span()
        )

    for match in _PERCENT_PATTERN.finditer(
        cleaned
    ):
        skip_spans.append(
            match.span()
        )

    # --------------------------------------------------------------
    # Check ordinary numeric tokens.
    # --------------------------------------------------------------

    for match in _NUMBER_PATTERN.finditer(
        cleaned
    ):
        start, end = match.span()

        if any(
            span_start <= start < span_end
            for span_start, span_end
            in skip_spans
        ):
            continue

        token = match.group(0)

        value = _normalize_number(
            token
        )

        if value is None:
            continue

        # Ignore trivial numeric fragments.
        if abs(value) < 1:
            continue

        if value in allowed_constants:
            continue

        if not _numbers_match(
            value,
            known,
        ):
            suspicious.append(
                token
            )

    # --------------------------------------------------------------
    # Check percentages explicitly.
    # --------------------------------------------------------------

    for match in _PERCENT_PATTERN.finditer(
        cleaned
    ):
        raw = match.group(
            "value"
        )

        value = _normalize_number(
            raw
        )

        if value is None:
            continue

        if abs(value) < 1:
            continue

        if value in allowed_constants:
            continue

        if not _numbers_match(
            value,
            known,
        ):
            suspicious.append(
                match.group(0)
            )

    # --------------------------------------------------------------
    # Check scaled numbers explicitly.
    # --------------------------------------------------------------

    for match in _SCALED_NUMBER_PATTERN.finditer(
        cleaned
    ):
        raw = _normalize_number(
            match.group("value")
        )

        if raw is None:
            continue

        scale = match.group(
            "scale"
        ).lower()

        multiplier = {
            "thousand": 1e3,
            "k": 1e3,
            "million": 1e6,
            "m": 1e6,
            "billion": 1e9,
            "bn": 1e9,
        }[scale]

        actual = (
            raw * multiplier
        )

        if not _numbers_match(
            actual,
            known,
        ):
            suspicious.append(
                match.group(0)
            )

    return list(
        dict.fromkeys(
            suspicious
        )
    )


# ---------------------------------------------------------------------------
# Structural verification
# ---------------------------------------------------------------------------

def _check_structural(
    state: FibrionState,
) -> list[str]:

    issues: list[str] = []

    # --------------------------------------------------------------
    # Report PDF
    # --------------------------------------------------------------

    if not state.report_path:
        issues.append(
            "Report PDF path is missing"
        )

    else:
        report_path = Path(
            state.report_path
        )

        if not report_path.exists():
            issues.append(
                "Report PDF file does not exist: "
                f"{report_path}"
            )

        elif not report_path.is_file():
            issues.append(
                "Report path is not a file: "
                f"{report_path}"
            )

        elif report_path.stat().st_size < 1000:
            issues.append(
                "Report PDF file is suspiciously "
                "small - likely empty or malformed"
            )

    # --------------------------------------------------------------
    # Charts
    # --------------------------------------------------------------

    for chart_path in (
        state.chart_paths or []
    ):
        path = Path(
            chart_path
        )

        if not path.exists():
            issues.append(
                f"Chart file missing: {path}"
            )

        elif not path.is_file():
            issues.append(
                f"Chart path is not a file: {path}"
            )

        elif path.stat().st_size == 0:
            issues.append(
                f"Chart file is empty: {path}"
            )

    # --------------------------------------------------------------
    # Required analysis sections
    # --------------------------------------------------------------

    if not state.analysis_executive_summary:
        issues.append(
            "Report is missing its executive summary"
        )

    if not state.analysis_key_findings:
        issues.append(
            "Report is missing its key findings"
        )

    return issues


# ---------------------------------------------------------------------------
# LLM readability check
# ---------------------------------------------------------------------------

class ReadabilityCheck(BaseModel):
    reads_professionally: bool = Field(
        description=(
            "False only when the text contains raw "
            "technical field names, placeholder text, "
            "malformed/incomplete sentences, or genuine "
            "redundancy within one section."
        )
    )

    issues: list[str] = Field(
        description=(
            "Specific readability problems. Empty list "
            "when no problems are found."
        )
    )


def _check_readability(
    state: FibrionState,
) -> tuple[bool, list[str], dict]:

    combined = "\n".join(
        filter(
            None,
            [
                state.analysis_executive_summary,
                *(state.analysis_key_findings or []),
                *(state.analysis_likely_causes or []),
                *(state.analysis_recommendations or []),
            ],
        )
    )

    if not combined:
        return True, [], {}

    prompt = """
Review the following textile production report text.

Mark reads_professionally=false ONLY when there is a genuine writing
quality problem such as:

- raw technical field/variable names leaking into prose
  (example: total_produced_grey_yds)
- placeholder text
- malformed or incomplete sentences
- clearly broken grammar that makes the statement difficult to understand
- genuine repetition of the same specific point within one section
  without adding information

DO NOT flag:

- numbers
- percentages
- order IDs
- technical textile terminology
- repeated headline figures across different report sections
- deliberate repetition of an important KPI in the executive summary,
  findings, causes, or recommendations
- concise bullet-point writing

Return specific issues only when a real problem exists.

REPORT TEXT:
""" + combined

    result, meta = call_structured(
        tier="fast",
        prompt=prompt,
        output_schema=ReadabilityCheck,
        max_tokens=800,
    )

    if result is None:
        logger.warning(
            "Readability check failed; treating as pass: %s",
            meta,
        )

        return True, [], meta

    issues = result.issues or []

    if (
        not result.reads_professionally
        and not issues
    ):
        issues = [
            "LLM readability check found "
            "an unspecified prose issue"
        ]

    return (
        result.reads_professionally,
        issues,
        meta,
    )


# ---------------------------------------------------------------------------
# Main verification agent
# ---------------------------------------------------------------------------

def run_verification(
    state: FibrionState,
) -> dict:

    run_id_ctx.set(
        state.run_id
    )

    if (
        state.error
        or not state.report_path
    ):
        logger.warning(
            "Skipping verification - "
            "no report available"
        )

        return {}

    # --------------------------------------------------------------
    # 1. Deterministic structural checks
    # --------------------------------------------------------------

    structural_issues = (
        _check_structural(state)
    )

    # --------------------------------------------------------------
    # 2. Deterministic numeric grounding
    # --------------------------------------------------------------

    known_values = (
        _collect_known_values(state)
    )

    numeric_issues: list[str] = []

    analysis_sections = [
        state.analysis_executive_summary,
        *(state.analysis_key_findings or []),
        *(state.analysis_likely_causes or []),
        *(state.analysis_recommendations or []),
    ]

    for text in analysis_sections:

        if not text:
            continue

        suspicious = _check_numeric_grounding(
            text,
            known_values,
        )

        if suspicious:
            numeric_issues.append(
                "Ungrounded numbers "
                f"{suspicious} in: "
                f"'{text[:120]}...'"
            )

    # --------------------------------------------------------------
    # 3. LLM readability check
    # --------------------------------------------------------------

    (
        reads_well,
        readability_issues,
        readability_meta,
    ) = _check_readability(
        state
    )

    llm_calls = [
        *(state.llm_calls or []),
        {
            "task": "readability_check",
            **readability_meta,
        },
    ]

    # Only deterministic checks are delivery-blocking.
    #
    # The LLM readability check is advisory. It must never cause
    # regeneration of an otherwise valid report because wording such
    # as "most", "roughly", etc. is a subjective language judgment.

    blocking_issues = (
        numeric_issues
        + structural_issues
    )

    advisory_issues = readability_issues

    passed = not blocking_issues

    if passed:
        if advisory_issues:
            logger.warning(
                "Verification passed with advisory readability issues: %s",
                advisory_issues,
            )
        else:
            logger.info("Verification passed")

        return {
            "verification_passed": True,
            "verification_issues": [],
            "verification_advisory_issues": advisory_issues,
            "llm_calls": llm_calls,
        }

    # --------------------------------------------------------------
    # Verification failure is NON-RETRYABLE.
    #
    # The report has already been generated. Do not regenerate
    # analysis, charts, or the report. Record the issues for
    # debugging and continue to notification.
    # --------------------------------------------------------------

    logger.warning(
        "Verification FAILED - report retained without regeneration: %s",
        blocking_issues,
    )

    return {
        "verification_passed": False,
        "verification_issues": blocking_issues,
        "verification_advisory_issues": advisory_issues,
        "verification_retry_requested": False,
        "llm_calls": llm_calls,
    }