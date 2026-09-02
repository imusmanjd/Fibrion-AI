"use client";

import "./analyze.css";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Database,
  FileSpreadsheet,
  Info,
  Layers3,
  Play,
  UploadCloud,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const PIPELINE = [
  {
    number: "01",
    title: "Ingestion",
    description: "Read and normalize source data.",
  },
  {
    number: "02",
    title: "Validation",
    description: "Check structure and data quality.",
  },
  {
    number: "03",
    title: "KPI computation",
    description: "Calculate production metrics.",
  },
  {
    number: "04",
    title: "Analysis",
    description: "Surface operational findings.",
  },
  {
    number: "05",
    title: "Visualization",
    description: "Build decision-ready charts.",
  },
  {
    number: "06",
    title: "Report",
    description: "Assemble the final report.",
  },
];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function AnalyzePage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [processType, setProcessType] = useState("weaving");
  const [scope, setScope] = useState("full");
  const [outputs, setOutputs] = useState({
    report: true,
    charts: true,
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function selectFile(nextFile: File | null) {
    setError("");

    if (!nextFile) return;

    if (!nextFile.name.toLowerCase().endsWith(".csv")) {
      setError("Only CSV datasets are currently supported.");
      return;
    }

    setFile(nextFile);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);

    selectFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function handleSubmit() {
    if (!file) {
      setError("Select a dataset before starting the analysis.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();

      formData.append("file", file);
      formData.append("process_type", processType);

      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let message = "Unable to start the analysis.";

        try {
          const body = await response.json();

          if (typeof body?.detail === "string") {
            message = body.detail;
          }
        } catch {
          // Keep fallback message.
        }

        throw new Error(message);
      }

      const result = await response.json();

      const runId =
        result?.run_id ??
        result?.id ??
        result?.run?.run_id;

      if (!runId) {
        throw new Error(
          "The server accepted the dataset but did not return a run ID.",
        );
      }

      router.push(`/analysis/${runId}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to start the analysis.",
      );
      setUploading(false);
    }
  }

  return (
    <main className="analyze-shell">
      {/* Header */}

      <header className="analyze-header">
        <div>
          <div className="analyze-kicker">
            <span className="kicker-dot" />
            Analysis workspace
          </div>

          <h1>New production analysis</h1>

          <p>
            Configure the dataset and production context.
            Fibrion will run the analytical pipeline once you start.
          </p>
        </div>

        <div className="analyze-header-meta">
          <div className="header-meta-label">PIPELINE</div>
          <div className="header-meta-value">
            6 stages
            <span />
            deterministic flow
          </div>
        </div>
      </header>

      {/* Workspace */}

      <div className="analyze-grid">
        <section className="analyze-form">
          {/* Dataset */}

          <div className="form-section">
            <div className="section-index">01</div>

            <div className="section-body">
              <div className="section-heading">
                <div>
                  <span className="section-label">SOURCE DATA</span>
                  <h2>Production dataset</h2>
                  <p>
                    Upload the CSV containing the production records
                    you want Fibrion to analyze.
                  </p>
                </div>

                <Database size={19} strokeWidth={1.7} />
              </div>

              {!file ? (
                <div
                  className={`dataset-dropzone ${
                    dragging ? "is-dragging" : ""
                  }`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => inputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      inputRef.current?.click();
                    }
                  }}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".csv,text/csv"
                    hidden
                    onChange={(event) =>
                      selectFile(event.target.files?.[0] ?? null)
                    }
                  />

                  <div className="dropzone-icon">
                    <UploadCloud size={22} strokeWidth={1.6} />
                  </div>

                  <div className="dropzone-main">
                    <strong>Drop production CSV here</strong>
                    <span>
                      or <u>browse your computer</u>
                    </span>
                  </div>

                  <div className="dropzone-spec">
                    CSV
                    <span />
                    structured production data
                  </div>
                </div>
              ) : (
                <div className="dataset-file">
                  <div className="dataset-file-icon">
                    <FileSpreadsheet size={22} strokeWidth={1.6} />
                  </div>

                  <div className="dataset-file-details">
                    <strong>{file.name}</strong>

                    <span>
                      CSV dataset
                      <i />
                      {formatFileSize(file.size)}
                    </span>
                  </div>

                  <div className="dataset-file-status">
                    <Check size={14} />
                    Ready
                  </div>

                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => {
                      setFile(null);

                      if (inputRef.current) {
                        inputRef.current.value = "";
                      }
                    }}
                    aria-label="Remove dataset"
                  >
                    <X size={17} />
                  </button>
                </div>
              )}

              {error && (
                <div className="analysis-error">
                  <Info size={16} />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* Context */}

          <div className="form-section">
            <div className="section-index">02</div>

            <div className="section-body">
              <div className="section-heading">
                <div>
                  <span className="section-label">PROCESS CONTEXT</span>
                  <h2>Production process</h2>
                  <p>
                    This context determines which production KPIs
                    and analytical rules are applied.
                  </p>
                </div>

                <Layers3 size={19} strokeWidth={1.7} />
              </div>

              <div className="process-selector">
                <button
                  type="button"
                  className={
                    processType === "weaving"
                      ? "process-choice active"
                      : "process-choice"
                  }
                  onClick={() => setProcessType("weaving")}
                >
                  <div className="choice-marker">
                    {processType === "weaving" && <Check size={13} />}
                  </div>

                  <div className="choice-copy">
                    <strong>Weaving</strong>
                    <span>
                      Production, fulfillment and rejection analysis
                    </span>
                  </div>

                  <span className="choice-code">WVG</span>
                </button>

                <button
                  type="button"
                  className={
                    processType === "spinning"
                      ? "process-choice active"
                      : "process-choice"
                  }
                  onClick={() => setProcessType("spinning")}
                >
                  <div className="choice-marker">
                    {processType === "spinning" && <Check size={13} />}
                  </div>

                  <div className="choice-copy">
                    <strong>Spinning</strong>
                    <span>
                      Spinning production and process analysis
                    </span>
                  </div>

                  <span className="choice-code">SPN</span>
                </button>
              </div>
            </div>
          </div>

          {/* Scope */}

          <div className="form-section">
            <div className="section-index">03</div>

            <div className="section-body">
              <div className="section-heading">
                <div>
                  <span className="section-label">ANALYSIS SCOPE</span>
                  <h2>What should Fibrion analyze?</h2>
                  <p>
                    Choose how much of the available production
                    dataset should be processed.
                  </p>
                </div>
              </div>

              <div className="scope-select">
                <select
                  value={scope}
                  onChange={(event) => setScope(event.target.value)}
                >
                  <option value="full">
                    Full dataset — all available records
                  </option>

                  <option value="recent">
                    Recent production period
                  </option>

                  <option value="sample">
                    Dataset sample
                  </option>
                </select>

                <ChevronDown size={17} />
              </div>
            </div>
          </div>

          {/* Outputs */}

          <div className="form-section">
            <div className="section-index">04</div>

            <div className="section-body">
              <div className="section-heading">
                <div>
                  <span className="section-label">OUTPUTS</span>
                  <h2>Analysis deliverables</h2>
                  <p>
                    Select the artifacts you want generated from this run.
                  </p>
                </div>
              </div>

              <div className="output-options">
                <button
                  type="button"
                  className={
                    outputs.charts
                      ? "output-choice active"
                      : "output-choice"
                  }
                  onClick={() =>
                    setOutputs((current) => ({
                      ...current,
                      charts: !current.charts,
                    }))
                  }
                >
                  <div className="output-check">
                    {outputs.charts && <Check size={13} />}
                  </div>

                  <div>
                    <strong>Analytical visualizations</strong>
                    <span>
                      KPI charts and production breakdowns
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  className={
                    outputs.report
                      ? "output-choice active"
                      : "output-choice"
                  }
                  onClick={() =>
                    setOutputs((current) => ({
                      ...current,
                      report: !current.report,
                    }))
                  }
                >
                  <div className="output-check">
                    {outputs.report && <Check size={13} />}
                  </div>

                  <div>
                    <strong>Management report</strong>
                    <span>
                      Consolidated analytical report for download
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Action */}

          <div className="analyze-submit">
            <div>
              <span>Ready to run</span>
              <small>
                The pipeline executes once and reports its actual stage
                progress.
              </small>
            </div>

            <button
              type="button"
              className="start-analysis-button"
              disabled={!file || uploading}
              onClick={handleSubmit}
            >
              <Play size={16} fill="currentColor" />

              {uploading ? "Starting…" : "Start analysis"}

              {!uploading && <ArrowRight size={17} />}
            </button>
          </div>
        </section>

        {/* Pipeline rail */}

        <aside className="analysis-rail">
          <div className="rail-top">
            <span className="section-label">EXECUTION MODEL</span>

            <h2>One pipeline.<br />Six stages.</h2>

            <p>
              After submission, Fibrion moves through each stage
              sequentially. The run page will show the actual backend
              state as it changes.
            </p>
          </div>

          <div className="pipeline">
            {PIPELINE.map((stage, index) => (
              <div className="pipeline-stage" key={stage.number}>
                <div className="pipeline-line">
                  <span className="pipeline-node">
                    {stage.number}
                  </span>

                  {index !== PIPELINE.length - 1 && (
                    <span className="pipeline-connector" />
                  )}
                </div>

                <div className="pipeline-copy">
                  <strong>{stage.title}</strong>
                  <span>{stage.description}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rail-footer">
            <div className="rail-footer-icon">
              <Check size={15} />
            </div>

            <div>
              <strong>Grounded analysis</strong>
              <span>
                Findings are generated from computed production
                values and verified before delivery.
              </span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}