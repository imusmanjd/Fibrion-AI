/**
 * frontend/components/results/ChartGallery.tsx
 *
 * chart_paths from the API are full server-side file paths ending in
 * "<name>.png" (see visualization_agent.py). We only need the
 * filename to build a URL via getChartUrl().
 */

"use client";

import { useState } from "react";
import { getChartUrl } from "@/lib/api";
import EmptyState from "@/components/ui/EmptyState";
import { basename, humanizeKey } from "./format";

type ChartGalleryProps = {
  runId: string;
  chartPaths?: string[] | null;
};

export default function ChartGallery({ runId, chartPaths }: ChartGalleryProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const charts = (chartPaths ?? []).map((path) => {
    const name = basename(path);

    return {
      name,
      label: humanizeKey(name.replace(/\.png$/i, "")),
      url: getChartUrl(runId, name),
    };
  });

  if (charts.length === 0) {
    return (
      <EmptyState
        title="No charts generated"
        description="This run did not produce chart output."
      />
    );
  }

  return (
    <>
      <div className="chart-gallery">
        {charts.map((chart) => (
          <button
            type="button"
            key={chart.name}
            className="chart-tile"
            onClick={() => setExpanded(chart.url)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={chart.url} alt={chart.label} loading="lazy" />
            <span>{chart.label}</span>
          </button>
        ))}
      </div>

      {expanded && (
        <div
          className="chart-lightbox"
          role="dialog"
          aria-modal="true"
          onClick={() => setExpanded(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={expanded} alt="" />

          <button
            type="button"
            className="chart-lightbox-close"
            onClick={() => setExpanded(null)}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}