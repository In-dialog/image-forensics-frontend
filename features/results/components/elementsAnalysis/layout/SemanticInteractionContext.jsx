"use client";

import { createContext, useContext, useState, useCallback } from "react";

const SemanticInteractionContext = createContext(null);

export function SemanticInteractionProvider({ children }) {
  const [selectedKey, setSelectedKey] = useState(null);

  const selectItem = useCallback((key) => {
    setSelectedKey((prev) => (prev === key ? null : key));
  }, []);

  const clearSelection = useCallback(() => setSelectedKey(null), []);

  const value = {
    selectedKey,
    selectItem,
    clearSelection,
  };

  return (
    <SemanticInteractionContext.Provider value={value}>
      {children}
    </SemanticInteractionContext.Provider>
  );
}

export function useSemanticInteraction() {
  const ctx = useContext(SemanticInteractionContext);
  return ctx;
}
