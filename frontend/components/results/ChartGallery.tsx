/**
 * frontend/components/results/ChartGallery.tsx
 */

"use client";

import { useState } from "react";
import { ZoomIn, X } from "lucide-react";
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
        description="This run did not produce diagnostic visual chart outputs."
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
            style={{ position: "relative" }}
          >
            <div style={{ position: "relative", overflow: "hidden", height: 160 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={chart.url} alt={chart.label} loading="lazy" />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0,
                  transition: "opacity var(--ease)",
                }}
                className="hover:opacity-100 flex items-center justify-center opacity-0 absolute inset-0 bg-black/40 hover:backdrop-blur-sm"
              >
                <ZoomIn className="w-5 h-5 text-white" />
              </div>
            </div>
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
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </>
  );
}
