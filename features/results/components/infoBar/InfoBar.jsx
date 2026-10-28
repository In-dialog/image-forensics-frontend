"use client";

import { useMemo } from "react";
import { useImageData } from "@/features/results/context/ImageDataContext";
import { getExtractGroup, getImageDimensions } from "@/features/results/lib/extract";
import "./InfoBar.css";

function countByType(extracts) {
  if (!Array.isArray(extracts)) return {};
  const counts = {};
  for (const ex of extracts) {
    const type = getExtractGroup(ex);
    counts[type] = (counts[type] ?? 0) + 1;
  }
  return counts;
}

export default function InfoBar() {
  const data = useImageData();
  const summary = useMemo(() => {
    const dims = getImageDimensions(data);
    if (!dims || !data?.extracts) return null;
    const imageName = data.metadata.source_image ?? null;
    const byType = countByType(data.extracts);
    const typeEntries = Object.entries(byType).sort((a, b) => b[1] - a[1]);
    return {
      imageName,
      width: dims.width,
      height: dims.height,
      total: data.extracts.length,
      typeCount: typeEntries.length,
      byType: typeEntries,
    };
  }, [data]);

  return (
    <footer className="infobar" role="contentinfo">
      <div className="infobar__content">
        {summary ? (
          <>
            {summary.imageName != null && (
              <>
                <span className="infobar__text">Image name: {summary.imageName}</span>
                <span className="infobar__separator"> ||| </span>
              </>
            )}
            <span className="infobar__text">
              Image resolution: {summary.width} × {summary.height}
            </span>
            <span className="infobar__separator"> ||| </span>
            <span className="infobar__text">
              Image contains: {summary.total} item{summary.total !== 1 ? "s" : ""}
              {summary.typeCount > 0
                ? ` in ${summary.typeCount} type${summary.typeCount !== 1 ? "s" : ""} (${summary.byType.map(([t, n]) => `${t}: ${n}`).join(", ")})`
                : ""}
            </span>
          </>
        ) : (
          <span className="infobar__text">Ready</span>
        )}
      </div>
    </footer>
  );
}
