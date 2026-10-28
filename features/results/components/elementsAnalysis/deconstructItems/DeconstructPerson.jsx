"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { MasonryPhotoAlbum } from "react-photo-album";
import "react-photo-album/masonry.css";
import { useSemanticInteraction } from "../layout/SemanticInteractionContext";
import { useImageData } from "@/features/results/context/ImageDataContext";
import { useFetchJson } from "@/features/results/lib/useFetchJson";
import { resultItemLabel } from "@/features/results/lib/structuredResults";
import {
  getGranularSegmentMetadataUrl,
  getGranularSegmentImageUrl,
} from "@/features/results/config/dataSource";
import "./DeconstructPerson.css";

const SPACING = 4;
const LABEL_H = 14;

function simulateMasonryHeight(photos, containerW, numCols, spacing) {
  const colW = (containerW - spacing * (numCols - 1)) / numCols;
  const heights = new Array(numCols).fill(0);
  for (const p of photos) {
    const shortest = heights.indexOf(Math.min(...heights));
    const imgH = colW * (p.height / p.width) + LABEL_H;
    heights[shortest] += (heights[shortest] > 0 ? spacing : 0) + imgH;
  }
  return Math.max(...heights);
}

function computeColumns(photos, containerW, containerH) {
  if (!photos.length || containerW <= 0 || containerH <= 0) return 2;
  for (let cols = 1; cols <= photos.length; cols++) {
    if (
      simulateMasonryHeight(photos, containerW, cols, SPACING) <= containerH
    ) {
      return cols;
    }
  }
  return photos.length;
}

function DeconstructAlbum({ photos }) {
  const ref = useRef(null);
  const [columns, setColumns] = useState(2);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setColumns(computeColumns(photos, el.clientWidth, el.clientHeight));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [photos]);

  return (
    <div className="deconstruct-person__album" ref={ref}>
      <MasonryPhotoAlbum
        photos={photos}
        columns={columns}
        spacing={SPACING}
        padding={0}
        render={{
          photo: (_, { photo, width, height, index }) => (
            <div
              key={index}
              className="deconstruct-person__card"
              style={{ width }}
            >
              <img
                src={photo.src}
                alt={photo.alt}
                width={width}
                height={height}
                className="deconstruct-person__thumb"
              />
              <span className="deconstruct-person__label">{photo.alt}</span>
            </div>
          ),
        }}
      />
    </div>
  );
}

export default function DeconstructPerson() {
  const data = useImageData();
  const basePath = data?.basePath;
  const extracts = data?.extracts ?? [];
  const interaction = useSemanticInteraction();
  const selectedKey = interaction?.selectedKey ?? null;

  const selectedExtract = useMemo(
    () => (selectedKey ? extracts.find((e) => e.name === selectedKey) : null),
    [extracts, selectedKey],
  );
  const group = selectedExtract?.group ?? null;

  const metadataUrl = useMemo(
    () =>
      basePath && selectedKey && (group || selectedExtract?.parts_metadata_path) ?
        getGranularSegmentMetadataUrl(basePath, group, selectedKey, selectedExtract?.parts_metadata_path)
      : null,
    [basePath, group, selectedKey, selectedExtract?.parts_metadata_path],
  );
  const { data: segmentMetadata, loading, error, missing } = useFetchJson(metadataUrl);

  const photos = useMemo(() => {
    if (!basePath || !selectedKey || !segmentMetadata?.extracts)
      return [];
    return segmentMetadata.extracts.map((ex) => {
      const [w, h] = ex.bbox_size ?? [1, 1];
      return {
        src: getGranularSegmentImageUrl(basePath, group, selectedKey, ex.name, ex.image_path),
        width: w || 1,
        height: h || 1,
        alt: resultItemLabel(ex),
        title: resultItemLabel(ex),
      };
    });
  }, [basePath, group, selectedKey, segmentMetadata]);

  if (!selectedKey) {
    return (
      <div className="deconstruct-person deconstruct-person--empty">
        <p className="deconstruct-person__placeholder">
          Select an item to explore its parts
        </p>
      </div>
    );
  }

  return (
    <div className="deconstruct-person" data-selected-key={selectedKey}>
      {loading ?
        <p className="deconstruct-person__placeholder">Loading…</p>
      : !metadataUrl ?
        <p className="deconstruct-person__placeholder">
          No group for this item (metadata has no group).
        </p>
      : missing ?
        <p className="deconstruct-person__placeholder">
          Part analysis was not included for this item.
        </p>
      : error ?
        <p className="deconstruct-person__placeholder">
          Could not load segment metadata for this item.
        </p>
      : photos.length === 0 ?
        <p className="deconstruct-person__placeholder">
          No component images found.
        </p>
      : <DeconstructAlbum photos={photos} />}
    </div>
  );
}
