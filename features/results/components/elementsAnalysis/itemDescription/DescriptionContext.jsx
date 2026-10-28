"use client";

import { createContext, useContext, useMemo } from "react";
import { useImageBasePath } from "@/features/results/context/ImageDataContext";
import { getDescriptionUrl } from "@/features/results/config/dataSource";
import { readDescriptionDocument } from "@/features/results/lib/structuredResults";
import { useFetchJson } from "@/features/results/lib/useFetchJson";

const DescriptionContext = createContext(null);
export function useDescriptions() { return useContext(DescriptionContext); }

export function DescriptionProvider({ children }) {
  const basePath = useImageBasePath();
  const { data, loading, error, missing } = useFetchJson(getDescriptionUrl(basePath));
  const document = useMemo(() => readDescriptionDocument(data), [data]);
  const value = useMemo(() => ({ document, basePath, loading, error, missing }), [document, basePath, loading, error, missing]);
  return <DescriptionContext.Provider value={value}>{children}</DescriptionContext.Provider>;
}
