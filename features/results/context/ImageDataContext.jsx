"use client";

import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { getMetadataUrl } from "@/features/results/config/dataSource";
import { makeAssetAvailability } from '../lib/assetAvailability';
import {
  getExtractDepthRanks,
  getAverageDepth,
} from "@/features/results/lib/imageSizeCalculation";

const ImageDataContext = createContext(null);
const ImageBasePathContext = createContext(null);
const ImageLoadStatusContext = createContext({ loading: true, error: null });
const AssetAvailabilityContext = createContext(() => false);

export function useAssetAvailability() { return useContext(AssetAvailabilityContext); }

export function useImageLoadStatus() {
  return useContext(ImageLoadStatusContext);
}

export function useImageData() {
  const ctx = useContext(ImageDataContext);
  return ctx;
}

export function useImageBasePath() {
  return useContext(ImageBasePathContext);
}

/**
 * @param {{
 *   basePath: string,
 *   fullQuadMaxSize?: number,
 *   availableFiles: string[],
 *   children: import("react").ReactNode
 * }} props
 */
export function ImageDataProvider({
  basePath,
  fullQuadMaxSize = 2,
  availableFiles,
  children,
}) {
  const [resource, setResource] = useState(null);
  const metadata = resource && resource.basePath === basePath ? resource.metadata : null;
  const error = resource && resource.basePath === basePath ? resource.error : null;
  const hasAsset = useMemo(() => makeAssetAvailability(basePath, availableFiles), [basePath, availableFiles]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(getMetadataUrl(basePath), { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load metadata");
        return res.json();
      })
      .then((json) => {
        if (!Array.isArray(json?.extracts) || !(json.image_width > 0) || !(json.image_height > 0)) {
          throw new Error("The result metadata is incomplete.");
        }
        if (!controller.signal.aborted) setResource({ basePath, metadata: json, error: null });
      })
      .catch((error) => { if (!controller.signal.aborted) setResource({ basePath, metadata: null, error }); });
    return () => controller.abort();
  }, [basePath]);

  const value = useMemo(() => {
    if (error || !metadata) return null;
    if (
      metadata.image_width == null ||
      metadata.image_height == null
    )
      return null;

    const extracts = metadata.extracts ?? [];
    const depthRanks = getExtractDepthRanks(extracts);
    const orbitTargetZ = getAverageDepth(depthRanks);

    return {
      basePath,
      metadata,
      extracts,
      depthRanks,
      fullQuadMaxSize,
      orbitTargetZ,
    };
  }, [metadata, error, basePath, fullQuadMaxSize]);

  return (
    <ImageBasePathContext.Provider value={basePath}>
      <ImageDataContext.Provider value={value}>
        <ImageLoadStatusContext.Provider value={{ loading: !metadata && !error, error }}>
          <AssetAvailabilityContext.Provider value={hasAsset}>{children}</AssetAvailabilityContext.Provider>
        </ImageLoadStatusContext.Provider>
      </ImageDataContext.Provider>
    </ImageBasePathContext.Provider>
  );
}
