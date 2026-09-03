"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { getRun, getReportUrl } from "@/lib/api";
import type { AnalysisRun } from "@/lib/types";

import KpiGrid from "@/components/results/KpiGrid";
import AnomalyList from "@/components/results/AnomalyList";
import AnalysisNarrative from "@/components/results/AnalysisNarrative";
import ChartGallery from "@/components/results/ChartGallery";
import VerificationPanel from "@/components/results/VerificationPanel";

// Exact stage keys + progress thresholds from backend/orchestration/graph.py's
// STAGES dict — kept in sync with that file, not guessed.
const STAGES = [
  { key: "ingestion", label: "Ingestion", threshold: 12 },
  { key: "validation", label: "Validation", threshold: 28 },
  { key: "kpi", label: "KPI Engine", threshold: 45 },
  { key: "analysis", label: "AI Analysis", threshold: 62 },
  { key: "visualization", label: "Visualization", threshold: 75 },
  { key: "report", label: "Report Generation", threshold: 86 },
  { key: "verification", label: "Verification", threshold: 94 },
  { key: "notification", label: "Notification", threshold: 98 },
];

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

function errorMessage(error: AnalysisRun["error"]) {
  if (!error) return "Fibrion could not complete this analysis.";

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return JSON.stringify(error);
}

export default function RunDetailPage() {
  const params = useParams<{ runId: string }>();
  const runId = params.runId;

  const [run, setRun] = useState<AnalysisRun | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const data = await getRun(runId);

        if (cancelled) return;

        setRun(data);
        setLoadError(null);

        if (data.status === "completed" || data.status === "failed") {
          if (pollRef.current) {
            clearInterval(pollRef.current);
          }
        }
      } catch {
        if (!cancelled) {
          setLoadError("Could not reach the Fibrion API.");
        }
      }
    }

    poll();
    pollRef.current = setInterval(poll, 2000);

    return () => {
      cancelled = true;

      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [runId]);

  if (!run && !loadError) {
    return (
      <div className="run-loading-screen">
        <div className="run-loading-mark" />
        <span>Loading run…</span>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="run-loading-screen">
        <span>{loadError}</span>
      </div>
    );
  }

  const running = run.status === "running" || run.status === "queued";
  const completed = run.status === "completed";
  const failed = run.status === "failed";

  const currentIndex = STAGES.findIndex(
    (stage) => stage.key === run.stage,
  );

  return (
    <div className="run-page">
      <div className="run-topbar">
        <Link href="/datasets" className="run-breadcrumb">
          ← Back to datasets
        </Link>
      </div>

      <span className="run-eyebrow">
        RUN {run.run_id.slice(0, 8)}
      </span>

      <h1 className="run-title">{run.filename}</h1>

      <div className="run-title-meta">
        <span>{run.process_type}</span>
        <span>·</span>
        <span>Started {formatDate(run.created_at)}</span>
      </div>

      {failed && (
        <div className="run-error-banner">
          <div
            className="complete-symbol"
            style={{ background: "var(--fault)" }}
          >
            !
          </div>

          <div className="complete-copy">
            <strong>Analysis failed</strong>
            <span>{errorMessage(run.error)}</span>
          </div>
        </div>
      )}

      {completed && (
        <div className="run-complete-banner">
          <div className="complete-symbol">✓</div>

          <div className="complete-copy">
            <strong>Analysis complete</strong>
            <span>{run.message}</span>
          </div>

          {run.result?.report_path && (
            <a
              href={getReportUrl(run.run_id)}
              target="_blank"
              rel="noreferrer"
              className="button button-secondary download-button"
            >
              Download report
            </a>
          )}
        </div>
      )}

      <div className="run-grid">
        <div className="pipeline-panel">
          <div className="panel-heading">Pipeline progress</div>

          <div className="pipeline-list">
            {STAGES.map((stage, index) => {
              const isDone =
                completed ||
                index < currentIndex ||
                (index === currentIndex && !running && !failed);

              const isRunning =
                running && index === currentIndex;

              const isError =
                failed && index === currentIndex;

              const stateClass = isError
                ? "stage-error"
                : isDone
                  ? "stage-done"
                  : isRunning
                    ? "stage-running"
                    : "";

              return (
                <div
                  className={`stage-line-column ${stateClass}`}
                  key={stage.key}
                >
                  <div className="stage-marker">
                    <div className="stage-dot">
                      {isDone
                        ? "✓"
                        : isError
                          ? "!"
                          : String(index + 1).padStart(2, "0")}
                    </div>
                  </div>

                  <div className="stage-content">
                    <div className="stage-title">
                      {stage.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {running && (
            <>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${run.progress}%` }}
                />
              </div>

              <span className="progress-value">
                {run.progress}% — {run.message}
              </span>
            </>
          )}
        </div>

        <div className="run-details">
          <div className="details-block">
            <div className="detail-row">
              <span>Status</span>
              <span>{run.status}</span>
            </div>

            <div className="detail-row">
              <span>Process</span>
              <span>{run.process_type}</span>
            </div>

            <div className="detail-row">
              <span>Updated</span>
              <span>{formatDate(run.updated_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {completed && run.result && (
        <div className="results-view">
          <section className="results-section">
            <div className="results-section-heading">
              <span>KEY PERFORMANCE INDICATORS</span>
              <h2>Production KPIs</h2>
            </div>

            <KpiGrid
              overall={run.result.kpi_results?.overall}
            />
          </section>

          <section className="results-section">
            <div className="results-section-heading">
              <span>ANOMALY DETECTION</span>
              <h2>Flagged anomalies</h2>
            </div>

            <AnomalyList
              anomalies={run.result.anomalies}
            />
          </section>

          <section className="results-section">
            <div className="results-section-heading">
              <span>AI ANALYSIS</span>
              <h2>Findings &amp; recommendations</h2>
            </div>

            <AnalysisNarrative
              executiveSummary={
                run.result.analysis_executive_summary
              }
              keyFindings={
                run.result.analysis_key_findings
              }
              likelyCauses={
                run.result.analysis_likely_causes
              }
              recommendations={
                run.result.analysis_recommendations
              }
            />
          </section>

          <section className="results-section">
            <div className="results-section-heading">
              <span>VISUALIZATION</span>
              <h2>Generated charts</h2>
            </div>

            <ChartGallery
              runId={run.run_id}
              chartPaths={run.result.chart_paths}
            />
          </section>

          <section className="results-section">
            <div className="results-section-heading">
              <span>QUALITY GATE</span>
              <h2>Verification detail</h2>
            </div>

            <VerificationPanel
              passed={run.result.verification_passed}
              issues={run.result.verification_issues}
              advisoryIssues={
                run.result.verification_advisory_issues
              }
            />
          </section>
        </div>
      )}

      <div className="run-footer">
        <span
          style={{
            color: "var(--text-faint)",
            fontSize: 12,
          }}
        >
          Fibrion · run {run.run_id}
        </span>

        <Link
          href="/analyze"
          className="button button-secondary"
        >
          New analysis
        </Link>
      </div>
    </div>
  );
}