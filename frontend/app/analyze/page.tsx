"use client";

import { useRef, useState, type DragEvent } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  Trash2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Info,
  Layers,
} from "lucide-react";

import { uploadDataset } from "@/lib/api";
import { rememberRun } from "@/lib/run-cache";
import RunView from "@/components/run/RunView";

const PROCESS_OPTIONS = [
  { key: "weaving", label: "Weaving Module", sub: "Production Loom Intelligence", enabled: true },
  { key: "spinning", label: "Spinning Module", sub: "Yarn Quality Engine (Roadmap)", enabled: false },
  { key: "dyeing", label: "Dyeing & Finishing", sub: "Color Shrink Analytics (Roadmap)", enabled: false },
  { key: "garment", label: "Garment Module", sub: "Assembly & Defect Tracking", enabled: false },
];

const PIPELINE_PREVIEW = [
  "Ingestion & Cleaning",
  "Schema Validation",
  "KPI Metrics Engine",
  "AI Narrative Analysis",
  "Visualization Generator",
  "Report PDF Builder",
  "Dual Truth Verification",
  "Multi-channel Dispatch",
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
      setError(`Unsupported file format "${extension}". Fibrion accepts .csv, .xlsx, or .xls files.`);
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
      const response = await uploadDataset(file, processType, []);

      rememberRun({
        run_id: response.run_id,
        filename: file.name,
        process_type: processType,
        created_at: new Date().toISOString(),
      });

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
          <span className="eyebrow">NEW ANALYSIS WORKBENCH</span>
          <h1 className="page-title">Analyze Production Dataset</h1>
          <p className="page-description">
            Upload raw weaving operational metrics (.csv or .xlsx). Fibrion's 8-stage pipeline validates structure,
            computes fulfillment &amp; rejection KPIs, flags high z-score anomalies, and generates a verified management PDF.
          </p>
        </div>
      </div>

      <div className="workbench-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* File Upload Section */}
          <div className="field-group">
            <span className="field-label">Production Data File</span>

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
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="upload-zone-title">Drop your dataset file here, or click to browse</div>
                <div className="upload-zone-sub" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span>Supported formats:</span>
                  <span style={{ padding: "2px 6px", background: "var(--surface-strong)", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 11 }}>.CSV</span>
                  <span style={{ padding: "2px 6px", background: "var(--surface-strong)", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 11 }}>.XLSX</span>
                  <span style={{ padding: "2px 6px", background: "var(--surface-strong)", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 11 }}>.XLS</span>
                </div>

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
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="upload-file-name">{file.name}</div>
                  <div className="upload-file-size">{formatBytes(file.size)} • Ready for upload</div>
                </div>
                <button
                  type="button"
                  className="upload-file-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  title="Remove file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--fault)", fontSize: 13, marginTop: 4 }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Module Select */}
          <div className="field-group">
            <span className="field-label">Manufacturing Process Module</span>
            <div className="option-tile-grid">
              {PROCESS_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.key}
                  disabled={!option.enabled}
                  className={`option-tile ${processType === option.key ? "option-tile-active" : ""} ${!option.enabled ? "option-tile-disabled" : ""}`}
                  onClick={() => option.enabled && setProcessType(option.key)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="option-tile-title">{option.label}</span>
                    {option.enabled ? (
                      <CheckCircle2 className="w-4 h-4" style={{ color: "var(--accent-vivid)" }} />
                    ) : (
                      <span style={{ fontSize: 10, padding: "2px 6px", background: "var(--surface-strong)", borderRadius: 4, color: "var(--text-faint)" }}>Roadmap</span>
                    )}
                  </div>
                  <span className="option-tile-sub">{option.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action button */}
          <button
            type="button"
            className="button button-primary button-large"
            disabled={!file || submitting}
            onClick={handleSubmit}
            style={{ alignSelf: "flex-start", marginTop: 8 }}
          >
            {submitting ? (
              <>
                <div className="run-loading-mark" style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#ffffff" }} />
                <span>Initializing Pipeline…</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4.5 h-4.5" />
                <span>Execute Analysis Pipeline</span>
              </>
            )}
          </button>
        </div>

        {/* Workbench Rail */}
        <div className="workbench-rail">
          <div className="rail-card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Cpu className="w-4 h-4" style={{ color: "var(--accent-vivid)" }} />
              <h4 style={{ margin: 0 }}>Pipeline Execution Plan</h4>
            </div>
            <div className="pipeline-preview-list">
              {PIPELINE_PREVIEW.map((label, index) => (
                <div className="pipeline-preview-item" key={label}>
                  <span className="pipeline-preview-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rail-card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Info className="w-4 h-4" style={{ color: "var(--accent-vivid)" }} />
              <h4 style={{ margin: 0 }}>Processing Note</h4>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--text-soft)", lineHeight: 1.6, margin: 0 }}>
              Currently, the <strong>Weaving Module</strong> is active on the backend. Analysis execution usually takes 15–30 seconds. Upon completion, executive PDFs can be dispatched directly to your Telegram or Email.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
