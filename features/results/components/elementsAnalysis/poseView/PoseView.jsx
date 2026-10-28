"use client";

import { useMemo } from "react";
import { useSemanticInteraction } from "../layout/SemanticInteractionContext";
import { useAssetAvailability, useImageData } from "@/features/results/context/ImageDataContext";
import { getPoseImageUrl } from "@/features/results/config/dataSource";
import "./PoseView.css";

const PERSON_GROUP = "people";

export default function PoseView() {
  const data = useImageData();
  const hasAsset = useAssetAvailability();
  const basePath = data?.basePath;
  const extracts = data?.extracts ?? [];
  const interaction = useSemanticInteraction();
  const selectedKey = interaction?.selectedKey ?? null;

  const selectedExtract = useMemo(
    () => (selectedKey ? extracts.find((e) => e.name === selectedKey) : null),
    [extracts, selectedKey],
  );

  const poseUrl = useMemo(
    () =>
      basePath && selectedExtract?.group === PERSON_GROUP && selectedKey
        ? getPoseImageUrl(basePath, selectedKey)
        : null,
    [basePath, selectedExtract, selectedKey],
  );

  if (!poseUrl || !hasAsset(poseUrl)) return null;

  return (
    <div className="pose-view">
      <div className="pose-view__image-container">
        <img
          src={poseUrl}
          alt={`Pose for ${selectedKey}`}
          className="pose-view__image"
          draggable={false}
        />
      </div>
    </div>
  );
}
