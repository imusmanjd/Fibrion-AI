/**
 * frontend/components/results/AnomalyList.tsx
 */

"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { humanizeGroupKey, humanizeMetric } from "./format";

type Anomaly = {
  group_key: string;
  group_value: string | number;
  metric: string;
  value: number;
  run_mean: number;
  z_score: number;
};

type AnomalyListProps = {
  anomalies: Anomaly[] | null | undefined;
};

const COLLAPSED_COUNT = 5;

function severityOf(zScore: number): "warning" | "danger" {
  return Math.abs(zScore) >= 3 ? "danger" : "warning";
}

export default function AnomalyList({ anomalies }: AnomalyListProps) {
  const [expanded, setExpanded] = useState(false);

  const list = anomalies ?? [];

  if (list.length === 0) {
    return (
      <div className="anomaly-empty">
        <CheckCircle2 className="w-4 h-4" style={{ color: "var(--accent-vivid)" }} />
        <span>No operational anomalies detected in this run. All metrics fell within expected standard deviations.</span>
      </div>
    );
  }

  const sorted = [...list].sort(
    (a, b) => Math.abs(b.z_score) - Math.abs(a.z_score),
  );
  const visible = expanded ? sorted : sorted.slice(0, COLLAPSED_COUNT);
  const hiddenCount = sorted.length - visible.length;

  return (
    <>
      <ul className="anomaly-list">
        {visible.map((anomaly, index) => {
          const severity = severityOf(anomaly.z_score);
          const direction = anomaly.value > anomaly.run_mean ? "above" : "below";

          return (
            <li
              className="anomaly-row"
              key={`${anomaly.group_key}-${anomaly.group_value}-${anomaly.metric}-${index}`}
            >
              <span
                className={`anomaly-dot anomaly-dot-${severity}`}
                aria-hidden="true"
              />

              <div className="anomaly-copy">
                <strong>
                  {humanizeGroupKey(anomaly.group_key)}: {anomaly.group_value}
                </strong>

                <span>
                  {humanizeMetric(anomaly.metric)} is <strong>{anomaly.value}</strong> —{" "}
                  {direction} the run average of {anomaly.run_mean}
                </span>
              </div>

              <span className="anomaly-zscore" title="Standard deviations from the mean">
                z {anomaly.z_score > 0 ? "+" : ""}
                {anomaly.z_score}σ
              </span>
            </li>
          );
        })}
      </ul>

      {sorted.length > COLLAPSED_COUNT && (
        <button
          type="button"
          className="button button-secondary"
          style={{ marginTop: 12, fontSize: 12.5 }}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? (
            <>
              <span>Collapse anomaly list</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <span>View all {sorted.length} anomalies ({hiddenCount} hidden)</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}
    </>
  );
}
