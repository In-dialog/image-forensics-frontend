"use client";

import { useMemo, useState, useEffect } from "react";
import { Line } from "@react-three/drei";
import { useImageData } from "@/features/results/context/ImageDataContext";
import { useFilteredExtracts } from "../instanceFilter/useFilteredExtracts";
import {
  fullQuadSize,
  getExtractDepthRange,
  positionFromExtract,
} from "@/features/results/lib/imageSizeCalculation";
import {
  rectanglePointsXZ,
  rectanglePointsXY,
  mergeSegmentPoints,
  rectangleExtensionLinesXZMerged,
  lineSegmentPoints,
} from "./lineGeometry";
import { palette } from "@/features/results/lib/palette";

const DEFAULT_MAIN_COLOR = palette.canvas3dLine;
const DEFAULT_DEPTH_COLOR = palette.canvas3dDepth;

/** Parse CSS color to hex so Three.js Line always gets a valid color (avoids white fallback). */
function toHexColor(value) {
  if (!value || typeof value !== "string") return null;
  const v = value.trim();
  if (/^#[0-9A-Fa-f]{3,8}$/.test(v)) return v.length <= 4 ? v : v.slice(0, 7);
  const rgb = v.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) {
    const r = Math.min(255, parseInt(rgb[1], 10));
    const g = Math.min(255, parseInt(rgb[2], 10));
    const b = Math.min(255, parseInt(rgb[3], 10));
    return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
  }
  return v;
}

function useCssLineColor(cssVar, fallback, colorProp) {
  const [color, setColor] = useState(fallback);
  useEffect(() => {
    const el = document.querySelector(".canvas3d");
    const raw = el ? getComputedStyle(el).getPropertyValue(cssVar).trim() : "";
    // Computed CSS is external DOM state, available only after mounting.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setColor(toHexColor(raw) || fallback);
  }, [cssVar, fallback]);
  return colorProp != null ? toHexColor(colorProp) || fallback : color;
}

export default function ContainerBox({
  width: widthProp,
  height: heightProp,
  color: colorProp,
  depthLineColor: depthLineColorProp,
  lineWidth = 0.008,
  dashSize = 0.05,
  gapSize = 0.02,
}) {
  const mainColor = useCssLineColor(
    "--container-box-line-color",
    DEFAULT_MAIN_COLOR,
    colorProp,
  );
  const depthLineColor = useCssLineColor(
    "--container-box-depth-line-color",
    DEFAULT_DEPTH_COLOR,
    depthLineColorProp,
  );
  const data = useImageData();
  const { extracts, originalIndices } = useFilteredExtracts();
  const { zMin, zMax } = getExtractDepthRange();

  const [width, height] = useMemo(() => {
    if (widthProp != null && heightProp != null) return [widthProp, heightProp];
    const meta = data?.metadata;
    if (meta?.image_width && meta?.image_height) {
      const { w, h } = fullQuadSize(
        meta.image_width,
        meta.image_height,
        data.fullQuadMaxSize ?? 2,
      );
      return [w, h];
    }
    return [2, 2];
  }, [data?.metadata, data?.fullQuadMaxSize, widthProp, heightProp]);

  const solidPoints = useMemo(() => {
    const w = width / 2;
    const h = height / 2;
    const groundRect = rectanglePointsXZ(-w, w, 0, zMax, -h); // starts form 0
    const mainImageRect = rectanglePointsXY(-w, w, -h, h, 0);
    return mergeSegmentPoints(groundRect, mainImageRect);
  }, [width, height, zMin, zMax]);

  const extensionPoints = useMemo(() => {
    const w = width / 2;
    const h = height / 2;
    const ext = Math.min(w, zMax) * 0.15;
    const tick = ext * 0.25;
    return rectangleExtensionLinesXZMerged(-w, w, 0, zMax, -h, ext, tick);
  }, [width, height, zMax]);

  const depthLinesPoints = useMemo(() => {
    if (!data || !extracts.length) return [];
    const w = width / 2;
    const h = height / 2;
    const { metadata, depthRanks, fullQuadMaxSize } = data;
    const segments = [];
    extracts.forEach((extract, j) => {
      const i = originalIndices[j];
      const { pz } = positionFromExtract(
        extract,
        metadata,
        depthRanks[i],
        fullQuadMaxSize,
      );
      if (!Number.isFinite(pz) || pz < 0 || pz > zMax) return;
      segments.push(
        ...lineSegmentPoints([-w, -h, pz], [w, -h, pz]),
      );
    });
    return segments;
  }, [data, extracts, originalIndices, width, height, zMax]);

  return (
    <group>
      <Line
        segments
        points={solidPoints}
        color={mainColor}
        lineWidth={lineWidth}
        worldUnits
      />
      <Line
        segments
        points={extensionPoints}
        color={mainColor}
        lineWidth={lineWidth * 0.7}
        worldUnits
      />
      {depthLinesPoints.length > 0 && (
        <Line
          segments
          points={depthLinesPoints}
          color={depthLineColor}
          lineWidth={lineWidth * 0.6}
          worldUnits
        />
      )}
    </group>
  );
}
