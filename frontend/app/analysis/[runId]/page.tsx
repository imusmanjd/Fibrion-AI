"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import "./run.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://127.0.0.1:8000";

type RunResult = {
  report_path?: string | null;
  chart_paths?: string[];
  [key: string]: unknown;
};

type RunData = {
  run_id?: string;
  filename?: string;
  process_type?: string;
  status?: string;
  stage?: string;
  progress?: number;
  message?: string;
  error?: string | null;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
  result?: RunResult | null;
};

type Stage = {
  key: string;
  label: string;
  description: string;
};

const STAGES: Stage[] = [
  {
    key: "ingestion",
    label: "Ingestion",
    description: "Reading and structuring the dataset",
  },
  {
    key: "validation",
    label: "Validation",
    description: "Checking schema, values, and data integrity",
  },
  {
    key: "kpi",
    label: "KPI computation",
    description: "Calculating production and quality metrics",
  },
  {
    key: "analysis",
    label: "Analysis",
    description: "Generating operational findings",
  },
  {
    key: "visualization",
    label: "Visualization",
    description: "Preparing analytical charts",
  },
  {
    key: "report",
    label: "Report generation",
    description: "Building the production intelligence report",
  },
  {
    key: "verification",
    label: "Verification",
    description: "Checking generated outputs",
  },
];

function normalizeStage(value?: string) {
  if (!value) {
    return "queued";
  }

  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");

  if (
    normalized === "kpi_computation" ||
    normalized === "kpi_computing"
  ) {
    return "kpi";
  }

  if (normalized === "visualisation") {
    return "visualization";
  }

  if (
    normalized === "completed" ||
    normalized === "complete" ||
    normalized === "done"
  ) {
    return "complete";
  }

  if (
    normalized === "failed" ||
    normalized === "error"
  ) {
    return "error";
  }

  return normalized;
}

function getStageIndex(stage?: string) {
  const normalized = normalizeStage(stage);

  return STAGES.findIndex(
    (item) => item.key === normalized,
  );
}

function isCompleted(status?: string) {
  const value = status?.toLowerCase();

  return (
    value === "completed" ||
    value === "complete" ||
    value === "success" ||
    value === "succeeded" ||
    value === "done"
  );
}

function isFailed(
  status?: string,
  error?: string | null,
) {
  const value = status?.toLowerCase();

  return (
    Boolean(error) ||
    value === "failed" ||
    value === "error"
  );
}

function formatProcess(value?: string) {
  if (!value) {
    return "—";
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(
      /\b\w/g,
      (letter) => letter.toUpperCase(),
    );
}

function formatDate(value?: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDuration(
  start?: string,
  end?: string,
) {
  if (!start) {
    return "—";
  }

  const startTime = new Date(start).getTime();

  if (Number.isNaN(startTime)) {
    return "—";
  }

  const endTime = end
    ? new Date(end).getTime()
    : Date.now();

  if (Number.isNaN(endTime)) {
    return "—";
  }

  const seconds = Math.max(
    0,
    Math.floor((endTime - startTime) / 1000),
  );

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return `${minutes}m ${remainder}s`;
}

function Icon({
  name,
  size = 18,
}: {
  name:
    | "database"
    | "check"
    | "file"
    | "chart"
    | "shield"
    | "download"
    | "arrow"
    | "clock"
    | "alert"
    | "refresh";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "database":
      return (
        <svg {...common}>
          <ellipse cx="12" cy="5" rx="8" ry="3" />
          <path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
          <path d="M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case "file":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8M8 17h5" />
        </svg>
      );

    case "chart":
      return (
        <svg {...common}>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="m7 15 3-4 3 2 5-7" />
        </svg>
      );

    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 20 6v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z" />
          <path d="m8.5 12 2.3 2.3 4.7-5" />
        </svg>
      );

    case "download":
      return (
        <svg {...common}>
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );

    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case "alert":
      return (
        <svg {...common}>
          <path d="M12 3 2.8 20h18.4z" />
          <path d="M12 9v5" />
          <path d="M12 17h.01" />
        </svg>
      );

    case "refresh":
      return (
        <svg {...common}>
          <path d="M20 11a8 8 0 0 0-14.7-4L3 10" />
          <path d="M3 5v5h5" />
          <path d="M4 13a8 8 0 0 0 14.7 4L21 14" />
          <path d="M21 19v-5h-5" />
        </svg>
      );

    default:
      return null;
  }
}

export default function AnalysisRunPage() {
  const params = useParams();
  const router = useRouter();

  const runId = String(params.runId);

  const [run, setRun] =
    useState<RunData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [requestError, setRequestError] =
    useState("");

  const [now, setNow] =
    useState(Date.now());

  useEffect(() => {
    let cancelled = false;
    let timeout:
      | ReturnType<typeof setTimeout>
      | undefined;

    async function loadRun() {
      try {
        const response = await fetch(
          `${API_URL}/runs/${encodeURIComponent(
            runId,
          )}`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(
            `Unable to load analysis run (${response.status}).`,
          );
        }

        const data =
          (await response.json()) as RunData;

        if (cancelled) {
          return;
        }

        setRun(data);
        setLoading(false);
        setRequestError("");

        const finished =
          isCompleted(data.status) ||
          isFailed(
            data.status,
            data.error,
          );

        if (!finished) {
          timeout = setTimeout(
            loadRun,
            1200,
          );
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setRequestError(
          error instanceof Error
            ? error.message
            : "Unable to load the analysis run.",
        );

        setLoading(false);

        timeout = setTimeout(
          loadRun,
          2500,
        );
      }
    }

    void loadRun();

    return () => {
      cancelled = true;

      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [runId]);

  useEffect(() => {
    const interval =
      window.setInterval(() => {
        setNow(Date.now());
      }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem(
      "fibrion:lastRunId",
      runId,
    );
  }, [runId]);

  const completed = isCompleted(
    run?.status,
  );

  const failed = isFailed(
    run?.status,
    run?.error,
  );

  const currentIndex = useMemo(
    () => getStageIndex(run?.stage),
    [run?.stage],
  );

  const currentStage =
    currentIndex >= 0
      ? STAGES[currentIndex]
      : null;

  const progress = Math.max(
    0,
    Math.min(
      100,
      Number(run?.progress ?? 0),
    ),
  );

  const elapsed = run
    ? formatDuration(
        run.created_at,
        completed || failed
          ? run.completed_at
          : new Date(now).toISOString(),
      )
    : "—";

  const reportUrl =
    `${API_URL}/runs/${encodeURIComponent(
      runId,
    )}/report`;

  if (loading && !run) {
    return (
      <main className="run-page">
        <div className="run-loading-screen">
          <div className="run-loading-mark">
            <span />
            <span />
            <span />
          </div>

          <div>
            <strong>
              Connecting to analysis
            </strong>

            <p>
              Retrieving the current run state.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="run-page">

      {/* ----------------------------------------------------------
          HEADER
      ---------------------------------------------------------- */}

      <header className="run-topbar">
        <div className="run-breadcrumb">
          <button
            type="button"
            onClick={() =>
              router.push("/analyze")
            }
          >
            Analyze
          </button>

          <span>/</span>

          <strong>
            Analysis run
          </strong>
        </div>

        <div
          className={`run-status ${
            completed
              ? "complete"
              : failed
                ? "failed"
                : "active"
          }`}
        >
          <span />

          {completed
            ? "Completed"
            : failed
              ? "Failed"
              : "Running"}
        </div>
      </header>

      {/* ----------------------------------------------------------
          ERROR
      ---------------------------------------------------------- */}

      {requestError && (
        <div className="run-error-banner">
          <Icon
            name="alert"
            size={17}
          />

          <span>
            {requestError}
          </span>

          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
          >
            <Icon
              name="refresh"
              size={14}
            />

            Retry
          </button>
        </div>
      )}

      {/* ----------------------------------------------------------
          TITLE
      ---------------------------------------------------------- */}

      <section className="run-title">
        <div>
          <span className="run-eyebrow">
            ANALYSIS RUN
          </span>

          <h1>
            {run?.filename ||
              "Production analysis"}
          </h1>

          <p>
            Fibrion is processing your
            production dataset through the
            analytical workflow.
          </p>
        </div>

        <div className="run-title-meta">
          <div>
            <span>PROCESS</span>

            <strong>
              {formatProcess(
                run?.process_type,
              )}
            </strong>
          </div>

          <div>
            <span>RUN ID</span>

            <strong>
              {runId.slice(0, 8)}
            </strong>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------
          COMPLETION ACTION
      ---------------------------------------------------------- */}

      {completed && (
        <section className="run-complete-banner">
          <div className="complete-symbol">
            <Icon
              name="check"
              size={20}
            />
          </div>

          <div className="complete-copy">
            <span>
              ANALYSIS COMPLETE
            </span>

            <h2>
              Your production analysis is ready.
            </h2>

            <p>
              The pipeline completed successfully.
              Download the generated report directly
              from this run.
            </p>
          </div>

          <a
            href={reportUrl}
            className="download-button"
            download
          >
            <Icon
              name="download"
              size={17}
            />

            Download report

            <Icon
              name="arrow"
              size={15}
            />
          </a>
        </section>
      )}

      {/* ----------------------------------------------------------
          MAIN
      ---------------------------------------------------------- */}

      <div className="run-grid">

        {/* PIPELINE */}

        <section className="pipeline-panel">

          <div className="panel-heading">
            <div>
              <span className="run-eyebrow">
                PIPELINE
              </span>

              <h2>
                Analysis execution
              </h2>
            </div>

            <strong className="progress-value">
              {progress}%
            </strong>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <div className="pipeline-list">
            {STAGES.map(
              (stage, index) => {
                const stageComplete =
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
                    key={stage.key}
                    className={`pipeline-row ${
                      stageComplete
                        ? "is-complete"
                        : ""
                    } ${
                      stageCurrent
                        ? "is-current"
                        : ""
                    } ${
                      stageFailed
                        ? "is-failed"
                        : ""
                    }`}
                  >
                    <div className="stage-line-column">
                      <div className="stage-marker">
                        {stageComplete ? (
                          <Icon
                            name="check"
                            size={13}
                          />
                        ) : stageFailed ? (
                          <Icon
                            name="alert"
                            size={13}
                          />
                        ) : stageCurrent ? (
                          <span className="stage-pulse" />
                        ) : (
                          <span className="stage-dot" />
                        )}
                      </div>

                      {index <
                        STAGES.length - 1 && (
                        <div
                          className={`stage-line ${
                            stageComplete
                              ? "filled"
                              : ""
                          }`}
                        />
                      )}
                    </div>

                    <div className="stage-number">
                      {String(
                        index + 1,
                      ).padStart(2, "0")}
                    </div>

                    <div className="stage-content">
                      <div className="stage-title">
                        <strong>
                          {stage.label}
                        </strong>

                        {stageCurrent && (
                          <span className="stage-running">
                            Processing
                          </span>
                        )}

                        {stageComplete && (
                          <span className="stage-done">
                            Complete
                          </span>
                        )}

                        {stageFailed && (
                          <span className="stage-error">
                            Failed
                          </span>
                        )}
                      </div>

                      <p>
                        {stage.description}
                      </p>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </section>

        {/* SIDE INFORMATION */}

        <aside className="run-details">

          <section className="details-block">
            <span className="run-eyebrow">
              RUN DETAILS
            </span>

            <div className="detail-row">
              <span>Dataset</span>

              <strong>
                {run?.filename || "—"}
              </strong>
            </div>

            <div className="detail-row">
              <span>Process</span>

              <strong>
                {formatProcess(
                  run?.process_type,
                )}
              </strong>
            </div>

            <div className="detail-row">
              <span>Started</span>

              <strong>
                {formatDate(
                  run?.created_at,
                )}
              </strong>
            </div>

            <div className="detail-row">
              <span>Duration</span>

              <strong>
                {elapsed}
              </strong>
            </div>
          </section>

          <section className="details-block">
            <span className="run-eyebrow">
              OUTPUT
            </span>

            <div className="output-item">
              <div className="output-icon">
                <Icon
                  name="file"
                  size={17}
                />
              </div>

              <div>
                <strong>
                  Production report
                </strong>

                <span>
                  PDF generated by Fibrion
                </span>
              </div>
            </div>

            <div className="output-item">
              <div className="output-icon">
                <Icon
                  name="chart"
                  size={17}
                />
              </div>

              <div>
                <strong>
                  Analytical charts
                </strong>

                <span>
                  Generated visual outputs
                </span>
              </div>
            </div>
          </section>

          <section className="details-block verification-block">
            <div className="verification-icon">
              <Icon
                name="shield"
                size={18}
              />
            </div>

            <div>
              <span className="run-eyebrow">
                QUALITY GATE
              </span>

              <strong>
                {completed
                  ? "Verification complete"
                  : "Verification pending"}
              </strong>

              <p>
                Fibrion performs verification as
                the final stage before the report
                is considered ready.
              </p>
            </div>
          </section>

          {!completed &&
            !failed && (
              <div className="waiting-note">
                <Icon
                  name="clock"
                  size={15}
                />

                <span>
                  This page updates automatically
                  while the analysis is running.
                </span>
              </div>
            )}
        </aside>
      </div>

      {/* ----------------------------------------------------------
          FOOTER
      ---------------------------------------------------------- */}

      <footer className="run-footer">
        <Link href="/analyze">
          <span>←</span>
          Start another analysis
        </Link>

        <span>
          {run?.message ||
            "Fibrion analytical pipeline"}
        </span>
      </footer>
    </main>
  );
}