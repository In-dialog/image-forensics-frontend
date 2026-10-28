"use client";

import { createContext, useContext, useState, useMemo, useCallback } from "react";

const InstanceFilterContext = createContext(null);

export function useInstanceFilter() {
  const ctx = useContext(InstanceFilterContext);
  return ctx;
}

/**
 * Provides selected tags (e.g. extract.group) for filtering what is instanced in the 3D view.
 * selectedTags: Set<string> of tag names that are enabled. Empty set = show all.
 * Filter is only applied when viewMode is the Semantical view (passed from page).
 */
export function InstanceFilterProvider({ children, viewMode }) {
  const [selectedTags, setSelectedTagsState] = useState(() => new Set());

  const setSelectedTags = useCallback((next) => {
    setSelectedTagsState((prev) => {
      const nextSet = typeof next === "function" ? next(prev) : next;
      return nextSet instanceof Set ? nextSet : new Set(nextSet ?? []);
    });
  }, []);

  const toggleTag = useCallback((tag) => {
    setSelectedTagsState((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }, []);

  const setAllTags = useCallback((tags, enabled = true) => {
    setSelectedTagsState((prev) => {
      const next = new Set(prev);
      tags.forEach((t) => (enabled ? next.add(t) : next.delete(t)));
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ selectedTags, setSelectedTags, toggleTag, setAllTags, viewMode }),
    [selectedTags, setSelectedTags, toggleTag, setAllTags, viewMode],
  );

  return (
    <InstanceFilterContext.Provider value={value}>
      {children}
    </InstanceFilterContext.Provider>
  );
}
