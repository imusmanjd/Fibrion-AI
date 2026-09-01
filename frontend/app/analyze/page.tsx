"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15V4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="m7.5 8.5 4.5-4.5 4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 13v4.25A2.75 2.75 0 0 0 7.75 20h8.5A2.75 2.75 0 0 0 19 17.25V13"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M5 2.75h6.5L15.5 6.7v10.55H5V2.75Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M11.5 2.75V7h4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="m5 10.2 3.2 3.2L15.5 6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 10h11M11 5.5 15.5 10 11 14.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="m5 5 10 10M15 5 5 15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function AnalyzePage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [processType, setProcessType] = useState("weaving");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function selectFile(selected: File | null) {
    setError("");

    if (!selected) {
      return;
    }

    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setError("Fibrion currently accepts CSV datasets.");
      return;
    }

    setFile(selected);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);

    const droppedFile = event.dataTransfer.files?.[0];

    selectFile(droppedFile ?? null);
  }

  async function handleSubmit() {
    if (!file) {
      setError("Select a CSV dataset before starting the analysis.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();

      formData.append("file", file);
      formData.append("process_type", processType);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"}/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        let message = "Upload failed.";

        try {
          const body = await response.json();

          if (typeof body?.detail === "string") {
            message = body.detail;
          }
        } catch {
          // Keep the generic message.
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
    <div className="page analyze-page">
      {/* ----------------------------------------------------------
          Heading
      ----------------------------------------------------------- */}

      <section className="page-heading">
        <div>
          <div className="eyebrow">
            New analysis
          </div>

          <h1 className="page-title">
            Bring the production data.
            <br />
            Fibrion handles the analysis.
          </h1>

          <p className="page-description">
            Upload a production CSV and choose the process context.
            Fibrion will validate the dataset, calculate KPIs,
            generate analytical findings, build visualizations,
            and produce the report.
          </p>
        </div>
      </section>

      {/* ----------------------------------------------------------
          Workbench
      ----------------------------------------------------------- */}

      <section className="analysis-workbench">
        <div className="analysis-workbench-main">
          <div className="workbench-header">
            <div>
              <div className="eyebrow">
                Dataset
              </div>

              <h2>
                Select production data
              </h2>
            </div>

            <div className="workbench-step">
              01 / 02
            </div>
          </div>

          {/* Dropzone */}

          {!file ? (
            <div
              className={`upload-zone ${
                dragging ? "upload-zone-dragging" : ""
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
                if (
                  event.key === "Enter" ||
                  event.key === " "
                ) {
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
                  selectFile(
                    event.target.files?.[0] ?? null,
                  )
                }
              />

              <div className="upload-zone-icon">
                <UploadIcon />
              </div>

              <div className="upload-zone-title">
                Drop your CSV here
              </div>

              <div className="upload-zone-description">
                or click to browse your computer
              </div>

              <div className="upload-zone-meta">
                CSV files only
              </div>
            </div>
          ) : (
            <div className="selected-file">
              <div className="selected-file-icon">
                <FileIcon />
              </div>

              <div className="selected-file-info">
                <div className="selected-file-name">
                  {file.name}
                </div>

                <div className="selected-file-size">
                  {formatFileSize(file.size)}
                </div>
              </div>

              <button
                type="button"
                className="selected-file-remove"
                onClick={() => {
                  setFile(null);

                  if (inputRef.current) {
                    inputRef.current.value = "";
                  }
                }}
                aria-label="Remove selected file"
              >
                <CloseIcon />
              </button>
            </div>
          )}

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          {/* Process */}

          <div className="process-section">
            <div className="process-section-heading">
              <div>
                <div className="eyebrow">
                  Process context
                </div>

                <h3>
                  What production process is this?
                </h3>
              </div>
            </div>

            <div className="process-options">
              <button
                type="button"
                className={`process-option ${
                  processType === "weaving"
                    ? "process-option-selected"
                    : ""
                }`}
                onClick={() =>
                  setProcessType("weaving")
                }
              >
                <span className="process-option-radio">
                  {processType === "weaving" && (
                    <span />
                  )}
                </span>

                <span>
                  <strong>Weaving</strong>
                  <small>
                    Production, fulfillment and rejection
                  </small>
                </span>

                {processType === "weaving" && (
                  <CheckIcon />
                )}
              </button>

              <button
                type="button"
                className={`process-option ${
                  processType === "spinning"
                    ? "process-option-selected"
                    : ""
                }`}
                onClick={() =>
                  setProcessType("spinning")
                }
              >
                <span className="process-option-radio">
                  {processType === "spinning" && (
                    <span />
                  )}
                </span>

                <span>
                  <strong>Spinning</strong>
                  <small>
                    Spinning production analysis
                  </small>
                </span>

                {processType === "spinning" && (
                  <CheckIcon />
                )}
              </button>
            </div>
          </div>

          {/* Submit */}

          <div className="workbench-submit">
            <div className="workbench-submit-copy">
              <span>
                {file
                  ? "Dataset ready for analysis."
                  : "Select a dataset to continue."}
              </span>

              <small>
                The full pipeline will run once after submission.
              </small>
            </div>

            <button
              type="button"
              className="button button-primary button-large"
              disabled={!file || uploading}
              onClick={handleSubmit}
            >
              {uploading
                ? "Starting analysis..."
                : "Start analysis"}

              {!uploading && <ArrowRightIcon />}
            </button>
          </div>
        </div>

        {/* --------------------------------------------------------
            Right rail
        --------------------------------------------------------- */}

        <aside className="analysis-workbench-rail">
          <div className="rail-heading">
            <div className="eyebrow">
              Pipeline
            </div>

            <h3>
              What happens next
            </h3>
          </div>

          <div className="pipeline-list">
            <PipelineItem
              number="01"
              title="Ingestion"
              description="Read and normalize the dataset."
              active
            />

            <PipelineItem
              number="02"
              title="Validation"
              description="Check data quality and structure."
            />

            <PipelineItem
              number="03"
              title="KPI computation"
              description="Calculate production metrics."
            />

            <PipelineItem
              number="04"
              title="Analysis"
              description="Identify findings and causes."
            />

            <PipelineItem
              number="05"
              title="Visualization"
              description="Generate analytical charts."
            />

            <PipelineItem
              number="06"
              title="Report"
              description="Create the management report."
            />
          </div>

          <div className="rail-note">
            <div className="rail-note-marker" />

            <p>
              Fibrion keeps the analytical pipeline grounded in
              computed production values rather than asking the
              model to invent operational metrics.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

function PipelineItem({
  number,
  title,
  description,
  active = false,
}: {
  number: string;
  title: string;
  description: string;
  active?: boolean;
}) {
  return (
    <div
      className={`pipeline-item ${
        active ? "pipeline-item-active" : ""
      }`}
    >
      <div className="pipeline-item-number">
        {number}
      </div>

      <div className="pipeline-item-content">
        <div className="pipeline-item-title">
          {title}
        </div>

        <div className="pipeline-item-description">
          {description}
        </div>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}