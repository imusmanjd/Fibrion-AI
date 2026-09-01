import type { ReactNode } from "react";

type MetricCardProps = {
  label: string;
  value: string | number;
  description?: string;
  trend?: {
    value: string;
    direction?: "up" | "down" | "neutral";
  };
  icon?: ReactNode;
  featured?: boolean;
  className?: string;
};

export default function MetricCard({
  label,
  value,
  description,
  trend,
  icon,
  featured = false,
  className = "",
}: MetricCardProps) {
  return (
    <article
      className={[
        "metric-card",
        featured ? "metric-card--featured" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="metric-card__top">
        <span className="metric-card__label">{label}</span>

        {icon && (
          <span className="metric-card__icon">
            {icon}
          </span>
        )}
      </div>

      <div className="metric-card__value">{value}</div>

      {(description || trend) && (
        <div className="metric-card__footer">
          {description && (
            <span className="metric-card__description">
              {description}
            </span>
          )}

          {trend && (
            <span
              className={[
                "metric-card__trend",
                `metric-card__trend--${trend.direction ?? "neutral"}`,
              ].join(" ")}
            >
              {trend.direction === "up" && "↑"}
              {trend.direction === "down" && "↓"}
              {trend.direction === "neutral" && "→"}
              {trend.value}
            </span>
          )}
        </div>
      )}
    </article>
  );
}