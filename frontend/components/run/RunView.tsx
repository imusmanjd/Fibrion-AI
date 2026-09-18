"use client";

import { useEffect, useRef, useState } from "react";
import {
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Download,
  Sparkles,
  RefreshCw,
  BarChart3,
  Search,
  MessageSquare,
  ShieldCheck,
  Send,
} from "lucide-react";

import { getRun, getReportUrl } from "@/lib/api";
import type { AnalysisRun } from "@/lib/types";

import KpiGrid from "@/components/results/KpiGrid";
import AnomalyList from "@/components/results/AnomalyList";
import AnalysisNarrative from "@/components/results/AnalysisNarrative";
import ChartGallery from "@/components/results/ChartGallery";
import VerificationPanel from "@/components/results/VerificationPanel";
import DeliveryPanel from "@/components/run/DeliveryPanel";

const STAGES = [
  { key: "ingestion", label: "Ingestion Engine" },
  { key: "validation", label: "Schema Validation" },
  { key: "kpi", label: "KPI Metric Engine" },
  { key: "analysis", label: "AI Analysis Agent" },
  { key: "visualization", label: "Visualization Agent" },
  { key: "report", label: "Report Builder" },
  { key: "verification", label: "Verification Gate" },
  { key: "notification", label: "Dispatch System" },
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
        <span style={{ fontWeight: 600, fontSize: 15 }}>Starting Fibrion pipeline...</span>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="run-loading-screen">
        <AlertTriangle className="w-8 h-8 text-red-500" />
        <span style={{ fontWeight: 500, color: "var(--fault)" }}>{loadError}</span>
        <button type="button" className="button button-secondary" onClick={onReset} style={{ marginTop: 12 }}>
          Back to upload
        </button>
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
        {running ? "ANALYSIS PIPELINE RUNNING" : completed ? "ANALYSIS RUN COMPLETE" : "ANALYSIS RUN FAILED"}
      </span>
      <h1 className="run-title" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span>{run.filename}</span>
      </h1>
      <div className="run-title-meta" style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, textTransform: "uppercase", padding: "3px 9px", background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
          <Cpu className="w-3 h-3" style={{ color: "var(--accent-vivid)" }} />
          <span>{run.process_type}</span>
        </span>
        <span style={{ color: "var(--text-faint)" }}>ID: {run.run_id}</span>
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
            <strong>Orchestration Failure</strong>
            <span>{errorMessage(run.error)}</span>
          </div>

          <button
            type="button"
            className="button button-secondary download-button"
            onClick={onReset}
          >
            <RefreshCw className="w-4 h-4" />
            <span>{resetLabel}</span>
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
              gap: 12,
            }}
          >
            {run.result?.report_path && (
              <a
                href={getReportUrl(run.run_id)}
                target="_blank"
                rel="noreferrer"
                className="button button-secondary"
              >
                <Download className="w-4 h-4" />
                <span>Download Executive PDF</span>
              </a>
            )}

            <button
              type="button"
              className="button button-primary"
              onClick={onReset}
            >
              <Sparkles className="w-4 h-4" />
              <span>{resetLabel}</span>
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
            <div className="panel-heading" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Real-Time Execution Track</span>
            </div>

            <div className="pipeline-list" style={{ marginTop: 12, gap: 4 }}>
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
                      <div className="stage-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span>{stage.label}</span>
                        {isRunning && (
                          <span style={{ fontSize: 10, background: "var(--accent-tint)", border: "1px solid var(--border-accent)", color: "var(--accent-vivid)", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
                            Processing
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="progress-track" style={{ marginTop: 24 }}>
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

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
              <span className="progress-value">
                {run.progress}% Complete — {run.message}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 500 }}>Polling live updates...</span>
            </div>
          </div>
        </div>
      )}

      {completed && run.result && (
        <div className="results-view">
          <section className="results-section" style={{ marginTop: 0 }}>
            <div className="results-section-heading">
              <span>REPORT TRANSMISSION</span>
              <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Send className="w-4.5 h-4.5" style={{ color: "var(--accent-vivid)" }} />
                <span>Multi-Channel Report Dispatch</span>
              </h2>
            </div>
            <DeliveryPanel runId={run.run_id} />
          </section>

          <section className="results-section">
            <div className="results-section-heading">
              <span>KEY PERFORMANCE INDICATORS</span>
              <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <BarChart3 className="w-4.5 h-4.5" style={{ color: "var(--accent-vivid)" }} />
                <span>Computed Loom KPIs</span>
              </h2>
            </div>
            <KpiGrid overall={run.result.kpi_results?.overall} />
          </section>

          <section className="results-section">
            <div className="results-section-heading">
              <span>ANOMALY DETECTION &amp; OUTLIERS</span>
              <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangle className="w-4.5 h-4.5" style={{ color: "var(--accent-vivid)" }} />
                <span>Statistical Deviations Flagged</span>
              </h2>
            </div>

            <AnomalyList
              anomalies={run.result.anomalies}
            />
          </section>

          <section className="results-section">
            <div className="results-section-heading">
              <span>AI AGENT ANALYSIS NARRATIVE</span>
              <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MessageSquare className="w-4.5 h-4.5" style={{ color: "var(--accent-vivid)" }} />
                <span>SaaS Executive Summary &amp; Guidance</span>
              </h2>
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
              <span>VISUALIZATION GALLERY</span>
              <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <BarChart3 className="w-4.5 h-4.5" style={{ color: "var(--accent-vivid)" }} />
                <span>Diagnostic Data Charts</span>
              </h2>
            </div>

            <ChartGallery
              runId={run.run_id}
              chartPaths={run.result.chart_paths}
            />
          </section>

          <section className="results-section">
            <div className="results-section-heading">
              <span>TRUTH SYSTEM VERIFICATION</span>
              <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ShieldCheck className="w-4.5 h-4.5" style={{ color: "var(--accent-vivid)" }} />
                <span>Verification Gate Checklist</span>
              </h2>
            </div>

            <VerificationPanel
              passed={run.result.verification_passed}
              issues={run.result.verification_issues}
              advisoryIssues={run.result.verification_advisory_issues}
            />
          </section>

        </div>
      )}
    </div>
  );
}
