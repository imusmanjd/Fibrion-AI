/**
 * frontend/components/results/VerificationPanel.tsx
 *
 * Fields come from verification_agent.py:
 *   verification_passed (bool)
 *   verification_issues (string[], blocking — numeric grounding /
 *     structural checks that failed. Verification fails if any exist.)
 *   verification_advisory_issues (string[], non-blocking — LLM
 *     readability notes. These never fail a run.)
 *
 * Collapsed by default: a trust signal, not primary real estate.
 */

"use client";

import { useState } from "react";

type VerificationPanelProps = {
  passed?: boolean | null;
  issues?: string[] | null;
  advisoryIssues?: string[] | null;
};

export default function VerificationPanel({
  passed,
  issues,
  advisoryIssues,
}: VerificationPanelProps) {
  const [open, setOpen] = useState(false);

  const blockingCount = issues?.length ?? 0;
  const advisoryCount = advisoryIssues?.length ?? 0;
  const hasDetail = blockingCount > 0 || advisoryCount > 0;

  return (
    <div className="verification-panel">
      <button
        type="button"
        className="verification-summary"
        onClick={() => hasDetail && setOpen((value) => !value)}
        aria-expanded={open}
        disabled={!hasDetail}
      >
        <span
          className={`verification-status-dot ${
            passed ? "verification-pass" : "verification-fail"
          }`}
        />

        <span className="verification-summary-text">
          {passed
            ? "Verification passed"
            : "Verification found blocking issues"}
          {hasDetail && (
            <small>
              {blockingCount > 0 &&
                `${blockingCount} blocking issue${blockingCount === 1 ? "" : "s"}`}
              {blockingCount > 0 && advisoryCount > 0 && " · "}
              {advisoryCount > 0 &&
                `${advisoryCount} advisory note${advisoryCount === 1 ? "" : "s"}`}
            </small>
          )}
        </span>

        {hasDetail && (
          <span className="verification-toggle">
            {open ? "Hide detail" : "Show detail"}
          </span>
        )}
      </button>

      {open && hasDetail && (
        <div className="verification-detail">
          {blockingCount > 0 && (
            <div>
              <h4>Blocking issues</h4>
              <ul>
                {issues!.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {advisoryCount > 0 && (
            <div>
              <h4>Advisory notes</h4>
              <ul>
                {advisoryIssues!.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}