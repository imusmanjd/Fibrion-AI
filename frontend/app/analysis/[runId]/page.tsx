"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import {
  getReportUrl,
  getRun,
} from "@/lib/api";

import type {
  AnalysisRun,
} from "@/lib/types";

const stages = [
  "ingestion",
  "validation",
  "kpi",
  "analysis",
  "visualization",
  "report",
  "verification",
  "notification",
];

export default function AnalysisPage() {
  const params = useParams();
  const runId = String(params.runId);

  const [run, setRun] =
    useState<AnalysisRun | null>(null);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const result = await getRun(runId);

        if (!cancelled) {
          setRun(result);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to retrieve analysis.",
          );
        }
      }
    }

    poll();

    const interval = window.setInterval(
      poll,
      1500,
    );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [runId]);

  if (error) {
    return (
      <div className="page">
        <div className="card empty">
          {error}
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="page">
        <div className="card empty">
          Loading Fibrion analysis...
        </div>
      </div>
    );
  }

  const finished =
    run.status === "completed";

  return (
    <div className="page">
      <div className="analysis-header">
        <div>
          <div className="eyebrow">
            Analysis run
          </div>

          <h1 className="page-title">
            {finished
              ? "Analysis complete."
              : "Fibrion is working."}
          </h1>

          <p className="page-description">
            {run.message}
          </p>

          <div
            className="analysis-id"
            style={{ marginTop: 10 }}
          >
            RUN {run.run_id.slice(0, 8).toUpperCase()}
            {" · "}
            {run.filename}
          </div>
        </div>

        <div>
          <span
            className={`badge ${
              run.status === "completed"
                ? "badge-success"
                : run.status === "failed"
                  ? "badge-danger"
                  : "badge-warning"
            }`}
          >
            {run.status}
          </span>
        </div>
      </div>

      <section className="section">
        <div className="grid grid-2">
          <div className="card pipeline">
            <div className="section-head">
              <div>
                <h2 className="section-title">
                  Fibrion engine
                </h2>

                <div className="section-meta">
                  Live pipeline status
                </div>
              </div>
            </div>

            {stages.map((stage) => {
              const data =
                run.stages?.[stage];

              const status =
                data?.status || "pending";

              return (
                <div
                  className="pipeline-stage"
                  key={stage}
                >
                  <div
                    className={`stage-dot ${
                      status === "completed"
                        ? "done"
                        : status === "running"
                          ? "running"
                          : ""
                    }`}
                  >
                    {status === "completed"
                      ? "✓"
                      : status === "running"
                        ? "●"
                        : ""}
                  </div>

                  <div>
                    <div className="stage-name">
                      {data?.label || stage}
                    </div>

                    {status ===
                      "running" && (
                      <div className="stage-message">
                        {run.message}
                      </div>
                    )}
                  </div>

                  <div className="stage-status">
                    {status}
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <div className="activity">
              <div className="activity-label">
                Current activity
              </div>

              <div className="activity-message">
                {run.message}
              </div>

              <div
                style={{
                  marginTop: 24,
                  color: "#7d8c85",
                  fontFamily:
                    '"DM Mono", monospace',
                  fontSize: 10,
                }}
              >
                {run.current_stage_label}
              </div>
            </div>

            {finished && (
              <div
                className="card card-pad"
                style={{ marginTop: 14 }}
              >
                <div className="eyebrow">
                  Report
                </div>

                <h2 className="section-title">
                  Your verified report is ready.
                </h2>

                <p className="page-description">
                  Download the PDF or continue into
                  the analysis workspace.
                </p>

                <div
                  className="action-row"
                  style={{ marginTop: 18 }}
                >
                  <a
                    href={getReportUrl(runId)}
                    className="button button-primary"
                  >
                    Download PDF ↓
                  </a>

                  <Link
                    href={`/analysis/${runId}#results`}
                    className="button button-secondary"
                  >
                    View results
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {finished && (
        <section
          className="section"
          id="results"
        >
          <div className="section-head">
            <div>
              <div className="eyebrow">
                Intelligence
              </div>

              <h2 className="section-title">
                Analysis results
              </h2>
            </div>

            {run.result?.verification_passed && (
              <span className="badge badge-success">
                Verified
              </span>
            )}
          </div>

          <div className="card card-pad">
            <div className="eyebrow">
              Executive summary
            </div>

            <p
              style={{
                fontSize: 17,
                lineHeight: 1.6,
                maxWidth: 850,
              }}
            >
              {run.result
                ?.analysis_executive_summary ||
                "No executive summary was returned."}
            </p>
          </div>

          <div className="grid grid-2 section">
            <div className="card card-pad">
              <div className="eyebrow">
                Key findings
              </div>

              <ul>
                {(
                  run.result
                    ?.analysis_key_findings || []
                ).map((item, index) => (
                  <li key={index}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card card-pad">
              <div className="eyebrow">
                Recommendations
              </div>

              <ul>
                {(
                  run.result
                    ?.analysis_recommendations || []
                ).map((item, index) => (
                  <li key={index}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="section">
            <div className="activity">
              <div className="activity-label">
                Ask Fibrion
              </div>

              <div className="activity-message">
                Dataset-specific questions are coming
                next. This panel will use the verified
                analysis run rather than acting as a
                generic chatbot.
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}