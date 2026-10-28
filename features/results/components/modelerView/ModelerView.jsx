"use client";

import { motion } from "motion/react";
import ForgeryDetectionView from "@/features/results/components/analytics/forgery_detection/ForgeryDetectionView";
import "./ModelerView.css";

const slideVariants = {
  enter: (dir) => ({ x: `${dir * 100}%` }),
  center: { x: 0 },
  exit: (dir) => ({ x: `${-dir * 100}%` }),
};

export default function ModelerView({ transition, direction }) {
  return (
    <motion.div
      key="modeler"
      className="modeler-view absolute inset-0"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={transition}
    >
      <ForgeryDetectionView />
    </motion.div>
  );
}
