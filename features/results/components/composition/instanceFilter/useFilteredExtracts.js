"use client";

import { useMemo } from "react";
import { useImageData } from "@/features/results/context/ImageDataContext";
import { useInstanceFilter } from "@/features/results/context/InstanceFilterContext";
import { VIEW_3_COLUMNS } from "@/features/results/components/toolbar/Toolbar";
import { getExtractGroup } from "@/features/results/lib/extract";

/**
 * Returns extracts filtered by instance filter (selected tags) when in Analytical view,
 * and the original indices for each so depthRanks etc. can be looked up.
 * In Analytical view: when no tags are ticked, show nothing; when some are ticked, show only those.
 * In Semantical view, returns all extracts.
 */
export function useFilteredExtracts() {
  const data = useImageData();
  const filter = useInstanceFilter();

  return useMemo(() => {
    const extracts = data?.extracts ?? [];
    if (!extracts.length) return { extracts: [], originalIndices: [] };

    const inAnalytical = filter?.viewMode === VIEW_3_COLUMNS;
    const selectedTags = inAnalytical ? filter?.selectedTags : null;

    if (!inAnalytical || !selectedTags) {
      return {
        extracts,
        originalIndices: extracts.map((_, i) => i),
      };
    }

    if (selectedTags.size === 0) {
      return { extracts: [], originalIndices: [] };
    }

    const filtered = [];
    const indices = [];
    extracts.forEach((ex, i) => {
      const tag = getExtractGroup(ex);
      if (selectedTags.has(tag)) {
        filtered.push(ex);
        indices.push(i);
      }
    });
    return { extracts: filtered, originalIndices: indices };
  }, [data?.extracts, filter?.viewMode, filter?.selectedTags]);
}
