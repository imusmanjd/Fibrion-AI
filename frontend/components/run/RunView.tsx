"use client";

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
  { key: "ingestion", label: "Ingestion" },
  { key: "validation", label: "Validation" },
  { key: "kpi", label: "KPI Engine" },
  { key: "analysis", label: "AI Analysis" },
  { key: "visualization", label: "Visualization" },
  { key: "report", label: "Report Generation" },
  { key: "verification", label: "Verification" },
  { key: "notification", label: "Notification" },
];

function errorMessage(error: AnalysisRun["error"]) {
  if (!error) {
    return "Fibrion could not complete this analysis.";
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  return JSON.stringify(error);
}

type RunViewProps = {
  runId: string;
  onReset: () => void;
  resetLabel?: string;
};

export default function RunView({
  runId,
  onReset,
  resetLabel = "New analysis",
}: RunViewProps) {
  const [run, setRun] = useState<AnalysisRun | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    setRun(null);
    setLoadError(null);

    async function poll() {
      try {
        const data = await getRun(runId);

        if (cancelled) {
          return;
        }

        setRun(data);
        setLoadError(null);

        if (
          data.status === "completed" ||
          data.status === "failed"
        ) {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      } catch {
        if (!cancelled) {
          setLoadError("Could not reach the Fibrion API.");
        }
      }
    }

    void poll();

    pollRef.current = setInterval(() => {
      void poll();
    }, 2000);

    return () => {
      cancelled = true;

      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [runId]);

  if (!run && !loadError) {
    return (
      <div className="run-loading-screen">
        <div className="run-loading-mark" />
        <span>Starting analysis…</span>
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

  const running =
    run.status === "running" ||
    run.status === "queued";

  const completed = run.status === "completed";
  const failed = run.status === "failed";

  const currentIndex = STAGES.findIndex(
    (stage) => stage.key === run.stage
  );

    return (
    <div className="run-page">
      <span className="eyebrow">
        {running ? "ANALYSIS RUNNING" : completed ? "ANALYSIS COMPLETE" : "ANALYSIS FAILED"}
      </span>
      <h1 className="run-title">{run.filename}</h1>
      <div className="run-title-meta">
        <span>{run.process_type}</span>
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

          <button
            type="button"
            className="button button-secondary download-button"
            onClick={onReset}
          >
            {resetLabel}
          </button>
        </div>
      )}

      {completed && (
        <div className="run-complete-banner">
          <div className="complete-symbol">
            ✓
          </div>

          <div className="complete-copy">
            <strong>Analysis complete</strong>
            <span>{run.message}</span>
          </div>

          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 10,
            }}
          >
            {run.result?.report_path && (
              <a
                href={getReportUrl(run.run_id)}
                target="_blank"
                rel="noreferrer"
                className="button button-secondary"
              >
                Download report
              </a>
            )}

            <button
              type="button"
              className="button button-primary"
              onClick={onReset}
            >
              {resetLabel}
            </button>
          </div>
        </div>
      )}

      {running && (
        <div
          className="run-grid"
          style={{ gridTemplateColumns: "1fr" }}
        >
          <div className="pipeline-panel">
            <div className="panel-heading">
              Pipeline progress
            </div>

            <div className="pipeline-list">
              {STAGES.map((stage, index) => {
                const isDone =
                  currentIndex >= 0 &&
                  index < currentIndex;

                const isRunning =
                  currentIndex >= 0 &&
                  index === currentIndex;

                const stateClass = isDone
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

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(0, run.progress ?? 0)
                  )}%`,
                }}
              />
            </div>

            <span className="progress-value">
              {run.progress}% — {run.message}
            </span>
          </div>
        </div>
      )}

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
    </div>
  );
}