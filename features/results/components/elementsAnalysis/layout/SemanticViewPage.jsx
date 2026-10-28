"use client";

import { motion } from "motion/react";
import SemanticView from "./SemanticView";
import SegmentedMainImage from "../mainImage/SegmentedMainImage";
import MetadataGallery from "../metadataGallery/MetadataGallery";
import { DescriptionProvider } from "../itemDescription/DescriptionContext";
import { ItemDescriptionTop } from "../itemDescription/ItemDescription";
import DeconstructPerson from "../deconstructItems/DeconstructPerson";
const slideVariants = {
  enter: (dir) => ({ x: `${dir * 100}%` }),
  center: { x: 0 },
  exit: (dir) => ({ x: `${-dir * 100}%` }),
};

export default function SemanticViewPage({ transition, direction }) {
  return (
    <motion.div
      key="semantic"
      className="flex absolute inset-0"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={transition}
    >
      <SemanticView
        main={
          <section className="semantic-panel semantic-panel--main">
            <header className="semantic-panel__header">Scene Evidence</header>
            <div className="semantic-panel__body semantic-panel__body--main">
              <div className="semantic-view__main-image h-full min-h-0 flex items-center justify-center overflow-hidden">
                <SegmentedMainImage className="max-w-full max-h-full" />
              </div>
            </div>
          </section>
        }
        sidebar={
          <DescriptionProvider>
            <div className="semantic-view__sidebar-content">
              <div className="semantic-view__sidebar-row semantic-view__sidebar-row--first">
                <section className="semantic-panel semantic-panel--gallery semantic-view__sidebar-grid">
                  <header className="semantic-panel__header">Extract Index</header>
                  <div className="semantic-panel__body semantic-panel__body--gallery">
                    <MetadataGallery
                      gridOnly
                      className="semantic-view__sidebar-grid-content"
                    />
                  </div>
                </section>
              </div>
              <div className="semantic-view__sidebar-row semantic-view__sidebar-row--second">
                <section className="semantic-panel semantic-panel--description semantic-view__sidebar-description">
                  <div className="semantic-panel__body semantic-panel__body--description">
                    <ItemDescriptionTop />
                  </div>
                </section>
                <section className="semantic-panel semantic-panel--compositional semantic-view__sidebar-compositional">
                  <div className="semantic-panel__body semantic-panel__body--compositional">
                    <DeconstructPerson />
                  </div>
                </section>
              </div>
            </div>
          </DescriptionProvider>
        }
      />
    </motion.div>
  );
}
