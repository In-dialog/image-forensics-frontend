"use client";

import { WorkspaceShell } from "@/features/workspace/components/WorkspaceShell";

export default function ResultsError({ reset }: { reset: () => void }) {
  return (
    <WorkspaceShell active="results">
      <h1>Results could not be loaded</h1>
      <p>The results folder may be temporarily unavailable.</p>
      <button type="button" onClick={reset}>Try again</button>
    </WorkspaceShell>
  );
}
