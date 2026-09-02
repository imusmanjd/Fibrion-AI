"use client";

import {
  Activity,
  ArrowLeft,
  Check,
  Circle,
  Clock3,
  Database,
  FileBarChart3,
  FileCheck2,
  FileOutput,
  Loader2,
  ShieldCheck,
  Sparkles,
  X,
  AlertTriangle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

type RunStatus = {
  run_id?: string;
  status?: string;
  stage?: string;
  process_type?: string;
  filename?: string;
  error?: string | null;
  created_at?: string;
  completed_at?: string;
  [key: string]: unknown;
};

const STAGES = [
  {
    key: "ingestion",
    label: "Ingestion",
    description: "Reading and normalizing production data",
    icon: Database,
  },
  {
    key: "validation",
    label: "Validation",
    description: "Checking dataset structure and quality",
    icon: FileCheck2,
  },
  {
    key: "kpi",
    label: "KPI computation",
    description: "Calculating production performance metrics",
    icon: Activity,
  },
  {
    key: "analysis",
    label: "Analysis",
    description: "Generating operational findings",
    icon: Sparkles,
  },
  {
    key: "visualization",
    label: "Visualization",
    description: "Building analytical visualizations",
    icon: FileBarChart3,
  },
  {
    key: "report",
    label: "Report",
    description: "Assembling the management report",
    icon: FileOutput,
  },
  {
    key: "verification",
    label: "Verification",
    description: "Checking outputs before delivery",
    icon: ShieldCheck,
  },
];

function normalizeStage(value?: string) {
  if (!value) return "";

  return value
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace("kpi_computation", "kpi")
    .replace("kpi_computing", "kpi")
    .replace("visualisation", "visualization");
}

function stageIndex(stage?: string) {
  const normalized = normalizeStage(stage);

  return STAGES.findIndex((item) => item.key === normalized);
}

function isSuccessful(status?: string) {
  const value = status?.toLowerCase();

  return (
    value === "completed" ||
    value === "complete" ||
    value === "success" ||
    value === "succeeded" ||
    value === "done"
  );
}

function isFailed(status?: string, error?: string | null) {
  const value = status?.toLowerCase();

  return (
    Boolean(error) ||
    value === "failed" ||
    value === "error"
  );
}

function formatElapsed(start?: string, end?: string) {
  if (!start) return "—";

  const started = new Date(start).getTime();

  if (Number.isNaN(started)) return "—";

  const finished = end
    ? new Date(end).getTime()
    : Date.now();

  const seconds = Math.max(
    0,
    Math.floor((finished - started) / 1000),
  );

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return `${minutes}m ${remainder}s`;
}

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function AnalysisRunPage() {
  const params = useParams();
  const router = useRouter();

  const runId = String(params.runId);

  const [run, setRun] = useState<RunStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function fetchRun() {
      try {
        const response = await fetch(
          `${API_URL}/runs/${encodeURIComponent(runId)}`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(
            `Unable to retrieve run status (${response.status}).`,
          );
        }

        const data = await response.json();

        if (!cancelled) {
          setRun(data);
          setRequestError("");
          setLoading(false);
        }

        const finished =
          isSuccessful(data?.status) ||
          isFailed(data?.status, data?.error);

        if (!finished && !cancelled) {
          timer = setTimeout(fetchRun, 1200);
        }
      } catch (error) {
        if (cancelled) return;

        setRequestError(
          error instanceof Error
            ? error.message
            : "Unable to retrieve run status.",
        );

        setLoading(false);

        timer = setTimeout(fetchRun, 2500);
      }
    }

    fetchRun();

    return () => {
      cancelled = true;

      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [runId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const currentIndex = useMemo(
    () => stageIndex(run?.stage),
    [run?.stage],
  );

  const completed =
    isSuccessful(run?.status);

  const failed =
    isFailed(run?.status, run?.error);

  const currentStage =
    currentIndex >= 0
      ? STAGES[currentIndex]
      : null;

  const elapsed = run
    ? formatElapsed(
        run.created_at,
        run.completed_at,
      )
    : "—";

  // Keep the live timer reactive while a run is active.
  const liveElapsed = run?.created_at
    ? formatElapsed(
        run.created_at,
        completed || failed
          ? run.completed_at
          : new Date(now).toISOString(),
      )
    : elapsed;

  if (loading && !run) {
    return (
      <main className="run-page">
        <div className="run-loading">
          <Loader2
            size={21}
            className="run-loading-spinner"
          />

          <div>
            <strong>Connecting to run</strong>
            <span>
              Retrieving the current pipeline state…
            </span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="run-page">
      {/* Header */}

      <header className="run-header">
        <button
          type="button"
          className="run-back"
          onClick={() => router.push("/analyze")}
        >
          <ArrowLeft size={16} />
          New analysis
        </button>

        <div className="run-header-main">
          <div>
            <div className="run-kicker">
              <span
                className={
                  completed
                    ? "run-state-dot complete"
                    : failed
                      ? "run-state-dot failed"
                      : "run-state-dot active"
                }
              />

              {completed
                ? "Analysis complete"
                : failed
                  ? "Analysis failed"
                  : "Analysis in progress"}
            </div>

            <h1>
              {run?.filename ??
                "Production analysis"}
            </h1>

            <p>
              Run ID{" "}
              <code>{runId}</code>
            </p>
          </div>

          <div className="run-header-actions">
            <div className="run-stat">
              <span>PROCESS</span>
              <strong>
                {run?.process_type
                  ? String(run.process_type)
                      .replaceAll("_", " ")
                      .replace(
                        /\b\w/g,
                        (letter) =>
                          letter.toUpperCase(),
                      )
                  : "—"}
              </strong>
            </div>

            <div className="run-stat">
              <span>ELAPSED</span>
              <strong>{liveElapsed}</strong>
            </div>
          </div>
        </div>
      </header>

      {/* Request error */}

      {requestError && (
        <div className="run-request-warning">
          <AlertTriangle size={16} />

          <span>{requestError}</span>

          <button
            type="button"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      )}

      {/* Main execution area */}

      <div className="run-layout">
        <section className="run-console">
          {/* Current operation */}

          <div className="current-operation">
            <div className="operation-visual">
              {failed ? (
                <div className="operation-failed">
                  <X size={24} />
                </div>
              ) : completed ? (
                <div className="operation-complete">
                  <Check size={24} />
                </div>
              ) : (
                <div className="operation-active">
                  <Loader2
                    size={24}
                    className="operation-spinner"
                  />
                </div>
              )}
            </div>

            <div className="operation-copy">
              <span className="section-label">
                CURRENT OPERATION
              </span>

              <h2>
                {failed
                  ? "Pipeline stopped"
                  : completed
                    ? "Analysis ready"
                    : currentStage?.label ??
                      "Initializing pipeline"}
              </h2>

              <p>
                {failed
                  ? run?.error ??
                    "The pipeline encountered an error."
                  : completed
                    ? "All required pipeline stages have completed successfully."
                    : currentStage?.description ??
                      "Preparing the production dataset for analysis."}
              </p>
            </div>

            <div className="operation-state">
              {completed ? (
                <span className="state-pill success">
                  <Check size={13} />
                  Complete
                </span>
              ) : failed ? (
                <span className="state-pill error">
                  <X size={13} />
                  Failed
                </span>
              ) : (
                <span className="state-pill running">
                  <span />
                  Running
                </span>
              )}
            </div>
          </div>

          {/* Timeline */}

          <div className="stage-section">
            <div className="stage-section-header">
              <div>
                <span className="section-label">
                  PIPELINE
                </span>

                <h2>Execution stages</h2>
              </div>

              <span className="stage-count">
                {completed
                  ? `${STAGES.length}/${STAGES.length}`
                  : currentIndex >= 0
                    ? `${Math.min(
                        currentIndex,
                        STAGES.length,
                      )}/${STAGES.length}`
                    : `0/${STAGES.length}`}
              </span>
            </div>

            <div className="stage-list">
              {STAGES.map((stage, index) => {
                const Icon = stage.icon;

                const stageCompleted =
                  completed ||
                  (!failed &&
                    currentIndex > index);

                const stageCurrent =
                  !completed &&
                  !failed &&
                  currentIndex === index;

                const stageFailed =
                  failed &&
                  currentIndex === index;

                return (
                  <div
                    className={`stage-row ${
                      stageCompleted
                        ? "completed"
                        : ""
                    } ${
                      stageCurrent
                        ? "current"
                        : ""
                    } ${
                      stageFailed
                        ? "failed"
                        : ""
                    }`}
                    key={stage.key}
                  >
                    <div className="stage-marker-column">
                      <div className="stage-marker">
                        {stageCompleted ? (
                          <Check size={14} />
                        ) : stageFailed ? (
                          <X size={14} />
                        ) : stageCurrent ? (
                          <Loader2
                            size={14}
                            className="stage-spinner"
                          />
                        ) : (
                          <Circle
                            size={8}
                            fill="currentColor"
                          />
                        )}
                      </div>

                      {index <
                        STAGES.length - 1 && (
                        <div
                          className={`stage-connector ${
                            stageCompleted
                              ? "filled"
                              : ""
                          }`}
                        />
                      )}
                    </div>

                    <div className="stage-icon">
                      <Icon
                        size={17}
                        strokeWidth={1.6}
                      />
                    </div>

                    <div className="stage-info">
                      <strong>
                        {stage.label}
                      </strong>

                      <span>
                        {stageCurrent
                          ? "Processing now"
                          : stageCompleted
                            ? "Completed"
                            : stageFailed
                              ? "Stopped"
                              : stage.description}
                      </span>
                    </div>

                    <div className="stage-number">
                      {String(index + 1).padStart(
                        2,
                        "0",
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Run information */}

        <aside className="run-sidebar">
          <div className="run-info-block">
            <span className="section-label">
              RUN INFORMATION
            </span>

            <div className="info-row">
              <span>Status</span>

              <strong>
                {completed
                  ? "Completed"
                  : failed
                    ? "Failed"
                    : "Running"}
              </strong>
            </div>

            <div className="info-row">
              <span>Process</span>

              <strong>
                {run?.process_type ?? "—"}
              </strong>
            </div>

            <div className="info-row">
              <span>Started</span>

              <strong>
                {formatDate(
                  run?.created_at,
                )}
              </strong>
            </div>

            <div className="info-row">
              <span>Duration</span>

              <strong>{liveElapsed}</strong>
            </div>
          </div>

          <div className="run-info-block">
            <span className="section-label">
              OUTPUTS
            </span>

            <div className="output-row">
              <div className="output-row-icon">
                <FileBarChart3 size={15} />
              </div>

              <div>
                <strong>
                  Visualizations
                </strong>

                <span>
                  Analytical charts
                </span>
              </div>
            </div>

            <div className="output-row">
              <div className="output-row-icon">
                <FileOutput size={15} />
              </div>

              <div>
                <strong>
                  Management report
                </strong>

                <span>
                  Generated report artifact
                </span>
              </div>
            </div>
          </div>

          <div className="run-info-block grounded">
            <div className="grounded-icon">
              <ShieldCheck size={17} />
            </div>

            <div>
              <strong>
                Verification gate
              </strong>

              <p>
                Final outputs are checked before
                the run is considered complete.
              </p>
            </div>
          </div>

          {completed && (
            <button
              type="button"
              className="view-results-button"
              onClick={() =>
                router.push(
                  `/analysis/${runId}/results`,
                )
              }
            >
              Open results
              <ArrowLeft
                size={16}
                className="results-arrow"
              />
            </button>
          )}
        </aside>
      </div>
    </main>
  );
}