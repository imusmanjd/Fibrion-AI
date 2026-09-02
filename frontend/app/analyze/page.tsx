"use client";

import { ArrowRight, Check, Database, FileSpreadsheet, Info, Play, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import "./analyze.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const PIPELINE = [
  ["01", "Ingestion", "Read and normalize source data."],
  ["02", "Validation", "Check structure and data quality."],
  ["03", "KPI computation", "Calculate production metrics."],
  ["04", "Analysis", "Surface operational findings."],
  ["05", "Visualization", "Build decision-ready charts."],
  ["06", "Report", "Assemble the management report."],
  ["07", "Verification", "Ground outputs against source values."],
  ["08", "Delivery", "Prepare the verified report for delivery."],
];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function AnalyzePage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function selectFile(nextFile: File | null) {
    setError("");
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith(".csv")) {
      setError("Fibrion currently accepts CSV production datasets only.");
      return;
    }
    setFile(nextFile);
  }

  async function handleSubmit() {
    if (!file) {
      setError("Select a production dataset before starting the analysis.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("process_type", "weaving");
      const response = await fetch(`${API_URL}/upload`, { method: "POST", body: formData });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(typeof body?.detail === "string" ? body.detail : "Unable to start the analysis.");
      }
      const result = await response.json();
      const runId = result?.run_id;
      if (!runId) throw new Error("The server did not return an analysis run ID.");
      window.sessionStorage.setItem("fibrion:lastRunId", runId);
      router.push(`/analysis/${runId}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to start the analysis.");
      setUploading(false);
    }
  }

  return (
    <main className="analyze-shell">
      <header className="analyze-header">
        <div>
          <div className="analyze-kicker"><span className="kicker-dot" /> Analysis workspace</div>
          <h1>New weaving analysis</h1>
          <p>Upload a production dataset. Fibrion validates it, calculates deterministic KPIs, and produces a verified operational report.</p>
        </div>
        <div className="analyze-header-meta"><div className="header-meta-label">PIPELINE</div><div className="header-meta-value">8 stages<span /> verified output</div></div>
      </header>

      <div className="analyze-grid">
        <section className="analyze-form">
          <div className="form-section">
            <div className="section-index">01</div>
            <div className="section-body">
              <div className="section-heading"><div><span className="section-label">SOURCE DATA</span><h2>Production dataset</h2><p>Upload the CSV containing the weaving production records you want to analyze.</p></div><Database size={19} strokeWidth={1.7} /></div>
              {!file ? <div className={`dataset-dropzone ${dragging ? "is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); selectFile(event.dataTransfer.files?.[0] ?? null); }} onClick={() => inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }}><input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={(event) => selectFile(event.target.files?.[0] ?? null)} /><div className="dropzone-icon"><UploadCloud size={22} strokeWidth={1.6} /></div><div className="dropzone-main"><strong>Drop weaving CSV here</strong><span>or <u>browse your computer</u></span></div><div className="dropzone-spec">CSV<span /> structured production data</div></div> : <div className="dataset-file"><div className="dataset-file-icon"><FileSpreadsheet size={22} strokeWidth={1.6} /></div><div className="dataset-file-details"><strong>{file.name}</strong><span>CSV dataset<i />{formatFileSize(file.size)}</span></div><div className="dataset-file-status"><Check size={14} /> Ready</div><button type="button" className="icon-button" onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ""; }} aria-label="Remove dataset"><X size={17} /></button></div>}
              {error && <div className="analysis-error"><Info size={16} /><span>{error}</span></div>}
            </div>
          </div>
          <div className="form-section">
            <div className="section-index">02</div>
            <div className="section-body"><div className="section-heading"><div><span className="section-label">PROCESS CONTEXT</span><h2>Weaving</h2><p>This release supports weaving orders, fulfillment, rejection, and shrinkage analysis.</p></div></div><div className="process-selector"><div className="process-choice active"><div className="choice-marker"><Check size={13} /></div><div className="choice-copy"><strong>Weaving production</strong><span>Production, fulfillment, rejection, and shrinkage analysis</span></div><span className="choice-code">WVG</span></div></div></div>
          </div>
          <div className="analyze-submit"><div><span>Ready to run</span><small>Charts, a management report, and verification are included in every run.</small></div><button type="button" className="start-analysis-button" disabled={!file || uploading} onClick={handleSubmit}><Play size={16} fill="currentColor" />{uploading ? "Starting..." : "Start analysis"}{!uploading && <ArrowRight size={17} />}</button></div>
        </section>
        <aside className="analysis-rail"><div className="rail-top"><span className="section-label">EXECUTION MODEL</span><h2>One pipeline.<br />Eight stages.</h2><p>Each calculation is deterministic. AI is used for findings and recommendations, then the final output is verified before delivery.</p></div><div className="pipeline">{PIPELINE.map(([number, title, description], index) => <div className="pipeline-stage" key={number}><div className="pipeline-line"><span className="pipeline-node">{number}</span>{index !== PIPELINE.length - 1 && <span className="pipeline-connector" />}</div><div className="pipeline-copy"><strong>{title}</strong><span>{description}</span></div></div>)}</div><div className="rail-footer"><div className="rail-footer-icon"><Check size={15} /></div><div><strong>Grounded analysis</strong><span>Reported numbers are checked against the calculated production data.</span></div></div></aside>
      </div>
    </main>
  );
}
