type Status =
  | "idle"
  | "running"
  | "processing"
  | "completed"
  | "success"
  | "failed"
  | "warning"
  | "pending";

type StatusBadgeProps = {
  status: Status;
  label?: string;
  dot?: boolean;
};

const labels: Record<Status, string> = {
  idle: "Idle",
  running: "Running",
  processing: "Processing",
  completed: "Completed",
  success: "Success",
  failed: "Failed",
  warning: "Warning",
  pending: "Pending",
};

export default function StatusBadge({
  status,
  label,
  dot = true,
}: StatusBadgeProps) {
  return (
    <span
      className={`status-badge status-badge--${status}`}
      data-status={status}
    >
      {dot && <span className="status-badge__dot" aria-hidden="true" />}
      <span>{label ?? labels[status]}</span>
    </span>
  );
}