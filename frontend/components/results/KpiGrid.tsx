/**
 * frontend/components/results/KpiGrid.tsx
 *
 * Renders `result.kpi_results.overall` as the same hairline-bordered
 * metric grid already used on the Overview page (see .metric-grid /
 * .metric-card in app/globals.css) — deliberately not a new card
 * style, so a completed run reads as an extension of the rest of
 * the app rather than a bolted-on report viewer.
 */

import EmptyState from "@/components/ui/EmptyState";
import { formatKpiValue, humanizeKey } from "./format";

type KpiGridProps = {
  overall: Record<string, unknown> | null | undefined;
};

// Fixed order + short notes for the KPIs weaving.py's compute_kpis
// actually returns under "overall". Anything else present in the
// payload (future process modules may add their own keys) still
// renders, just appended after these in whatever order it arrives.
const KNOWN_KPI_ORDER: { key: string; note?: string }[] = [
  {
    key: "overall_fulfillment_pct",
    note: "Produced vs. required, primary orders only",
  },
  {
    key: "overall_rejection_pct",
    note: "Rejected yardage as a share of production",
  },
  {
    key: "avg_shrink_variance_pct",
    note: "Actual shrink vs. planned allowance",
  },
  {
    key: "total_produced_grey_yds",
  },
  {
    key: "total_required_grey_yds",
  },
];

export default function KpiGrid({ overall }: KpiGridProps) {
  if (!overall || Object.keys(overall).length === 0) {
    return (
      <EmptyState
        title="No KPI data"
        description="This run did not produce KPI results, or KPI computation failed before completion."
      />
    );
  }

  const knownKeys = KNOWN_KPI_ORDER.map((item) => item.key);

  const orderedEntries = [
    ...KNOWN_KPI_ORDER.filter((item) => item.key in overall).map(
      (item) => [item.key, overall[item.key], item.note] as const,
    ),
    ...Object.entries(overall)
      .filter(([key]) => !knownKeys.includes(key))
      .map(([key, value]) => [key, value, undefined] as const),
  ];

  return (
    <div className="metric-grid">
      {orderedEntries.map(([key, value, note]) => (
        <div className="metric-card" key={key}>
          <div className="metric-card-top">
            <span className="metric-label">
              {humanizeKey(key)}
            </span>
          </div>

          <div className="metric-value">
            {formatKpiValue(key, value)}
          </div>

          {note && <p className="metric-note">{note}</p>}
        </div>
      ))}
    </div>
  );
}