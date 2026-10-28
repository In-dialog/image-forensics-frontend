"use client";

import { motion } from "motion/react";
import "./AnalyticalView.css";
import Canvas3D from "./canvas3D/Canvas3D";
import ImageFromFolder from "@/features/results/components/templates/imageDisplay/ImageFromFolder";
import CompositionLinesView from "./compositionLines/CompositionLinesView";
import BoundingBoxView from "./boundingBox/BoundingBoxView";
import InstanceFilter from "./instanceFilter/InstanceFilter";

const slideVariants = {
  enter: (dir) => ({ x: `${dir * 100}%` }),
  center: { x: 0 },
  exit: (dir) => ({ x: `${-dir * 100}%` }),
};

export default function AnalyticalView({ transition, direction }) {
  return (
    <motion.div
      key="analytical"
      className="analytical-view"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={transition}
    >
      <aside className="column">
        <ImageFromFolder
          folderName="saliency_deepgaze_msdb"
          useOriginalAsBackground
          useLookupTable
          backgroundGrayscale={true}
          backgroundOpacity={0.2}
        />
        <CompositionLinesView />
        <BoundingBoxView />
      </aside>
      <main className="analytical-view__main">
        <InstanceFilter />
        <div className="analytical-view__canvas-wrap">
          <Canvas3D />
        </div>
      </main>
      <aside className="column">
        <ImageFromFolder folderName="original" />
        <ImageFromFolder folderName="depth" useLookupTable />
        <ImageFromFolder folderName="negative_space" useLookupTable />
      </aside>
    </motion.div>
  );
}
