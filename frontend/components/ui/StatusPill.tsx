import type { RunStatus } from "@/lib/types";

const LABELS: Record<RunStatus, string> = {
  queued: "Queued",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
};

export default function StatusPill({ status }: { status: RunStatus }) {
  return (
    <span className={`status-pill status-pill-${status}`}>
      <span className="status-pill-dot" />
      {LABELS[status]}
    </span>
  );
}