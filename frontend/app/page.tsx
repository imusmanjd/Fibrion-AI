"use client";

import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Database,
  FileText,
  Gauge,
  Play,
  ShieldCheck,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import "./overview.css";

type RunState = {
  run_id?: string;
  status?: string;
  stage?: string;
  progress?: number;
  message?: string;
  process_type?: string;
  filename?: string;
  error?: string | null;
  verification_passed?: boolean;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://127.0.0.1:8000";

const workflow = [
  {
    number: "01",
    title: "Ingest",
    description: "Read and structure production data.",
  },
  {
    number: "02",
    title: "Validate",
    description: "Check schema, values, and data integrity.",
  },
  {
    number: "03",
    title: "Measure",
    description: "Calculate production and quality KPIs.",
  },
  {
    number: "04",
    title: "Analyze",
    description: "Identify operational patterns and findings.",
  },
  {
    number: "05",
    title: "Visualize",
    description: "Turn the results into useful charts.",
  },
  {
    number: "06",
    title: "Report",
    description: "Assemble a management-ready production report.",
  },
  {
    number: "07",
    title: "Verify",
    description: "Check generated outputs before delivery.",
  },
  {
    number: "08",
    title: "Deliver",
    description: "Download or send the verified report.",
  },
];

export default function OverviewPage() {
  const [lastRun, setLastRun] =
    useState<RunState | null>(null);

  const [loadingRun, setLoadingRun] =
    useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadLastRun() {
      try {
        const storedRunId =
          window.sessionStorage.getItem(
            "fibrion:lastRunId",
          );

        if (!storedRunId) {
          if (!cancelled) {
            setLoadingRun(false);
          }

          return;
        }

        const response = await fetch(
          `${API_URL}/runs/${encodeURIComponent(
            storedRunId,
          )}`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(
            "Unable to load the latest run.",
          );
        }

        const data =
          (await response.json()) as RunState;

        if (!cancelled) {
          setLastRun(data);
        }
      } catch {
        if (!cancelled) {
          setLastRun(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingRun(false);
        }
      }
    }

    void loadLastRun();

    return () => {
      cancelled = true;
    };
  }, []);

  const hasRun = Boolean(
    lastRun?.run_id,
  );

  const runCompleted =
    lastRun?.status === "completed";

  const runFailed =
    lastRun?.status === "failed" ||
    Boolean(lastRun?.error);

  return (
    <div className="overview-page">

      {/* ---------------------------------------------------------
          Page heading
      ---------------------------------------------------------- */}

      <section className="overview-heading">
        <div>
          <div className="overview-eyebrow">
            Production intelligence
          </div>

          <h1>
            Understand your production
            data.
          </h1>

          <p>
            Fibrion turns production datasets
            into measurable performance
            insights, operational findings,
            visual analysis, and verified
            reports.
          </p>
        </div>

        <Link
          href="/analyze"
          className="overview-primary-action"
        >
          <Play
            size={16}
            strokeWidth={2}
          />

          Start analysis

          <ArrowRight
            size={15}
            strokeWidth={2}
          />
        </Link>
      </section>

      {/* ---------------------------------------------------------
          Main workspace
      ---------------------------------------------------------- */}

      <section className="overview-workspace">

        {/* Primary introduction */}

        <div className="overview-intro">
          <div className="overview-intro-top">
            <div className="overview-intro-icon">
              <Gauge
                size={19}
                strokeWidth={1.7}
              />
            </div>

            <span>
              ANALYTICAL WORKSPACE
            </span>
          </div>

          <h2>
            From raw production data
            to actionable evidence.
          </h2>

          <p>
            Upload a production dataset,
            run the weaving workflow,
            and let Fibrion run the complete
            analytical workflow. Deterministic
            calculations handle the numbers;
            analysis turns them into operational
            findings.
          </p>

          <Link
            href="/analyze"
            className="overview-text-action"
          >
            Run a dataset
            <ArrowRight size={15} />
          </Link>
        </div>

        {/* Capability list */}

        <div className="overview-capabilities">
          <Capability
            icon={<Database size={17} />}
            title="Production data"
            description="Work directly from your uploaded CSV datasets."
          />

          <Capability
            icon={<BarChart3 size={17} />}
            title="Operational metrics"
            description="Calculate production, quality, fulfillment, and rejection measures."
          />

          <Capability
            icon={<FileText size={17} />}
            title="Analytical outputs"
            description="Generate charts and a structured production report."
          />

          <Capability
            icon={<ShieldCheck size={17} />}
            title="Verification"
            description="Run a final consistency check before outputs are delivered."
          />
        </div>
      </section>

      {/* ---------------------------------------------------------
          Latest analysis
      ---------------------------------------------------------- */}

      <section className="overview-section">

        <div className="overview-section-heading">
          <div>
            <div className="overview-eyebrow">
              Latest activity
            </div>

            <h2>
              Recent analysis
            </h2>
          </div>

          <Link
            href="/analyze"
            className="overview-section-link"
          >
            New analysis
            <ArrowRight size={14} />
          </Link>
        </div>

        {!loadingRun && !hasRun && (
          <div className="overview-empty">
            <div className="overview-empty-icon">
              <Upload
                size={18}
                strokeWidth={1.7}
              />
            </div>

            <div>
              <h3>
                No analysis in this session
              </h3>

              <p>
                Upload a production dataset to
                begin your first analysis.
              </p>
            </div>

            <Link
              href="/analyze"
              className="overview-small-button"
            >
              Start analysis
            </Link>
          </div>
        )}

        {!loadingRun && hasRun && (
          <div className="overview-run">

            <div className="overview-run-main">
              <div className="overview-run-file">
                <Database
                  size={17}
                  strokeWidth={1.7}
                />
              </div>

              <div className="overview-run-copy">
                <span>
                  {lastRun?.process_type ||
                    "Production analysis"}
                </span>

                <h3>
                  {lastRun?.filename ||
                    "Production dataset"}
                </h3>

                <p>
                  {lastRun?.message ||
                    "Analysis run recorded in this session."}
                </p>
              </div>
            </div>

            <div className="overview-run-meta">
              <div>
                <span>Status</span>

                <strong
                  className={
                    runCompleted
                      ? "status-complete"
                      : runFailed
                        ? "status-failed"
                        : "status-running"
                  }
                >
                  {runCompleted
                    ? "Completed"
                    : runFailed
                      ? "Failed"
                      : "Running"}
                </strong>
              </div>

              <div>
                <span>Stage</span>

                <strong>
                  {formatStage(
                    lastRun?.stage,
                  )}
                </strong>
              </div>

              <div>
                <span>Progress</span>

                <strong>
                  {Math.round(
                    lastRun?.progress ?? 0,
                  )}
                  %
                </strong>
              </div>
            </div>

            {lastRun?.run_id && (
              <Link
                href={`/analysis/${encodeURIComponent(
                  lastRun.run_id,
                )}`}
                className="overview-run-action"
              >
                Open run
                <ArrowRight size={14} />
              </Link>
            )}
          </div>
        )}
      </section>

      {/* ---------------------------------------------------------
          Workflow
      ---------------------------------------------------------- */}

      <section className="overview-section">

        <div className="overview-section-heading">
          <div>
            <div className="overview-eyebrow">
              How Fibrion works
            </div>

            <h2>
              One analytical workflow
            </h2>
          </div>
        </div>

        <div className="overview-workflow">
          {workflow.map((item) => (
            <div
              key={item.number}
              className="overview-workflow-item"
            >
              <div className="overview-workflow-number">
                {item.number}
              </div>

              <div>
                <h3>
                  {item.title}
                </h3>

                <p>
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------
          Bottom system strip
      ---------------------------------------------------------- */}

      <section className="overview-system">

        <div className="overview-system-status">
          <span className="overview-system-dot" />

          <div>
            <span>
              SYSTEM STATUS
            </span>

            <strong>
              Operational
            </strong>
          </div>
        </div>

        <div className="overview-system-copy">
          Analysis services are available.
          Fibrion processes each dataset
          through the configured analytical
          pipeline.
        </div>

        <div className="overview-system-check">
          <CheckCircle2
            size={16}
            strokeWidth={1.8}
          />

          Ready for analysis
        </div>
      </section>
    </div>
  );
}

function Capability({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="overview-capability">
      <div className="overview-capability-icon">
        {icon}
      </div>

      <div>
        <h3>
          {title}
        </h3>

        <p>
          {description}
        </p>
      </div>
    </div>
  );
}

function formatStage(
  stage?: string,
) {
  if (!stage) {
    return "Preparing";
  }

  return stage
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    );
}
