"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { listRuns } from "@/lib/api";
import type { AnalysisRun } from "@/lib/types";
import StatusPill from "@/components/ui/StatusPill";
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

export default function DatasetsPage() {
  const [runs, setRuns] = useState<AnalysisRun[] | null>(null);

  useEffect(() => {
    let active = true;
    listRuns().then((result) => {
      if (active) setRuns(result);
    }).catch(() => {
      if (active) setRuns([]);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">INPUT</span>
          <h1 className="page-title">Datasets</h1>
          <p className="page-description">
            Every file you've uploaded, with its current pipeline
            status — saved to your account.
          </p>
        </div>

        <Link href="/analyze" className="button button-primary">
          Upload dataset
        </Link>
      </div>

      {runs === null ? (
        <p style={{ color: "var(--text-faint)", fontSize: 13 }}>Loading…</p>
      ) : runs.length === 0 ? (
        <EmptyState
          title="No datasets uploaded yet"
          description="Files you upload for analysis will show up here with their live status."
          action={
            <Link href="/analyze" className="button button-secondary">
              Upload your first dataset
            </Link>
          }
        />
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Process</th>
                <th>Status</th>
                <th>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr
                  key={run.run_id}
                  className="is-clickable"
                  onClick={() => (window.location.href = `/analysis/${run.run_id}`)}
                >
                  <td className="cell-primary">{run.filename}</td>
                  <td className="cell-muted">{run.process_type}</td>
                  <td>
                    <StatusPill status={run.status} />
                  </td>
                  <td className="cell-mono">{formatDate(run.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}