import type { ReactNode } from "react";

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  meta?: ReactNode;
  className?: string;
};

export default function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  meta,
  className = "",
}: SectionHeaderProps) {
  return (
    <div className={`section-header ${className}`}>
      <div className="section-header__content">
        {eyebrow && (
          <div className="section-header__eyebrow">{eyebrow}</div>
        )}

        <div className="section-header__title-row">
          <h2 className="section-header__title">{title}</h2>

          {meta && (
            <div className="section-header__meta">
              {meta}
            </div>
          )}
        </div>

        {description && (
          <p className="section-header__description">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="section-header__action">
          {action}
        </div>
      )}
    </div>
  );
}