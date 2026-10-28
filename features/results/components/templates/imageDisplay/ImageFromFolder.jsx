"use client";

import { useState, useEffect } from "react";
import { useAssetAvailability, useImageBasePath } from "@/features/results/context/ImageDataContext";
import {
  dataSource,
  getFullImageUrl,
  getFolderImageCandidateUrls,
} from "@/features/results/config/dataSource";
import "@/features/results/components/composition/ColumnCard.css";

function formatTitle(folderName) {
  return folderName.replace(/_/g, " ");
}

async function findFirstValidUrl(candidateUrls) {
  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.ok) return url;
    } catch {
      continue;
    }
  }
  return null;
}

export default function ImageFromFolder({
  folderName,
  useLookupTable = false,
  useOriginalAsBackground = false,
  backgroundGrayscale = false,
  backgroundOpacity,
}) {
  const basePath = useImageBasePath();
  const hasAsset = useAssetAvailability();
  const [resource, setResource] = useState(null);
  const current = resource && resource.basePath === basePath && resource.folderName === folderName && resource.hasAsset === hasAsset;
  const src = current ? resource.src : null;
  const error = current ? resource.error : false;

  useEffect(() => {
    let cancelled = false;
    const candidates =
      folderName === dataSource.mainImage.folder ?
        [getFullImageUrl(basePath)]
      : getFolderImageCandidateUrls(basePath, folderName);
    findFirstValidUrl(candidates.filter(hasAsset)).then((url) => {
      if (cancelled) return;
      setResource({ basePath, folderName, hasAsset, src: url, error: !url });
    });
    return () => {
      cancelled = true;
    };
  }, [basePath, folderName, hasAsset]);

  const stateClass =
    error ? "column-card--error"
    : src ? ""
    : "column-card--loading";
  const originalUrl = getFullImageUrl(basePath);
  const showOverlay =
    useOriginalAsBackground &&
    src &&
    folderName !== dataSource.mainImage.folder;

  return (
    <article className={`column-card ${stateClass}`}>
      <header className="column-card__title">{formatTitle(folderName)}</header>
      <div className="column-card__content">
        {error && !src && <span>Not included in this analysis</span>}
        {src && !showOverlay && (
          <span
            className={`image-from-folder__img-wrap ${useLookupTable ? "image-from-folder__img-wrap--lut" : ""}`}
          >
            <img
              src={src}
              alt={formatTitle(folderName)}
              style={
                useLookupTable ? { filter: "url(#lookup-table)" } : undefined
              }
            />
          </span>
        )}
        {showOverlay && (
          <div className="image-from-folder-overlay">
            <img
              src={originalUrl}
              alt=""
              className={`image-from-folder-overlay__bg ${backgroundGrayscale ? "image-from-folder-overlay__bg--grayscale" : ""}`}
              style={backgroundOpacity != null ? { opacity: backgroundOpacity } : undefined}
              aria-hidden
            />
            <span
              className={`image-from-folder__img-wrap ${useLookupTable ? "image-from-folder__img-wrap--lut" : ""}`}
            >
              <img
                src={src}
                alt={formatTitle(folderName)}
                className="image-from-folder-overlay__fg"
                style={
                  useLookupTable ? { filter: "url(#lookup-table)" } : undefined
                }
              />
            </span>
          </div>
        )}
        {!src && !error && <span>Loading…</span>}
      </div>
    </article>
  );
}
