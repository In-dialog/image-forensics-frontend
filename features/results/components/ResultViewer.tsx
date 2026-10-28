"use client";

import { useState } from "react";
import { AnimatePresence } from "motion/react";
import Toolbar, { VIEW_3_COLUMNS, VIEW_CANVAS, VIEW_SEMANTICS, VIEW_MODELER } from "./toolbar/Toolbar";
import GrayscaleLookupTable from "./templates/lookupTable/GrayscaleLookupTable";
import { ImageDataProvider, useImageLoadStatus } from "../context/ImageDataContext";
import { InstanceFilterProvider } from "../context/InstanceFilterContext";
import AnalyticalView from "./composition/AnalyticalView";
import SemanticViewPage from "./elementsAnalysis/layout/SemanticViewPage";
import SemanticsView from "./semantics/SemanticsView";
import ModelerView from "./modelerView/ModelerView";
import { WorkspaceNavigation } from '@/features/workspace/components/WorkspaceNavigation';
import type { Dataset } from "../types";
import styles from "./ResultViewer.module.css";
import "./templates/lookupTable/GrayscaleLookupTable.css";

const transition = { type: "tween" as const, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const };
const VIEW_ORDER: Record<string, number> = {
  [VIEW_3_COLUMNS]: 0, [VIEW_CANVAS]: 1, [VIEW_SEMANTICS]: 2, [VIEW_MODELER]: 3,
};

function ViewerContent() {
  const [viewMode, setViewMode] = useState(VIEW_3_COLUMNS);
  const [direction, setDirection] = useState(1);
  const { loading, error } = useImageLoadStatus();
  const changeView = (next: string) => {
    setDirection(VIEW_ORDER[next] > VIEW_ORDER[viewMode] ? 1 : -1);
    setViewMode(next);
  };

  if (loading) return <p className={styles.state} role="status">Loading result…</p>;
  if (error) return <p className={styles.state} role="alert">Could not load this result. Return to results and try again.</p>;

  return (
    <InstanceFilterProvider viewMode={viewMode}>
      <GrayscaleLookupTable />
      <Toolbar viewMode={viewMode} onViewModeChange={changeView} />
      <div className="relative flex-1 min-h-0 w-full overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
          {viewMode === VIEW_3_COLUMNS && <AnalyticalView key="analytical" transition={transition} direction={direction} />}
          {viewMode === VIEW_CANVAS && <SemanticViewPage key="semantic" transition={transition} direction={direction} />}
          {viewMode === VIEW_SEMANTICS && <SemanticsView key="semantics" transition={transition} direction={direction} />}
          {viewMode === VIEW_MODELER && <ModelerView key="modeler" transition={transition} direction={direction} />}
        </AnimatePresence>
      </div>
    </InstanceFilterProvider>
  );
}

export default function ResultViewer({ dataset, availableFiles }: { dataset: Dataset; availableFiles: string[] }) {
  return (
    <main className={styles.viewer}>
      <header className={styles.header}>
        <WorkspaceNavigation active="results" />
        <span className={styles.datasetName} title={dataset.name}>{dataset.name.replace(/[_-]+/g, " ")}</span>
      </header>
      <ImageDataProvider basePath={dataset.basePath} availableFiles={availableFiles}>
        <ViewerContent />
      </ImageDataProvider>
    </main>
  );
}
