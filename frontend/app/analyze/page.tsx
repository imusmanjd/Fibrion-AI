"use client";

import { useRef, useState, type DragEvent } from "react";

import { uploadDataset } from "@/lib/api";
import { rememberRun } from "@/lib/run-cache";
import RunView from "@/components/run/RunView";

const PROCESS_OPTIONS = [
  { key: "weaving", label: "Weaving", sub: "Available now", enabled: true },
  { key: "spinning", label: "Spinning", sub: "Coming soon", enabled: false },
  { key: "dyeing", label: "Dyeing & finishing", sub: "Coming soon", enabled: false },
  { key: "garment", label: "Garment", sub: "Coming soon", enabled: false },
];

const PIPELINE_PREVIEW = [
  "Ingestion", "Validation", "KPI Engine", "AI Analysis",
  "Visualization", "Report Generation", "Verification", "Notification",
];

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls"];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AnalyzePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [processType, setProcessType] = useState("weaving");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickFile(candidate: File | undefined | null) {
    if (!candidate) return;

    const extension = candidate.name.slice(candidate.name.lastIndexOf(".")).toLowerCase();

    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setError(`Unsupported file type "${extension}". Fibrion accepts .csv, .xlsx, or .xls.`);
      return;
    }

    setError(null);
    setFile(candidate);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    pickFile(event.dataTransfer.files?.[0]);
  }

  async function handleSubmit() {
    if (!file || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      // No delivery channels collected here — those are offered on
      // the completed run itself (see DeliveryPanel), via the
      // existing POST /runs/{id}/send endpoint. Asking for an email
      // before someone has even seen a result is backwards.
      const response = await uploadDataset(file, processType, []);

      rememberRun({
        run_id: response.run_id,
        filename: file.name,
        process_type: processType,
        created_at: new Date().toISOString(),
      });

      // Stay on this page — swap the form for the live run view
      // instead of navigating, so starting and watching an analysis
      // is one page, not two.
      setActiveRunId(response.run_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetToUpload() {
    setActiveRunId(null);
    setFile(null);
    setError(null);
  }

  if (activeRunId) {
    return (
      <RunView
        runId={activeRunId}
        onReset={resetToUpload}
        resetLabel="Run another analysis"
      />
    );
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">NEW ANALYSIS</span>
          <h1 className="page-title">Run a production dataset</h1>
          <p className="page-description">
            Upload a weaving production file. Fibrion validates it,
            computes KPIs, flags anomalies, and generates a verified
            report — usually in well under a minute.
          </p>
        </div>
      </div>

      <div className="workbench-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div className="field-group">
            <span className="field-label">Dataset</span>

            {!file ? (
              <div
                className={`upload-zone ${dragActive ? "upload-zone-active" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
              >
                <div className="upload-zone-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M12 16V4M12 4 7 9M12 4l5 5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="upload-zone-title">Drop a file, or click to browse</div>
                <div className="upload-zone-sub">.csv, .xlsx, or .xls</div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_EXTENSIONS.join(",")}
                  style={{ display: "none" }}
                  onChange={(event) => pickFile(event.target.files?.[0])}
                />
              </div>
            ) : (
              <div className="upload-file-row">
                <div className="upload-file-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                  </svg>
                </div>
                <div>
                  <div className="upload-file-name">{file.name}</div>
                  <div className="upload-file-size">{formatBytes(file.size)}</div>
                </div>
                <span className="upload-file-remove" onClick={() => setFile(null)}>
                  Remove
                </span>
              </div>
            )}

            {error && <p style={{ color: "var(--fault)", fontSize: 12 }}>{error}</p>}
          </div>

          <div className="field-group">
            <span className="field-label">Process type</span>
            <div className="option-tile-grid">
              {PROCESS_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.key}
                  disabled={!option.enabled}
                  className={`option-tile ${processType === option.key ? "option-tile-active" : ""} ${!option.enabled ? "option-tile-disabled" : ""}`}
                  onClick={() => option.enabled && setProcessType(option.key)}
                >
                  <span className="option-tile-title">{option.label}</span>
                  <span className="option-tile-sub">{option.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="button button-primary button-large"
            disabled={!file || submitting}
            onClick={handleSubmit}
            style={{ alignSelf: "flex-start" }}
          >
            {submitting ? "Starting analysis…" : "Start analysis"}
          </button>
        </div>

        <div className="workbench-rail">
          <div className="rail-card">
            <h4>What happens next</h4>
            <div className="pipeline-preview-list">
              {PIPELINE_PREVIEW.map((label, index) => (
                <div className="pipeline-preview-item" key={label}>
                  <span className="pipeline-preview-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div className="rail-card">
            <h4>Note</h4>
            <p style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.6, margin: 0 }}>
              Only the Weaving module is registered on the backend today.
              Other process types are on the roadmap. Once your analysis
              finishes, you'll get the option to email or Telegram the
              report — no need to set that up now.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}