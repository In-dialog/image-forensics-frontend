"use client";

import { useMemo } from "react";
import { useImageBasePath } from "@/features/results/context/ImageDataContext";
import {
  getForgeryDetectionUrl,
  getForgeryDetectionImageUrl,
} from "@/features/results/config/dataSource";
import { useFetchJson } from "@/features/results/lib/useFetchJson";
import PercentageDisplay from "@/features/results/components/templates/percentageDisplay/PercentageDisplay";
import SyntheticAnalysisView from "./SyntheticAnalysisView";
import "./ForgeryDetectionView.css";

/** Parse range string like "0 to 10" or "0.0 to 1.0" (or inside text like "heatmap (0.0 to 1.0)") into [min, max]. */
function parseRange(scaleDesc) {
  if (scaleDesc == null) return [0, 1];
  const s = String(scaleDesc);
  const m = s.match(/(\d+(?:\.\d+)?)\s*to\s*(\d+(?:\.\d+)?)/i);
  return m ? [parseFloat(m[1], 10), parseFloat(m[2], 10)] : [0, 1];
}

export default function ForgeryDetectionView() {
  const basePath = useImageBasePath();
  const url = useMemo(() => getForgeryDetectionUrl(basePath), [basePath]);
  const { data: raw, error, loading } = useFetchJson(url);

  const entries = useMemo(() => {
    if (!raw || typeof raw !== "object") return [];
    return Object.entries(raw).filter(
      ([, data]) => data && typeof data === "object"
    );
  }, [raw]);

  if (loading)
    return (
      <div className="forgery-detection-view">
        <p>Loading…</p>
      </div>
    );
  if (error)
    return (
      <div className="forgery-detection-view">
        <p className="forgery-detection-view__error">Failed to load.</p>
      </div>
    );
  if (!entries.length)
    return (
      <div className="forgery-detection-view">
        <p>No data.</p>
      </div>
    );

  return (
    <div className="forgery-detection-view">
      <div className="forgery-detection-view__content">
        <SyntheticAnalysisView />
        <div className="forgery-detection-view__grid">
      {entries.map(([detectorKey, item]) => {
        const score = item.score;
        if (typeof score !== "number") return null;
        const range = parseRange(item.range);
        const title = item.label ?? detectorKey;
        const explanation = item.description ?? "";
        const imageFile = item.heatmap_file ?? item.mask_file;
        const imageSrc = imageFile
          ? getForgeryDetectionImageUrl(basePath, detectorKey, imageFile)
          : "";
        return (
          <section
            key={detectorKey}
            className="forgery-detection-view__item"
            data-item={detectorKey}
          >
            <div className="forgery-detection-view__displays">
              <PercentageDisplay
                value={score}
                range={range}
                title={title}
                explanation={explanation}
                imageSrc={imageSrc}
                imageAlt={title}
              />
            </div>
          </section>
        );
      })}
        </div>
      </div>
    </div>
  );
}
