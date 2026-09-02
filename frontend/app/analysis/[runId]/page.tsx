"use client";

import { AlertTriangle, ArrowLeft, Check, CheckCircle2, Download, FileText, Mail, Send, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import "./run.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

type Result = {
  kpi_results?: { overall?: Record<string, number | null> };
  analysis_executive_summary?: string;
  analysis_key_findings?: string[];
  analysis_likely_causes?: string[];
  analysis_recommendations?: string[];
  chart_paths?: string[];
  report_path?: string | null;
  verification_passed?: boolean | null;
  verification_issues?: string[];
};

type Run = { run_id: string; filename?: string; process_type?: string; status?: string; stage?: string; progress?: number; message?: string; error?: unknown; created_at?: string; result?: Result | null };

const STAGES = ["ingestion", "validation", "kpi", "analysis", "visualization", "report", "verification", "notification"];
const STAGE_LABELS: Record<string, string> = { ingestion: "Ingestion", validation: "Validation", kpi: "KPI computation", analysis: "Analysis", visualization: "Visualization", report: "Report generation", verification: "Verification", notification: "Delivery" };

function formatNumber(value?: number | null, suffix = "") { return typeof value === "number" ? `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)}${suffix}` : "—"; }
function title(value?: string) { return value ? value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Weaving"; }
function errorText(error: unknown) { if (!error) return "The analysis could not be completed."; if (typeof error === "string") return error; if (typeof error === "object" && error && "message" in error) return String(error.message); return "The analysis could not be completed."; }

export default function AnalysisRunPage() {
  const params = useParams<{ runId: string }>();
  const runId = Array.isArray(params.runId) ? params.runId[0] : params.runId;
  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState("");
  const [recipient, setRecipient] = useState("");
  const [channel, setChannel] = useState<"email" | "telegram">("email");
  const [sending, setSending] = useState(false);
  const [deliveryMessage, setDeliveryMessage] = useState("");

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`${API_URL}/runs/${encodeURIComponent(runId)}`, { cache: "no-store" });
        if (!response.ok) throw new Error("This analysis run could not be found.");
        const data = await response.json() as Run;
        if (!cancelled) { setRun(data); setRequestError(""); }
      } catch (reason) { if (!cancelled) setRequestError(reason instanceof Error ? reason.message : "Unable to load this analysis."); }
      finally { if (!cancelled) setLoading(false); }
    };
    void load();
    const timer = window.setInterval(() => { if (run?.status !== "completed" && run?.status !== "failed") void load(); }, 2500);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [run?.status, runId]);

  const completed = run?.status === "completed";
  const failed = run?.status === "failed" || Boolean(run?.error);
  const currentIndex = Math.max(0, STAGES.indexOf(run?.stage ?? ""));
  const result = run?.result;
  const metrics = useMemo(() => result?.kpi_results?.overall ?? {}, [result]);

  async function sendReport() {
    if (!recipient.trim() || !runId) { setDeliveryMessage("Enter an email address or Telegram chat ID."); return; }
    setSending(true); setDeliveryMessage("");
    try {
      const response = await fetch(`${API_URL}/runs/${encodeURIComponent(runId)}/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel, recipient: recipient.trim() }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof body?.detail === "string" ? body.detail : "Unable to send the report.");
      setDeliveryMessage("Report sent successfully.");
    } catch (reason) { setDeliveryMessage(reason instanceof Error ? reason.message : "Unable to send the report."); }
    finally { setSending(false); }
  }

  if (loading) return <main className="run-page"><div className="run-loading"><span /><div><strong>Loading analysis run</strong><p>Retrieving the latest pipeline state.</p></div></div></main>;
  if (requestError) return <main className="run-page"><section className="run-error"><AlertTriangle size={20} /><div><h1>Analysis unavailable</h1><p>{requestError}</p><Link href="/analyze">Start a new analysis</Link></div></section></main>;

  return <main className="run-page">
    <Link href="/analyze" className="run-back"><ArrowLeft size={15} /> New analysis</Link>
    <header className="run-heading"><div><span className="run-eyebrow">{title(run?.process_type)} production intelligence</span><h1>{completed ? "Analysis results" : failed ? "Analysis needs attention" : "Analysis in progress"}</h1><p>{run?.filename || "Production dataset"} · {run?.message || "Preparing your analysis."}</p></div><div className={`run-status ${completed ? "complete" : failed ? "failed" : "running"}`}><span />{completed ? "Completed" : failed ? "Failed" : "Processing"}</div></header>

    {failed ? <section className="run-error"><AlertTriangle size={20} /><div><h2>Fibrion could not complete this run</h2><p>{errorText(run?.error)}</p></div></section> : !completed ? <section className="progress-panel"><div className="progress-heading"><div><span className="run-eyebrow">Live pipeline</span><h2>{STAGE_LABELS[run?.stage ?? ""] || "Preparing analysis"}</h2></div><strong>{Math.round(run?.progress ?? 0)}%</strong></div><div className="progress-track"><span style={{ width: `${Math.max(2, run?.progress ?? 0)}%` }} /></div><div className="stage-grid">{STAGES.map((stage, index) => <div key={stage} className={`stage ${index < currentIndex ? "done" : index === currentIndex ? "active" : ""}`}><span>{index < currentIndex ? <Check size={13} /> : String(index + 1).padStart(2, "0")}</span><div><strong>{STAGE_LABELS[stage]}</strong><small>{index < currentIndex ? "Complete" : index === currentIndex ? "Processing" : "Waiting"}</small></div></div>)}</div></section> : <>
      <section className="verified-banner"><ShieldCheck size={22} /><div><span>QUALITY GATE</span><h2>{result?.verification_passed === false ? "Report completed with verification issues" : "Verified analysis ready"}</h2><p>{result?.verification_passed === false ? "Review the reported verification notes before distributing this report." : "The reported figures and generated artifacts have passed Fibrion’s final checks."}</p></div>{result?.report_path && <a href={`${API_URL}/runs/${encodeURIComponent(runId)}/report`} className="download-report"><Download size={16} /> Download PDF</a>}</section>
      <section className="metric-grid-results"><Metric label="Produced grey fabric" value={formatNumber(metrics.total_produced_grey_yds, " yds")} /><Metric label="Fulfillment" value={formatNumber(metrics.overall_fulfillment_pct, "%")} /><Metric label="Rejection" value={formatNumber(metrics.overall_rejection_pct, "%")} /><Metric label="Shrink variance" value={formatNumber(metrics.avg_shrink_variance_pct, "%")} /></section>
      <section className="results-grid"><div className="results-main"><ResultSection eyebrow="Executive summary" title="What the data says"><p className="summary-copy">{result?.analysis_executive_summary || "The analytical summary is not available for this run."}</p></ResultSection><InsightList title="Key findings" items={result?.analysis_key_findings} /><InsightList title="Likely causes" items={result?.analysis_likely_causes} /><InsightList title="Recommended actions" items={result?.analysis_recommendations} /></div><aside className="results-side"><ResultSection eyebrow="Report delivery" title="Send the verified PDF"><div className="delivery-toggle"><button className={channel === "email" ? "selected" : ""} onClick={() => setChannel("email")}><Mail size={14} /> Email</button><button className={channel === "telegram" ? "selected" : ""} onClick={() => setChannel("telegram")}><Send size={14} /> Telegram</button></div><input value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder={channel === "email" ? "manager@company.com" : "Telegram chat ID"} /><button className="send-button" onClick={sendReport} disabled={sending}>{sending ? "Sending..." : "Send report"}</button>{deliveryMessage && <p className="delivery-message">{deliveryMessage}</p>}</ResultSection><ResultSection eyebrow="Verification" title="Quality gate"><p className={result?.verification_passed === false ? "verification-warning" : "verification-pass"}>{result?.verification_passed === false ? "Review required" : "Verification passed"}</p>{result?.verification_issues?.map((issue) => <p className="verification-issue" key={issue}>{issue}</p>)}</ResultSection></aside></section>
      {result?.chart_paths?.length ? <section className="charts-section"><div><span className="run-eyebrow">Generated visuals</span><h2>Production charts</h2></div><div className="chart-grid">{result.chart_paths.map((path) => { const name = path.split(/[\\/]/).pop() || path; return <figure key={path}><img src={`${API_URL}/runs/${encodeURIComponent(runId)}/charts/${encodeURIComponent(name)}`} alt="Generated production analysis chart" /><figcaption>{name.replace(/[_-]+/g, " ").replace(/\.png$/i, "")}</figcaption></figure>; })}</div></section> : null}
    </>}
  </main>;
}

function Metric({ label, value }: { label: string; value: string }) { return <article className="result-metric"><span>{label}</span><strong>{value}</strong></article>; }
function ResultSection({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) { return <section className="result-section"><span className="run-eyebrow">{eyebrow}</span><h2>{title}</h2>{children}</section>; }
function InsightList({ title, items }: { title: string; items?: string[] }) { if (!items?.length) return null; return <section className="result-section"><h2>{title}</h2><ul className="insight-list">{items.map((item) => <li key={item}><CheckCircle2 size={15} />{item}</li>)}</ul></section>; }
