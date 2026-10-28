"use client";

import { useMemo, useState, useEffect } from "react";
import { Line } from "@react-three/drei";
import { useImageData } from "@/features/results/context/ImageDataContext";
import { useFilteredExtracts } from "../instanceFilter/useFilteredExtracts";
import { positionFromExtract } from "@/features/results/lib/imageSizeCalculation";

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

function useCssLinesConfig() {
  const [config, setConfig] = useState({
    color: "#888888",
    lineWidth: 0.005,
    dashSize: 0.05,
    gapSize: 0.02,
  });
  useEffect(() => {
    const el = document.querySelector(".canvas3d");
    if (!el) return;
    const s = getComputedStyle(el);
    const color = toHexColor(s.getPropertyValue("--lines-to-original-color").trim()) || "#888888";
    const lineWidth = parseFloat(s.getPropertyValue("--lines-to-original-width").trim()) || 0.005;
    const dashSize = parseFloat(s.getPropertyValue("--lines-to-original-dash-size").trim()) || 0.05;
    const gapSize = parseFloat(s.getPropertyValue("--lines-to-original-gap-size").trim()) || 0.02;
    // Synchronize Three.js settings with computed CSS after the DOM mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfig({ color, lineWidth, dashSize, gapSize });
  }, []);
  return config;
}

export default function LinesToOriginalQuad() {
  const { color, lineWidth, dashSize, gapSize } = useCssLinesConfig();
  const data = useImageData();
  const { extracts, originalIndices } = useFilteredExtracts();

  const points = useMemo(() => {
    if (!data || !extracts.length) return [];
    const { metadata, depthRanks, fullQuadMaxSize } = data;
    const out = [];
    extracts.forEach((extract, j) => {
      const i = originalIndices[j];
      const { px, py, pz } = positionFromExtract(
        extract,
        metadata,
        depthRanks[i],
        fullQuadMaxSize,
      );
      if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(pz))
        return;
      out.push([px, py, pz], [px, py, 0]);
      // out.push([px, py, pz - 0.001], [px, -1, pz]);
    });
    return out;
  }, [data, extracts, originalIndices]);

  if (!data || points.length === 0) return null;

  return (
    <Line
      segments
      points={points}
      color={color}
      lineWidth={lineWidth}
      worldUnits
      dashed
      dashSize={dashSize}
      gapSize={gapSize}
    />
  );
}
