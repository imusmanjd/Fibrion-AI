/**
 * frontend/lib/types.ts
 *
 * Types transcribed directly from the backend response shapes
 * (backend/services/run_store.py, backend/agents/*.py) — not
 * aspirational. Every field here has been checked against the
 * actual Python that produces it.
 */

export type RunStatus = "queued" | "running" | "completed" | "failed";

/**
 * Fibrion's only currently-registered process module. Others
 * mentioned in the README (spinning, dyeing/finishing, garment) are
 * planned but not registered in backend/core/schema_registry — the
 * API rejects anything else with "Unknown process type".
 */
export type ProcessType = "weaving";

export interface Anomaly {
  group_key: string;
  group_value: string | number;
  metric: string;
  value: number;
  run_mean: number;
  z_score: number;
}

export interface KpiResults {
  overall?: Record<string, number | null>;
  by_order?: Record<string, unknown>[];
  monthly_production_yds?: Record<string, number>;
  [key: string]: unknown;
}

export interface RunResult {
  report_path?: string | null;
  chart_paths?: string[];

  kpi_results?: KpiResults;
  anomalies?: Anomaly[];

  analysis_text?: string;
  analysis_executive_summary?: string;
  analysis_key_findings?: string[];
  analysis_likely_causes?: string[];
  analysis_recommendations?: string[];

  verification_passed?: boolean;
  verification_issues?: string[];
  verification_advisory_issues?: string[];

  error?: Record<string, unknown> | string | null;

  [key: string]: unknown;
}

/** Exact shape of a GET /runs/{run_id} response. */
export interface AnalysisRun {
  run_id: string;
  filename: string;
  process_type: string;
  status: RunStatus;

  /** Current pipeline stage key, e.g. "kpi", "verification", "complete". */
  stage: string;

  message: string;
  progress: number;

  error: Record<string, unknown> | string | null;
  result: RunResult | null;

  created_at: string;
  updated_at: string;
}

export interface UploadResponse {
  run_id: string;
  status: string;
  message: string;
}