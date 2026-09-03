"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { hydrateRuns } from "@/lib/run-cache";
import { getReportUrl } from "@/lib/api";
import type { AnalysisRun } from "@/lib/types";
import EmptyState from "@/components/ui/EmptyState";

function formatDate(value?: string) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function pct(value: unknown) {
  return typeof value === "number" ? `${value.toFixed(1)}%` : "—";
}

export default function ReportsPage() {
  const [runs, setRuns] = useState<AnalysisRun[] | null>(null);

  useEffect(() => {
    let active = true;

    hydrateRuns().then((result) => {
      if (active) {
        setRuns(result);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const reports = (runs ?? []).filter(
    (run) => run.status === "completed" && run.result?.report_path,
  );

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">OUTPUT</span>

          <h1 className="page-title">Reports</h1>

          <p className="page-description">
            Completed analyses from this browser with a generated report
            attached. Same local-session scope as Datasets — this becomes
            a shared history once Phase 2 persistence lands.
          </p>
        </div>
      </div>

      {runs === null ? (
        <p style={{ color: "var(--text-faint)", fontSize: 13 }}>
          Loading…
        </p>
      ) : reports.length === 0 ? (
        <EmptyState
          title="No reports yet"
          description="Reports appear here once an analysis completes successfully."
          action={
            <Link href="/analyze" className="button button-secondary">
              Start an analysis
            </Link>
          }
        />
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Fulfillment</th>
                <th>Rejection</th>
                <th>Completed</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {reports.map((run) => (
                <tr key={run.run_id}>
                  <td className="cell-primary">
                    <Link href={`/analysis/${run.run_id}`}>
                      {run.filename}
                    </Link>
                  </td>

                  <td className="cell-mono">
                    {pct(
                      run.result?.kpi_results?.overall
                        ?.overall_fulfillment_pct,
                    )}
                  </td>

                  <td className="cell-mono">
                    {pct(
                      run.result?.kpi_results?.overall
                        ?.overall_rejection_pct,
                    )}
                  </td>

                  <td className="cell-muted">
                    {formatDate(run.updated_at)}
                  </td>

                  <td>
                    <a
                      href={getReportUrl(run.run_id)}
                      target="_blank"
                      rel="noreferrer"
                      className="button button-secondary"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Download
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}