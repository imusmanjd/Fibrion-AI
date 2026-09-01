"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type RunState = {
  run_id?: string;
  status?: string;
  stage?: string;
  progress?: number;
  message?: string;
  error?: unknown;
  report_path?: string;
  chart_paths?: string[];
  verification_passed?: boolean;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:8000";

const stages = [
  {
    key: "ingestion",
    label: "Ingestion",
    description: "Read and normalize",
  },
  {
    key: "validation",
    label: "Validation",
    description: "Check data quality",
  },
  {
    key: "kpi",
    label: "KPI computation",
    description: "Calculate metrics",
  },
  {
    key: "analysis",
    label: "Analysis",
    description: "Find patterns and causes",
  },
  {
    key: "visualization",
    label: "Visualization",
    description: "Build analytical charts",
  },
  {
    key: "report",
    label: "Report",
    description: "Prepare management report",
  },
  {
    key: "verification",
    label: "Verification",
    description: "Check analytical consistency",
  },
  {
    key: "notification",
    label: "Delivery",
    description: "Prepare requested outputs",
  },
];

export default function AnalysisRunPage() {
  const params = useParams();

  const runId = String(
    params?.run_id ?? "",
  );

  const [run, setRun] = useState<RunState | null>(null);
  const [requestError, setRequestError] = useState("");
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (!runId) {
      return;
    }

    let cancelled = false;

    async function fetchRun() {
      try {
        const response = await fetch(
          `${API_URL}/runs/${runId}`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(
            `Unable to read run status (${response.status}).`,
          );
        }

        const data = await response.json();

        if (!cancelled) {
          setRun(data);
          setRequestError("");

          const terminal =
            data?.status === "completed" ||
            data?.status === "failed" ||
            Boolean(data?.error);

          if (terminal) {
            setPolling(false);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setRequestError(
            error instanceof Error
              ? error.message
              : "Unable to read analysis status.",
          );
        }
      }
    }

    fetchRun();

    const interval = window.setInterval(
      fetchRun,
      1500,
    );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [runId]);

  const currentStageIndex = useMemo(() => {
    if (!run?.stage) {
      return -1;
    }

    return stages.findIndex(
      (stage) => stage.key === run.stage,
    );
  }, [run?.stage]);

  const completed =
    run?.status === "completed";

  const failed =
    run?.status === "failed" ||
    Boolean(run?.error);

  return (
    <div className="page analysis-run-page">
      {/* ----------------------------------------------------------
          Header
      ----------------------------------------------------------- */}

      <section className="run-heading">
        <div>
          <div className="eyebrow">
            Analysis run
          </div>

          <h1 className="page-title">
            {completed
              ? "Analysis complete."
              : failed
                ? "Analysis stopped."
                : "Analysis in progress."}
          </h1>

          <p className="page-description">
            {run?.message ??
              "Fibrion is processing your production dataset."}
          </p>
        </div>

        <div
          className={`run-status-badge ${
            completed
              ? "run-status-success"
              : failed
                ? "run-status-failed"
                : "run-status-running"
          }`}
        >
          <span />
          {completed
            ? "Completed"
            : failed
              ? "Failed"
              : "Running"}
        </div>
      </section>

      {/* ----------------------------------------------------------
          Main progress area
      ----------------------------------------------------------- */}

      <section className="run-layout">
        <div className="run-main-card">
          <div className="run-main-top">
            <div>
              <div className="eyebrow">
                Pipeline execution
              </div>

              <h2>
                {run?.stage
                  ? formatStage(run.stage)
                  : "Preparing pipeline"}
              </h2>
            </div>

            <div className="run-progress-number">
              {Math.round(run?.progress ?? 0)}
              <span>%</span>
            </div>
          </div>

          <div className="run-progress-track">
            <div
              className="run-progress-fill"
              style={{
                width: `${Math.max(
                  0,
                  Math.min(
                    100,
                    run?.progress ?? 0,
                  ),
                )}%`,
              }}
            />
          </div>

          <div className="run-message">
            {run?.message ??
              "Waiting for the first pipeline update."}
          </div>

          {requestError && (
            <div className="run-request-warning">
              {requestError}
            </div>
          )}

          <div className="run-stage-list">
            {stages.map((stage, index) => {
              const isCurrent =
                stage.key === run?.stage;

              const isComplete =
                currentStageIndex > index ||
                completed;

              return (
                <div
                  key={stage.key}
                  className={`run-stage ${
                    isCurrent
                      ? "run-stage-current"
                      : ""
                  } ${
                    isComplete
                      ? "run-stage-complete"
                      : ""
                  }`}
                >
                  <div className="run-stage-marker">
                    {isComplete
                      ? "✓"
                      : String(index + 1).padStart(
                          2,
                          "0",
                        )}
                  </div>

                  <div className="run-stage-copy">
                    <div className="run-stage-title">
                      {stage.label}
                    </div>

                    <div className="run-stage-description">
                      {stage.description}
                    </div>
                  </div>

                  <div className="run-stage-state">
                    {isComplete
                      ? "Complete"
                      : isCurrent
                        ? "Running"
                        : "Queued"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* --------------------------------------------------------
            Run information
        --------------------------------------------------------- */}

        <aside className="run-side">
          <div className="run-side-card">
            <div className="eyebrow">
              Run information
            </div>

            <div className="run-info-list">
              <InfoRow
                label="Run ID"
                value={runId}
                mono
              />

              <InfoRow
                label="Current stage"
                value={
                  run?.stage
                    ? formatStage(run.stage)
                    : "—"
                }
              />

              <InfoRow
                label="Progress"
                value={`${Math.round(
                  run?.progress ?? 0,
                )}%`}
                mono
              />

              <InfoRow
                label="Verification"
                value={
                  run?.verification_passed === true
                    ? "Passed"
                    : run?.verification_passed ===
                        false
                      ? "Issues logged"
                      : "Pending"
                }
              />
            </div>
          </div>

          <div className="run-side-note">
            <div className="run-side-note-label">
              Execution model
            </div>

            <p>
              Fibrion runs the analytical pipeline once. Verification
              is a final quality gate; verification findings are
              recorded for engineering review rather than causing
              the complete pipeline to regenerate.
            </p>
          </div>
        </aside>
      </section>

      {/* ----------------------------------------------------------
          Completion
      ----------------------------------------------------------- */}

      {completed && (
        <section className="run-complete-card">
          <div className="run-complete-mark">
            ✓
          </div>

          <div>
            <div className="eyebrow">
              Output ready
            </div>

            <h2>
              Your analysis has finished.
            </h2>

            <p>
              Fibrion completed the production pipeline and prepared
              the requested analytical outputs.
            </p>
          </div>

          <div className="run-complete-actions">
            {run?.report_path && (
              <a
                href={`${API_URL}/runs/${runId}/report`}
                className="button button-primary"
              >
                Open report
              </a>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="run-info-row">
      <span>{label}</span>

      <strong
        className={mono ? "run-info-mono" : ""}
      >
        {value}
      </strong>
    </div>
  );
}

function formatStage(stage: string) {
  const match = stages.find(
    (item) => item.key === stage,
  );

  return (
    match?.label ??
    stage
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) =>
        char.toUpperCase(),
      )
  );
}