import type { AnalysisStage, StageSubstep } from "../types";
import styles from "./stageProgress.module.css";

function Outcomes({ step }: { step: StageSubstep }) {
  if (!step.skipped && !step.failed) return null;
  return <span className={styles.outcomes}>
    {step.skipped > 0 && <span>{step.skipped} skipped</span>}
    {step.failed > 0 && <span>{step.failed} failed</span>}
  </span>;
}

export function StageProgress({ stage }: { stage: AnalysisStage }) {
  const index = stage.current_substep;
  const step = index ? stage.substeps?.[index - 1] : undefined;
  if (!step) return null;
  const measured = step.total !== null;
  const remaining = measured ? Math.max(0, step.total! - step.completed) : null;
  const stopped = step.status === "failed" || step.status === "interrupted";
  return <section className={styles.current} aria-label="Current stage progress">
    <h3>{stage.label}</h3>
    <div className={styles.stepHeading}>
      <span>Step {index} / {stage.substeps!.length}</span><strong>{step.label}</strong>
    </div>
    <div className={styles.counts} role="status" aria-atomic="true">
      {measured ? <>
        <strong>{step.total === 0 ? `No ${step.unit} to process` : `${step.completed} / ${step.total} ${step.unit}`}</strong>
        {step.total! > 0 && <span>{remaining} remaining</span>}
      </> : <strong>{stopped ? "Stopped" : step.status === "succeeded" ? "Complete" : "Processing…"}</strong>}
    </div>
    {measured && step.total! > 0 ? <progress className={styles.bar} max={step.total!} value={step.completed}
      aria-label={`${step.label} progress`} aria-valuetext={`${step.completed} of ${step.total} ${step.unit}, ${remaining} remaining`} />
      : <div className={styles.unknown} aria-hidden="true" />}
    <Outcomes step={step} />
    <div className={styles.activity}>
      {step.current && <span title={step.current}>{step.current}</span>}
      {step.activity && <small>{step.activity}</small>}
      {stopped && <small>Stopped at this step</small>}
    </div>
  </section>;
}

export function StageHistory({ stage }: { stage: AnalysisStage }) {
  if (!stage.substeps?.length || stage.status === "running") return <span>{stage.label}</span>;
  return <details className={styles.history}>
    <summary>{stage.label}<span className={styles.chevron} aria-hidden="true">⌄</span></summary>
    <ol aria-label={`${stage.label} steps`}>
      {stage.substeps.map((step, index) => <li key={index}>
        <span className={styles.historyLabel}>{index + 1}. {step.label}</span>
        <span>{step.total !== null ? `${step.completed} / ${step.total} ${step.unit}` : step.status}</span>
        <Outcomes step={step} />
      </li>)}
    </ol>
  </details>;
}
