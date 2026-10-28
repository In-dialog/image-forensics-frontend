"use client";

import { useMemo } from "react";
import { useImageBasePath } from "@/features/results/context/ImageDataContext";
import { getSyntheticAnalysisUrl, getFullImageUrl } from "@/features/results/config/dataSource";
import { useFetchJson } from "@/features/results/lib/useFetchJson";
import PercentageDisplay from "@/features/results/components/templates/percentageDisplay/PercentageDisplay";
import "./SyntheticAnalysisView.css";

/** Parse range string like "0 to 10" into [min, max]. */
function parseRange(scaleDesc) {
  if (scaleDesc == null) return [0, 1];
  const s = String(scaleDesc);
  const m = s.match(/(\d+(?:\.\d+)?)\s*to\s*(\d+(?:\.\d+)?)/i);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : [0, 1];
}

export default function SyntheticAnalysisView() {
  const basePath = useImageBasePath();
  const url = useMemo(() => getSyntheticAnalysisUrl(basePath), [basePath]);
  const { data: raw, error, loading } = useFetchJson(url);
  const imageSrc = useMemo(
    () => getFullImageUrl(basePath),
    [basePath]
  );

  if (loading)
    return (
      <div className="synthetic-analysis-view">
        <p>Loading…</p>
      </div>
    );
  if (error)
    return (
      <div className="synthetic-analysis-view">
        <p className="synthetic-analysis-view__error">Failed to load.</p>
      </div>
    );
  if (!raw || typeof raw !== "object")
    return (
      <div className="synthetic-analysis-view">
        <p>No data.</p>
      </div>
    );

  const score = raw.score;
  if (typeof score !== "number")
    return (
      <div className="synthetic-analysis-view">
        <p>No data.</p>
      </div>
    );

  const range = parseRange(raw.range);
  const title = raw.label ?? "AI / Synthetic Detection";
  const explanation = raw.description ?? "";

  return (
    <div className="synthetic-analysis-view">
      <div className="synthetic-analysis-view__displays">
        <PercentageDisplay
          value={score}
          range={range}
          title={title}
          explanation={explanation}
          imageSrc={imageSrc}
          imageAlt={title}
        />
      </div>
    </div>
  );
}
