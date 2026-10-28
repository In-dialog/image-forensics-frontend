"use client";

import { useMemo } from "react";
import { useImageData } from "@/features/results/context/ImageDataContext";
import { useSemanticInteraction } from "../layout/SemanticInteractionContext";
import SegmentedMainImage from "../mainImage/SegmentedMainImage";
import { getResultItemImageUrl } from "@/features/results/config/dataSource";
import { resultItemLabel } from "@/features/results/lib/structuredResults";
import "./MetadataGallery.css";

export default function MetadataGallery({ className = "", gridOnly = false }) {
  const data = useImageData();
  const basePath = data?.basePath;
  const extracts = data?.extracts;
  const interaction = useSemanticInteraction();

  const items = useMemo(() => {
    if (!extracts?.length || !basePath) return [];
    return extracts.map((extract, i) => ({
      key: extract.name ?? String(i),
      src: getResultItemImageUrl(basePath, extract),
      label: resultItemLabel(extract),
    }));
  }, [extracts, basePath]);

  if (!data?.metadata || !data?.extracts?.length) {
    return (
      <div className={`metadata-gallery metadata-gallery--empty ${className}`.trim()}>
        <p className="metadata-gallery__empty">No metadata or extracts</p>
      </div>
    );
  }

  const gridCols = gridOnly ? Math.max(1, Math.ceil(items.length / 3)) : undefined;

  return (
    <div
      className={`metadata-gallery ${gridOnly ? "metadata-gallery--grid-only" : ""} ${className}`.trim()}
      style={gridCols != null ? { "--gallery-grid-cols": gridCols } : undefined}
    >
      <div className="metadata-gallery__grid">
        {items.map(({ key, src, label }) => {
          const isSelected = interaction?.selectedKey === key;
          const isDimmed = interaction?.selectedKey != null && !isSelected;
          const handleSelect = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (interaction?.selectItem) interaction.selectItem(key);
          };
          return (
            <div
              key={key}
              className={`metadata-gallery__cell${isSelected ? " metadata-gallery__cell--selected" : ""}${isDimmed ? " metadata-gallery__cell--dimmed" : ""}`}
              onClick={handleSelect}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelect(e);
                }
              }}
              role="button"
              aria-label={label}
              title={label}
              tabIndex={0}
              aria-pressed={isSelected}
            >
              <img src={src} alt={label} className="metadata-gallery__thumb" draggable={false} />
            </div>
          );
        })}
      </div>
      {!gridOnly && (
        <div className="metadata-gallery__image">
          <SegmentedMainImage className="metadata-gallery__segmented-main" />
        </div>
      )}
    </div>
  );
}
