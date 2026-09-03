"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { hydrateRuns } from "@/lib/run-cache";
import type { AnalysisRun } from "@/lib/types";
import EmptyState from "@/components/ui/EmptyState";

const PIPELINE = [
  { key: "ingestion", label: "Ingestion", note: "Reads and prepares the uploaded dataset." },
  { key: "validation", label: "Validation", note: "Checks data quality and structure before anything is trusted." },
  { key: "kpi", label: "KPI Engine", note: "Computes fulfillment, rejection, and shrink-variance metrics." },
  { key: "analysis", label: "AI Analysis", note: "Drafts findings, likely causes, and recommendations." },
  { key: "visualization", label: "Visualization", note: "Builds the charts attached to the run." },
  { key: "report", label: "Report Generation", note: "Assembles the management-ready PDF." },
  { key: "verification", label: "Verification", note: "Re-checks the analysis against the source numbers before release." },
  { key: "notification", label: "Notification", note: "Delivers the report to the requested channels." },
];

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export default function OverviewPage() {
  const [runs, setRuns] = useState<AnalysisRun[] | null>(null);

  useEffect(() => {
    let active = true;

    hydrateRuns().then((result) => {
      if (active) setRuns(result);
    });

    return () => {
      active = false;
    };
  }, []);

  const completed = (runs ?? []).filter((run) => run.status === "completed");
  const fulfillment = average(
    completed
      .map((run) => run.result?.kpi_results?.overall?.overall_fulfillment_pct)
      .filter((value): value is number => typeof value === "number"),
  );
  const rejection = average(
    completed
      .map((run) => run.result?.kpi_results?.overall?.overall_rejection_pct)
      .filter((value): value is number => typeof value === "number"),
  );
  const anomalyCount = completed.reduce(
    (sum, run) => sum + (run.result?.anomalies?.length ?? 0),
    0,
  );

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">PRODUCTION INTELLIGENCE — WEAVING</span>
          <h1 className="page-title">
            See every yard before it leaves the loom.
          </h1>
          <p className="page-description">
            Fibrion runs an 8-agent pipeline over your production data —
            ingestion through verified reporting — and flags what needs a
            second look before it reaches a customer.
          </p>
        </div>

        <Link href="/analyze" className="button button-primary button-large">
          Start new analysis
        </Link>
      </div>

      <section className="section-block">
        <div className="section-header-row">
          <div>
            <h2 className="section-title">This session</h2>
            <p className="section-description">
              Aggregated from runs started in this browser. Fibrion's
              current backend is in-memory with no shared history yet —
              this is a live view, not a database.
            </p>
          </div>
        </div>

        {runs === null ? (
          <div className="metric-grid">
            {[0, 1, 2].map((i) => (
              <div className="metric-card" key={i}>
                <div className="metric-label">—</div>
              </div>
            ))}
          </div>
        ) : completed.length === 0 ? (
          <EmptyState
            title="No completed runs yet"
            description="Once an analysis finishes, its fulfillment, rejection, and anomaly counts will roll up here."
            action={
              <Link href="/analyze" className="button button-secondary">
                Run your first analysis
              </Link>
            }
          />
        ) : (
          <div className="metric-grid">
            <div className="metric-card">
              <div className="metric-card-top">
                <span className="metric-label">Avg. fulfillment</span>
              </div>
              <div className="metric-value">
                {fulfillment !== null ? `${fulfillment.toFixed(1)}%` : "—"}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-card-top">
                <span className="metric-label">Avg. rejection</span>
              </div>
              <div className="metric-value">
                {rejection !== null ? `${rejection.toFixed(1)}%` : "—"}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-card-top">
                <span className="metric-label">Anomalies flagged</span>
              </div>
              <div className="metric-value">{anomalyCount}</div>
            </div>

            <div className="metric-card">
              <div className="metric-card-top">
                <span className="metric-label">Runs completed</span>
              </div>
              <div className="metric-value">{completed.length}</div>
            </div>
          </div>
        )}
      </section>

      <section className="section-block">
        <div className="section-header-row">
          <div>
            <h2 className="section-title">The pipeline</h2>
            <p className="section-description">
              Every upload runs through the same eight agents, in order.
            </p>
          </div>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <tbody>
              {PIPELINE.map((stage, index) => (
                <tr key={stage.key}>
                  <td className="cell-mono" style={{ width: 40 }}>
                    {String(index + 1).padStart(2, "0")}
                  </td>
                  <td className="cell-primary" style={{ width: 200 }}>
                    {stage.label}
                  </td>
                  <td className="cell-muted">{stage.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}