"use client";

import { Suspense, useRef, useState, useMemo, useEffect } from "react";
import Quad from "./Quad";
import { useImageData } from "@/features/results/context/ImageDataContext";
import { useFilteredExtracts } from "../instanceFilter/useFilteredExtracts";
import {
  positionFromExtract,
  sizeFromExtract,
} from "@/features/results/lib/imageSizeCalculation";
import { getResultItemImageUrl } from "@/features/results/config/dataSource";
import AnimatedPositionGroup from "./animatedCanvasElements/AnimatedPositionGroup";

export default function QuadsFromJson() {
  const data = useImageData();
  const { extracts, originalIndices } = useFilteredExtracts();
  const prevByKeyRef = useRef(new Map());
  const [exiting, setExiting] = useState([]);

  const { basePath, metadata, depthRanks, fullQuadMaxSize } = data ?? {};

  const currentKeys = useMemo(
    () => new Set((extracts ?? []).map((e) => e.name)),
    [extracts],
  );
  useEffect(() => {
    const list = [];
    prevByKeyRef.current.forEach((value, key) => {
      if (!currentKeys.has(key)) list.push({ key, ...value });
    });
    if (list.length === 0) return;
    const frame = requestAnimationFrame(() => {
      setExiting((prev) => {
        const keys = new Set(prev.map((e) => e.key));
        const added = list.filter((e) => !keys.has(e.key));
        return added.length ? [...prev, ...added] : prev;
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [currentKeys]);

  useEffect(() => {
    if (!data) return;
    const nextPrev = new Map();
    (extracts ?? []).forEach((extract, j) => {
      const i = originalIndices[j];
      const { px, py, pz } = positionFromExtract(
        extract,
        metadata,
        depthRanks[i],
        fullQuadMaxSize,
      );
      nextPrev.set(extract.name, { px, py, pz, extract, originalIndex: i });
    });
    prevByKeyRef.current = nextPrev;
  }, [data, extracts, originalIndices, metadata, depthRanks, fullQuadMaxSize]);

  const handleExitComplete = (key) => {
    setExiting((prev) => prev.filter((e) => e.key !== key));
  };

  if (!data) return null;

  const visible = extracts ?? [];
  const hasVisible = visible.length > 0;
  const hasExiting = exiting.length > 0;
  if (!hasVisible && !hasExiting) return null;

  return (
    <group>
      {hasVisible &&
        visible.map((extract, j) => {
          const i = originalIndices[j];
          const { name } = extract;
          const segmentSrc = getResultItemImageUrl(basePath, extract);
          const { px, py, pz } = positionFromExtract(
            extract,
            metadata,
            depthRanks[i],
            fullQuadMaxSize,
          );
          const { segW, segH } = sizeFromExtract(
            extract,
            metadata,
            fullQuadMaxSize,
          );
          return (
            <Suspense key={name} fallback={null}>
              <AnimatedPositionGroup targetPosition={[px, py, pz]}>
                <Quad
                  src={segmentSrc}
                  width={segW}
                  height={segH}
                  position={[0, 0, 0]}
                />
              </AnimatedPositionGroup>
            </Suspense>
          );
        })}
      {hasExiting &&
        exiting.map(({ key, px, py, pz, extract }) => {
          const segmentSrc = getResultItemImageUrl(basePath, extract);
          const { segW, segH } = sizeFromExtract(
            extract,
            metadata,
            fullQuadMaxSize,
          );
          return (
            <Suspense key={`exiting-${key}`} fallback={null}>
              <AnimatedPositionGroup
                targetPosition={[px, py, pz]}
                isExiting
                onExitComplete={() => handleExitComplete(key)}
              >
                <Quad
                  src={segmentSrc}
                  width={segW}
                  height={segH}
                  position={[0, 0, 0]}
                />
              </AnimatedPositionGroup>
            </Suspense>
          );
        })}
    </group>
  );
}
