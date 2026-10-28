"use client";

import { useMemo } from "react";
import { useImageBasePath } from "@/features/results/context/ImageDataContext";
import {
  getFullImageUrl,
  getCompositionLinesUrl,
} from "@/features/results/config/dataSource";
import { parseCompositionLinesJson } from "@/features/results/lib/compositionLines";
import { useImageLayoutMeasurement } from "@/features/results/lib/useImageLayoutMeasurement";
import { useFetchJson } from "@/features/results/lib/useFetchJson";
import "../ColumnCard.css";
import "./CompositionLinesView.css";

function getViewBox(segments) {
  if (!segments.length) return "0 0 100 100";
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const { start, end } of segments) {
    for (const [x, y] of [start, end]) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  const pad = 10;
  const w = Math.max(maxX - minX + 2 * pad, 1);
  const h = Math.max(maxY - minY + 2 * pad, 1);
  return `${minX - pad} ${minY - pad} ${w} ${h}`;
}

export default function CompositionLinesView({
  className = "",
}) {
  const basePath = useImageBasePath();

  const compositionUrl = useMemo(() => getCompositionLinesUrl(basePath), [basePath]);
  const { data: json, error, missing } = useFetchJson(compositionUrl);

  const originalImageUrl = useMemo(
    () => getFullImageUrl(basePath),
    [basePath],
  );

  const {
    stackRef, imgRef, imageLayout, imageNaturalSize,
    setImageNaturalSize, measureImageLayout,
  } = useImageLayoutMeasurement(originalImageUrl);

  const segments = useMemo(
    () => (json ? parseCompositionLinesJson(json) : []),
    [json],
  );

  const viewBox = useMemo(() => {
    if (imageNaturalSize?.width != null && imageNaturalSize?.height != null) {
      return `0 0 ${imageNaturalSize.width} ${imageNaturalSize.height}`;
    }
    return getViewBox(segments);
  }, [segments, imageNaturalSize]);

  if (error) {
    return (
      <article className={`column-card column-card--error ${className}`}>
        <header className="column-card__title">Composition lines</header>
        <div className="column-card__content">{missing ? 'Not included in this analysis' : 'Composition lines unavailable'}</div>
      </article>
    );
  }

  if (!json) {
    return (
      <article className={`column-card column-card--loading ${className}`}>
        <header className="column-card__title">Composition lines</header>
        <div className="column-card__content">Loading…</div>
      </article>
    );
  }

  if (!segments.length) {
    return (
      <article className={`column-card column-card--empty ${className}`}>
        <header className="column-card__title">Composition lines</header>
        <div className="column-card__content">No lines</div>
      </article>
    );
  }

  return (
    <article className={`column-card ${className}`}>
      <header className="column-card__title">Composition lines</header>
      <div className="column-card__content">
        <div ref={stackRef} className="composition-lines-view__stack">
          <img
            ref={imgRef}
            src={originalImageUrl}
            alt="Original (grayscale)"
            className="composition-lines-view__image"
            onLoad={(e) => {
              const { naturalWidth, naturalHeight } = e.target;
              if (naturalWidth && naturalHeight) {
                setImageNaturalSize({ width: naturalWidth, height: naturalHeight });
                requestAnimationFrame(measureImageLayout);
              }
            }}
          />
          {imageLayout && imageLayout.width > 0 && imageLayout.height > 0 && (
            <svg
              className="composition-lines-view__svg"
              viewBox={viewBox}
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                left: imageLayout.left,
                top: imageLayout.top,
                width: imageLayout.width,
                height: imageLayout.height,
                pointerEvents: "none",
              }}
            >
              {segments.map(({ start, end }, i) => (
                <line
                  key={i}
                  x1={start[0]}
                  y1={start[1]}
                  x2={end[0]}
                  y2={end[1]}
                  className="composition-lines-view__line"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          )}
        </div>
      </div>
    </article>
  );
}
