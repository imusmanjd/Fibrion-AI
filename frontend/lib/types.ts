export type RunStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed";

export type StageStatus =
  | "pending"
  | "running"
  | "completed";

export interface PipelineStage {
  name: string;
  label: string;
  status: StageStatus;
  started_at: string | null;
  completed_at: string | null;
}

export interface RunResult {
  run_id?: string;
  file_path?: string;
  cleaned_data_path?: string;
  process_type?: string;

  validation_results?: Record<string, unknown>;
  kpi_results?: Record<string, any>;
  anomalies?: any[];

  analysis_executive_summary?: string;
  analysis_key_findings?: string[];
  analysis_likely_causes?: string[];
  analysis_recommendations?: string[];

  chart_paths?: string[];
  report_path?: string;

  verification_passed?: boolean;
  verification_details?: Record<string, unknown>;

  delivery_status?: Record<string, unknown>;
  error?: Record<string, unknown> | string | null;
}

export interface AnalysisRun {
  run_id: string;
  filename: string;
  process_type: string;
  status: RunStatus;

  current_stage: string | null;
  current_stage_label: string;

  message: string;

  completed_stages: string[];

  stages: Record<string, PipelineStage>;

  created_at: string;
  updated_at: string;
  completed_at: string | null;

  result: RunResult | null;
  error: unknown;
}

export interface UploadResponse {
  run_id: string;
  status: string;
  message: string;
}