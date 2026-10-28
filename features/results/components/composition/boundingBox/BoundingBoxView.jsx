"use client";

import { useMemo } from "react";
import { useImageData } from "@/features/results/context/ImageDataContext";
import { getFullImageUrl } from "@/features/results/config/dataSource";
import {
  getBoundingBoxesFromMetadata,
  takeLargestBoundingBoxes,
  getVisibleBoxEdges,
} from "@/features/results/lib/boundingBox";
import { useImageLayoutMeasurement } from "@/features/results/lib/useImageLayoutMeasurement";
import "../ColumnCard.css";
import "./BoundingBoxView.css";

const DEFAULT_TOP_N = 15;

export default function BoundingBoxView({
  topN = DEFAULT_TOP_N,
  className = "",
}) {
  const data = useImageData();
  const metadata = data?.metadata ?? null;
  const basePath = data?.basePath;

  const originalImageUrl = useMemo(
    () => (basePath ? getFullImageUrl(basePath) : null),
    [basePath],
  );

  const {
    stackRef, imgRef, imageLayout, imageNaturalSize,
    setImageNaturalSize, measureImageLayout,
  } = useImageLayoutMeasurement(originalImageUrl);

  const boxes = useMemo(() => {
    const raw = metadata ? getBoundingBoxesFromMetadata(metadata) : [];
    return takeLargestBoundingBoxes(raw, topN);
  }, [metadata, topN]);

  const visibleSegments = useMemo(() => getVisibleBoxEdges(boxes), [boxes]);

  const viewBox = useMemo(() => {
    const w = metadata?.image_width ?? imageNaturalSize?.width ?? 100;
    const h = metadata?.image_height ?? imageNaturalSize?.height ?? 100;
    return `0 0 ${w} ${h}`;
  }, [metadata?.image_width, metadata?.image_height, imageNaturalSize]);

  if (!data) {
    return (
      <article className={`column-card column-card--loading ${className}`}>
        <header className="column-card__title">Bounding boxes</header>
        <div className="column-card__content">Loading…</div>
      </article>
    );
  }

  if (!boxes.length) {
    return (
      <article className={`column-card column-card--empty ${className}`}>
        <header className="column-card__title">Bounding boxes</header>
        <div className="column-card__content">No boxes</div>
      </article>
    );
  }

  return (
    <article className={`column-card ${className}`}>
      <header className="column-card__title">Bounding boxes</header>
      <div className="column-card__content">
        <div ref={stackRef} className="bounding-box-view__stack">
          <img
            ref={imgRef}
            src={originalImageUrl}
            alt="Original (grayscale)"
            className="bounding-box-view__image"
            onLoad={(e) => {
              const { naturalWidth, naturalHeight } = e.target;
              if (naturalWidth && naturalHeight) {
                setImageNaturalSize({
                  width: naturalWidth,
                  height: naturalHeight,
                });
                requestAnimationFrame(measureImageLayout);
              }
            }}
          />
          {imageLayout && imageLayout.width > 0 && imageLayout.height > 0 && (
            <svg
              className="bounding-box-view__svg"
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
              {visibleSegments.map(({ start, end }, i) => (
                <line
                  key={i}
                  x1={start[0]}
                  y1={start[1]}
                  x2={end[0]}
                  y2={end[1]}
                  className="bounding-box-view__rect"
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
