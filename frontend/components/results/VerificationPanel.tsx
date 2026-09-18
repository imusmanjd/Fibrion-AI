/**
 * frontend/components/results/VerificationPanel.tsx
 */

"use client";

import { useState } from "react";
import { ShieldCheck, AlertCircle, ChevronDown, ChevronUp, Info } from "lucide-react";

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

        <div className="verification-summary-text">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>
              {passed
                ? "Dual-Truth Verification Passed"
                : "Verification Found Blocking Discrepancies"}
            </span>
            {passed && <ShieldCheck className="w-4 h-4" style={{ color: "var(--ok)" }} />}
          </div>

          {hasDetail ? (
            <small>
              {blockingCount > 0 &&
                `${blockingCount} blocking issue${blockingCount === 1 ? "" : "s"}`}
              {blockingCount > 0 && advisoryCount > 0 && " · "}
              {advisoryCount > 0 &&
                `${advisoryCount} advisory note${advisoryCount === 1 ? "" : "s"}`}
            </small>
          ) : (
            <small>All AI-generated narrative claims match verified mathematical ground truth.</small>
          )}
        </div>

        {hasDetail && (
          <span className="verification-toggle" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span>{open ? "Hide Details" : "Show Details"}</span>
            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        )}
      </button>

      {open && hasDetail && (
        <div className="verification-detail">
          {blockingCount > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--fault)", marginBottom: 8 }}>
                <AlertCircle className="w-4 h-4" />
                <h4 style={{ margin: 0, color: "var(--fault)" }}>Blocking Issues</h4>
              </div>
              <ul>
                {issues!.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {advisoryCount > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--accent-vivid)", marginBottom: 8 }}>
                <Info className="w-4 h-4" />
                <h4 style={{ margin: 0, color: "var(--accent-vivid)" }}>Advisory Notes</h4>
              </div>
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
