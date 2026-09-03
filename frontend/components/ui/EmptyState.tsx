import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-mark">—</div>

      <div className="empty-state-body">
        <h3>{title}</h3>
        <p>{description}</p>
        {action}
      </div>
    </div>
  );
}