"use client";

import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { useImageData } from "@/features/results/context/ImageDataContext";
import { useSemanticInteraction } from "../layout/SemanticInteractionContext";
import { getFullImageUrl, getResultItemImageUrl } from "@/features/results/config/dataSource";
import { MeasurementLabels } from '../../overlays/MeasurementLabels';
import {
  getBoundingBoxesFromMetadata,
  getVisibleBoxEdges,
  getBboxCompositionSegments,
} from "@/features/results/lib/boundingBox";
import "./SegmentedMainImage.css";

const COMPOSITION_ARROW_MARKER_WIDTH = 4;
const COMPOSITION_ARROW_MARKER_HEIGHT = 4;

function getCompositionArrowMarkerGeometry(pathSize) {
  const refX = pathSize;
  const refY = pathSize / 2;
  return {
    viewBox: `0 0 ${pathSize} ${pathSize}`,
    path: `M0,0 L${pathSize},${refY} L0,${pathSize} Z`,
    refX,
    refY,
  };
}

const COMPOSITION_ARROW_GEOMETRY = getCompositionArrowMarkerGeometry(10);

export default function SegmentedMainImage({ className = "" }) {
  const data = useImageData();
  const basePath = data?.basePath;
  const interaction = useSemanticInteraction();
  const selectedKey = interaction?.selectedKey ?? null;
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [measurement, setMeasurement] = useState(null);

  const { imageUrl, overlays, imageSize } = useMemo(() => {
    if (!data?.metadata || !data?.extracts?.length) {
      return {
        imageUrl: null,
        overlays: [],
        imageSize: { width: 100, height: 100 },
      };
    }
    const { metadata, extracts } = data;
    const imageWidth = metadata.image_width ?? 1;
    const imageHeight = metadata.image_height ?? 1;
    const imageUrl = getFullImageUrl(basePath);

    const overlays = extracts
      .map((extract, i) => {
        const bbox = extract.bbox;
        if (!Array.isArray(bbox) || bbox.length < 4) return null;
        const x0 = Number(bbox[0]);
        const y0 = Number(bbox[1]);
        const x1 = Number(bbox[2]);
        const y1 = Number(bbox[3]);
        if (!Number.isFinite(x0 + y0 + x1 + y1)) return null;
        const isNormalized =
          x0 >= 0 &&
          x0 <= 1 &&
          y0 >= 0 &&
          y0 <= 1 &&
          x1 >= 0 &&
          x1 <= 1 &&
          y1 >= 0 &&
          y1 <= 1;
        const left = isNormalized ? 100 * x0 : (100 * x0) / imageWidth;
        const top = isNormalized ? 100 * y0 : (100 * y0) / imageHeight;
        const width =
          isNormalized ? 100 * (x1 - x0) : (100 * (x1 - x0)) / imageWidth;
        const height =
          isNormalized ? 100 * (y1 - y0) : (100 * (y1 - y0)) / imageHeight;
        return {
          key: extract.name ?? String(i),
          src: getResultItemImageUrl(basePath, extract),
          left,
          top,
          width,
          height,
          isNormalized,
        };
      })
      .filter(Boolean);

    return { imageUrl, overlays, imageSize: { width: imageWidth, height: imageHeight } };
  }, [data, basePath]);
  const imageLayout = measurement?.url === imageUrl ? measurement : null;

  const measureImageLayout = useCallback(() => {
    if (!containerRef.current || !imgRef.current) return;
    const img = imgRef.current;
    if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0)
      return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const boxW = imgRect.width;
    const boxH = imgRect.height;
    const imgAspect = nw / nh;
    const boxAspect = boxW / boxH;
    let contentLeft = 0;
    let contentTop = 0;
    let contentWidth = boxW;
    let contentHeight = boxH;
    if (imgAspect > boxAspect) {
      contentWidth = boxW;
      contentHeight = boxW / imgAspect;
      contentTop = (boxH - contentHeight) / 2;
    } else {
      contentHeight = boxH;
      contentWidth = boxH * imgAspect;
      contentLeft = (boxW - contentWidth) / 2;
    }
    setMeasurement({
      url: imageUrl,
      left: imgRect.left - containerRect.left + contentLeft,
      top: imgRect.top - containerRect.top + contentTop,
      width: contentWidth,
      height: contentHeight,
    });
  }, [imageUrl]);

  useEffect(() => {
    if (!containerRef.current || !imageUrl) return;
    const ro = new ResizeObserver(() => measureImageLayout());
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [imageUrl, measureImageLayout]);

  const { selectedOverlay, boxSegments, compositionSegments } = useMemo(() => {
    if (selectedKey == null)
      return {
        selectedOverlay: null,
        boxSegments: [],
        compositionSegments: [],
      };
    const overlay = overlays.find((o) => o.key === selectedKey);
    if (!overlay)
      return {
        selectedOverlay: null,
        boxSegments: [],
        compositionSegments: [],
      };
    const boxes =
      data?.metadata ? getBoundingBoxesFromMetadata(data.metadata) : [];
    const selectedBox = boxes.filter((b) => b.name === selectedKey);
    const segments = getVisibleBoxEdges(selectedBox);
    const extract = data?.extracts?.find((e) => e.name === selectedKey);
    const composition = extract ? getBboxCompositionSegments(extract) : [];
    return {
      selectedOverlay: overlay,
      boxSegments: segments,
      compositionSegments: composition,
    };
  }, [selectedKey, overlays, data]);

  if (!imageUrl) {
    return (
      <div
        className={`segmented-main-image segmented-main-image--empty ${className}`.trim()}
      >
        <p className="segmented-main-image__empty">No image data</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`segmented-main-image ${className}`.trim()}>
      <img
        ref={imgRef}
        src={imageUrl}
        alt=""
        className="segmented-main-image__base"
        draggable={false}
        onLoad={() => requestAnimationFrame(measureImageLayout)}
      />
      {selectedOverlay &&
        imageLayout &&
        imageLayout.width > 0 &&
        imageLayout.height > 0 && (
          <div
            className="segmented-main-image__overlays"
            aria-hidden
            style={{
              left: imageLayout.left,
              top: imageLayout.top,
              width: imageLayout.width,
              height: imageLayout.height,
            }}
          >
            <div
              className="segmented-main-image__segment"
              style={{
                left: `${selectedOverlay.left}%`,
                top: `${selectedOverlay.top}%`,
                width: `${selectedOverlay.width}%`,
                height: `${selectedOverlay.height}%`,
              }}
            >
              <img
                src={selectedOverlay.src}
                alt=""
                className="segmented-main-image__segment-img"
                draggable={false}
              />
            </div>
          </div>
        )}
      {selectedOverlay &&
        (boxSegments.length > 0 || compositionSegments.length > 0) &&
        imageLayout &&
        imageLayout.width > 0 &&
        imageLayout.height > 0 && (
          <svg
            className="segmented-main-image__bbox-svg"
            viewBox={selectedOverlay.isNormalized ? "0 0 1 1" : `0 0 ${imageSize.width} ${imageSize.height}`}
            preserveAspectRatio="none"
            aria-hidden
            style={{
              left: imageLayout.left,
              top: imageLayout.top,
              width: imageLayout.width,
              height: imageLayout.height,
            }}
          >
            <defs>
              <marker
                id="segmented-main-image-arrow"
                markerWidth={COMPOSITION_ARROW_MARKER_WIDTH}
                markerHeight={COMPOSITION_ARROW_MARKER_HEIGHT}
                refX={COMPOSITION_ARROW_GEOMETRY.refX}
                refY={COMPOSITION_ARROW_GEOMETRY.refY}
                orient="auto"
                markerUnits="strokeWidth"
                viewBox={COMPOSITION_ARROW_GEOMETRY.viewBox}
              >
                <path
                  d={COMPOSITION_ARROW_GEOMETRY.path}
                  className="segmented-main-image__composition-arrow"
                />
              </marker>
            </defs>
            {boxSegments.map(({ start, end }, i) => (
              <line
                key={`box-${i}`}
                x1={start[0]}
                y1={start[1]}
                x2={end[0]}
                y2={end[1]}
                className="segmented-main-image__bbox-line"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {!selectedOverlay.isNormalized &&
              compositionSegments.map(({ start, end }, i) => (
                <line
                  key={`comp-${i}`}
                  x1={start[0]}
                  y1={start[1]}
                  x2={end[0]}
                  y2={end[1]}
                  className="segmented-main-image__composition-line"
                  vectorEffect="non-scaling-stroke"
                  markerEnd="url(#segmented-main-image-arrow)"
                />
              ))}
            {!selectedOverlay.isNormalized && <MeasurementLabels segments={compositionSegments} sourceSize={imageSize} displaySize={imageLayout} />}
          </svg>
        )}
    </div>
  );
}
