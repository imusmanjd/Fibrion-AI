"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Activity, AlertTriangle, ArrowRight, ArrowUpRight, BarChart3, Bell, BrainCircuit, CheckCircle2, Database, FileCheck, Layers, PieChart, Search, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { listRuns } from "@/lib/api";
import type { AnalysisRun } from "@/lib/types";
import EmptyState from "@/components/ui/EmptyState";

const PIPELINE = [
  ["ingestion", "Ingestion", "Prepares raw production data", Database],
  ["validation", "Validation", "Checks data quality and structure", Search],
  ["kpi", "KPI engine", "Calculates the metrics that matter", BarChart3],
  ["analysis", "AI analysis", "Finds patterns and root causes", BrainCircuit],
  ["visualization", "Visuals", "Builds diagnostic charts", PieChart],
  ["report", "Report", "Creates an executive-ready brief", FileCheck],
  ["verification", "Verification", "Grounds claims in source data", ShieldCheck],
  ["notification", "Delivery", "Prepares results for your team", Bell],
] as const;

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export default function OverviewPage() {
  const [runs, setRuns] = useState<AnalysisRun[] | null>(null);
  useEffect(() => {
    let active = true;
    listRuns().then((result) => active && setRuns(result)).catch(() => active && setRuns([]));
    return () => { active = false; };
  }, []);

  const completed = (runs ?? []).filter((run) => run.status === "completed");
  const fulfillment = average(completed.map((run) => run.result?.kpi_results?.overall?.overall_fulfillment_pct).filter((value): value is number => typeof value === "number"));
  const rejection = average(completed.map((run) => run.result?.kpi_results?.overall?.overall_rejection_pct).filter((value): value is number => typeof value === "number"));
  const anomalyCount = completed.reduce((sum, run) => sum + (run.result?.anomalies?.length ?? 0), 0);

  return <div>
    <div className="page-heading dashboard-hero">
      <div><span className="eyebrow">WEAVING OPERATIONS INTELLIGENCE</span><h1 className="page-title">Confident production decisions, <span className="title-accent">grounded in data.</span></h1><p className="page-description">Fibrion converts weaving production data into validated KPIs, exception analysis, and management-ready reporting.</p><div className="hero-proof"><span><Activity /> System operational</span><span>Eight-stage validation</span><span>Weaving analytics</span></div></div>
      <Link href="/analyze" className="button button-primary button-large"><Sparkles /><span>Start analysis</span><ArrowUpRight /></Link>
    </div>

    <section className="section-block">
      <div className="section-header-row"><div><h2 className="section-title">Operational summary</h2><p className="section-description">Current performance indicators derived from completed analyses in this workspace.</p></div>{completed.length > 0 && <Link href="/reports" className="button button-secondary compact-button">View reports <ArrowRight /></Link>}</div>
      {runs === null ? <div className="metric-grid">{[0, 1, 2, 3].map((i) => <div className="metric-card metric-skeleton" key={i}><div /><div /></div>)}</div> : completed.length === 0 ? <EmptyState title="No analysis data available" description="Upload a production dataset to generate fulfillment, rejection, and quality performance indicators." action={<Link href="/analyze" className="button button-primary"><Sparkles /> Start an analysis</Link>} /> : <div className="metric-grid">
        <Metric label="Average fulfillment" value={fulfillment !== null ? `${fulfillment.toFixed(1)}%` : "--"} note="Target: at least 95.0%" icon={<TrendingUp />} tone="ok" />
        <Metric label="Average rejection" value={rejection !== null ? `${rejection.toFixed(1)}%` : "--"} note="Target: under 3.0%" icon={<AlertTriangle />} tone={(rejection ?? 0) > 5 ? "fault" : "default"} />
        <Metric label="Quality signals" value={String(anomalyCount)} note="Detected variance outliers" icon={<Layers />} tone={anomalyCount ? "warn" : "ok"} />
        <Metric label="Completed runs" value={String(completed.length)} note="Datasets processed successfully" icon={<CheckCircle2 />} tone="ok" />
      </div>}
    </section>

    <section className="section-block pipeline-section"><div className="section-header-row"><div><h2 className="section-title">Analysis workflow</h2><p className="section-description">A controlled, traceable workflow that prepares every result for operational review.</p></div></div><div className="pipeline-grid">{PIPELINE.map(([key, label, note, Icon], index) => <div className="pipeline-step" key={key}><span className="pipeline-number">{String(index + 1).padStart(2, "0")}</span><Icon /><div><h3>{label}</h3><p>{note}</p></div></div>)}</div></section>
  </div>;
}

function Metric({ label, value, note, icon, tone }: { label: string; value: string; note: string; icon: ReactNode; tone: "ok" | "warn" | "fault" | "default" }) {
  return <div className={`metric-card metric-card-${tone}`}><div className="metric-card-top"><span className="metric-label">{label}</span><span className="metric-icon">{icon}</span></div><div className="metric-value">{value}</div><p className="metric-note">{note}</p></div>;
}
