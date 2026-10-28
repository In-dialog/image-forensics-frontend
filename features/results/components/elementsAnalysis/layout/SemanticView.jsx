"use client";

import {
  SemanticInteractionProvider,
  useSemanticInteraction,
} from "./SemanticInteractionContext";
import "./SemanticView.css";

function SemanticViewLayout({ main, sidebar, className }) {
  const interaction = useSemanticInteraction();

  const handleMainClick = (e) => {
    if (
      interaction?.selectedKey != null &&
      !e.target.closest(".metadata-gallery__cell")
    ) {
      interaction.clearSelection();
    }
  };

  return (
    <div className={`semantic-view ${className}`.trim()}>
      <div className="semantic-view__main" onClick={handleMainClick}>
        {main}
      </div>
      <aside className="semantic-view__sidebar">{sidebar}</aside>
    </div>
  );
}

export default function SemanticView({ main, sidebar, className = "" }) {
  return (
    <SemanticInteractionProvider>
      <SemanticViewLayout main={main} sidebar={sidebar} className={className} />
    </SemanticInteractionProvider>
  );
}
