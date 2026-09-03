/**
 * frontend/components/results/format.ts
 *
 * Small formatting helpers shared by the run-results components
 * (KpiGrid, AnomalyList, VerificationPanel). Kept separate from
 * lib/api.ts and lib/types.ts because these are display-only
 * concerns, not data-fetching or data-shape concerns.
 */

/** "overall_fulfillment_pct" -> "Overall fulfillment" */
export function humanizeKey(key: string) {
  return key
    .replace(/_pct$/, "")
    .replace(/_yds$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/, (letter) => letter.toUpperCase());
}

/** "order_id" -> "Order", "loom_id" -> "Loom" */
export function humanizeGroupKey(key: string) {
  return key
    .replace(/_id$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/, (letter) => letter.toUpperCase());
}

/** "rejection_pct" -> "Rejection %", "shrink_variance_pct" -> "Shrink variance %" */
export function humanizeMetric(key: string) {
  const isPct = key.endsWith("_pct");

  const base = humanizeKey(key);

  return isPct ? `${base} %` : base;
}

/**
 * Formats a numeric KPI value with a unit suffix inferred from the
 * key name. Returns "—" for null/undefined (the backend deliberately
 * sends null rather than NaN/Infinity for undefined metrics).
 */
export function formatKpiValue(key: string, value: unknown) {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value !== "number") {
    return String(value);
  }

  if (key.endsWith("_pct")) {
    return `${value.toFixed(1)}%`;
  }

  if (key.endsWith("_yds")) {
    return `${Math.round(value).toLocaleString()} yds`;
  }

  return value.toLocaleString();
}

/** Last path segment, so a full server-side chart path becomes a filename. */
export function basename(path: string) {
  return path.split(/[\\/]/).pop() || path;
}