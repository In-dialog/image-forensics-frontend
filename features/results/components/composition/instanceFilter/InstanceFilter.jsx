"use client";

import { useMemo, useEffect, useRef } from "react";
import { useImageData } from "@/features/results/context/ImageDataContext";
import { useInstanceFilter } from "@/features/results/context/InstanceFilterContext";
import { getExtractGroup } from "@/features/results/lib/extract";
import "./InstanceFilter.css";

function getTagsFromExtracts(extracts) {
  if (!Array.isArray(extracts)) return [];
  const set = new Set();
  for (const ex of extracts) {
    set.add(getExtractGroup(ex));
    const list = ex.tags;
    if (Array.isArray(list)) list.forEach((t) => set.add(String(t)));
  }
  return Array.from(set).sort();
}

export default function InstanceFilter() {
  const data = useImageData();
  const { selectedTags, toggleTag, setAllTags } = useInstanceFilter();

  const tags = useMemo(
    () => getTagsFromExtracts(data?.extracts ?? []),
    [data?.extracts],
  );

  const hasInitialized = useRef(false);
  useEffect(() => {
    if (tags.length > 0 && !hasInitialized.current) {
      hasInitialized.current = true;
      setAllTags(tags, true);
    }
  }, [tags, setAllTags]);

  if (tags.length === 0) return null;

  return (
    <div className="instance-filter" role="group" aria-label="Filter by type">
      <div className="instance-filter__checkboxes">
        {tags.map((tag) => (
          <label key={tag} className="instance-filter__checkbox">
            <input
              type="checkbox"
              checked={selectedTags.has(tag)}
              onChange={() => toggleTag(tag)}
              aria-label={`Toggle ${tag}`}
            />
            <span className="instance-filter__checkbox-label">{tag}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
