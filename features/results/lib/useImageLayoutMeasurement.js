"use client";

import { useState, useRef, useCallback, useLayoutEffect, useEffect } from "react";

/**
 * Measures an <img> element's rendered position within a container.
 * Returns { stackRef, imgRef, imageLayout, imageNaturalSize, setImageNaturalSize, measureImageLayout }
 * - stackRef: attach to the container div
 * - imgRef: attach to the <img>
 * - imageLayout: { left, top, width, height } relative to container, or null
 * - imageNaturalSize: { width, height } from img.onLoad, or null
 * - setImageNaturalSize: setter for onLoad callback
 * - measureImageLayout: call after load or resize
 */
export function useImageLayoutMeasurement(resetKey) {
  const stackRef = useRef(null);
  const imgRef = useRef(null);
  const [naturalMeasurement, setNaturalMeasurement] = useState(null);
  const [layoutMeasurement, setLayoutMeasurement] = useState(null);
  const imageNaturalSize = naturalMeasurement && naturalMeasurement.key === resetKey ? naturalMeasurement.value : null;
  const imageLayout = layoutMeasurement && layoutMeasurement.key === resetKey ? layoutMeasurement.value : null;
  const setImageNaturalSize = useCallback(value => setNaturalMeasurement({ key: resetKey, value }), [resetKey]);

  const measureImageLayout = useCallback(() => {
    if (!stackRef.current || !imgRef.current) return;
    const stackRect = stackRef.current.getBoundingClientRect();
    const imgRect = imgRef.current.getBoundingClientRect();
    setLayoutMeasurement({ key: resetKey, value: {
      left: imgRect.left - stackRect.left,
      top: imgRect.top - stackRect.top,
      width: imgRect.width,
      height: imgRect.height,
    } });
  }, [resetKey]);

  useLayoutEffect(() => {
    if (!imageNaturalSize) return;
    measureImageLayout();
  }, [imageNaturalSize, measureImageLayout]);

  useEffect(() => {
    if (!stackRef.current || !imageNaturalSize) return;
    const ro = new ResizeObserver(() => measureImageLayout());
    ro.observe(stackRef.current);
    return () => ro.disconnect();
  }, [imageNaturalSize, measureImageLayout]);

  return {
    stackRef,
    imgRef,
    imageLayout,
    imageNaturalSize,
    setImageNaturalSize,
    measureImageLayout,
  };
}
