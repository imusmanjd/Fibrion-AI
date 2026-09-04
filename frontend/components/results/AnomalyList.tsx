/**
 * frontend/components/results/AnomalyList.tsx
 *
 * kpi_agent.py flags anomalies with a z-score threshold (>2.0 std
 * dev from the group mean), not a severity label — so severity here
 * is derived from the magnitude of z_score, not read off the API.
 * Shape: { group_key, group_value, metric, value, run_mean, z_score }
 *
 * Capped to a handful visible by default — datasets can trip dozens
 * of anomalies, which used to push this section to half the page.
 */

"use client";

import { useState } from "react";
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
        <span className="status-pill-dot" style={{ background: "var(--ok)" }} />
        No anomalies detected in this run.
      </div>
    );
  }

  // Most severe first, so the capped view surfaces what matters most.
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
                  {humanizeGroupKey(anomaly.group_key)} {anomaly.group_value}
                </strong>

                <span>
                  {humanizeMetric(anomaly.metric)} is {anomaly.value} —{" "}
                  {direction} the run average of {anomaly.run_mean}
                </span>
              </div>

              <span className="anomaly-zscore" title="Standard deviations from the mean">
                z {anomaly.z_score > 0 ? "+" : ""}
                {anomaly.z_score}
              </span>
            </li>
          );
        })}
      </ul>

      {sorted.length > COLLAPSED_COUNT && (
        <button
          type="button"
          className="button button-secondary"
          style={{ marginTop: 10 }}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Show fewer" : `View all ${sorted.length} anomalies (${hiddenCount} more)`}
        </button>
      )}
    </>
  );
}