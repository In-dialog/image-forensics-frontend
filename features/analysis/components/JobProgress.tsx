import Link from "next/link";
import { isActiveJob, type AnalysisJob } from "../types";
import styles from "../analysis.module.css";
import { StageProgress, StageHistory } from "./StageProgress";

const statusLabels = { queued: "Waiting to start", running: "Analysis running", succeeded: "Analysis complete", failed: "Analysis failed", interrupted: "Analysis interrupted" };

export function JobProgress({ job, importState, onRetryImport }: {
  job: AnalysisJob | null;
  importState?: { status: "downloading" | "saved" | "failed"; url?: string; error?: string };
  onRetryImport: () => void;
}) {
  if (!job) return <section className={styles.progress} aria-labelledby="progress-heading">
    <h2 id="progress-heading">Run progress</h2>
    <p className={styles.emptyProgress}>Your analysis will appear here.</p>
    <p className={styles.hint}>Choose an image and start the stages together. You can return to this page while the backend keeps working.</p>
  </section>;
  const currentStage = job.stages.find((stage) => stage.key === job.stage_key);
  const active = isActiveJob(job);
  return (
    <section className={styles.progress} aria-labelledby="progress-heading">
      <h2 id="progress-heading">Run progress</h2>
      <div aria-live="polite" aria-atomic="true">
        <p className={`${styles.jobStatus} ${job.status === "failed" || job.status === "interrupted" ? styles.errorText : ""}`}>
          {job.status === 'queued' && job.queue_position ? `Queued · ${job.queue_position} in line` : statusLabels[job.status]}
        </p>
        <p className={styles.jobFilename} title={job.original_filename || job.result_id || undefined}>{job.original_filename || job.result_id}</p>
        <p className={styles.hint}>{job.completed_stages} of {job.total_stages} stages completed{active && currentStage && !currentStage.current_substep ? ` · ${currentStage.label}` : ""}</p>
      </div>
      <progress className={styles.progressBar} max={Math.max(1, job.total_stages)} value={job.completed_stages} aria-label="Completed analysis stages" />
      {currentStage && job.status !== "succeeded" && <StageProgress stage={currentStage} />}
      {job.error && <p role="alert" className={styles.errorText}>{currentStage ? currentStage.label + ' stopped.' : 'The run stopped.'} The latest error is shown in the run log.</p>}
      {job.status === "succeeded" && <div className={styles.importStatus} aria-live="polite">
        {(!importState || importState.status === "downloading") && <p className={styles.hint}>Downloading results to this viewer…</p>}
        {importState?.status === "saved" && <>
          <p className={styles.hint}>Results are saved here and ready to explore.</p>
          <Link className={styles.primaryButton} href={importState.url!}>View results <span aria-hidden="true">→</span></Link>
        </>}
        {importState?.status === "failed" && <>
          <p role="alert" className={styles.errorText}>The analysis finished, but the results could not be downloaded. {importState.error}</p>
          <button type="button" className={styles.secondaryButton} onClick={onRetryImport}>Retry download</button>
        </>}
      </div>}
      <ol className={styles.jobStages}>
        {job.stages.map((stage) => <li key={stage.key} data-status={stage.status}>
          <span className={styles.stageIndicator} aria-hidden="true">{stage.status === "succeeded" ? "✓" : stage.status === "failed" ? "!" : stage.status === "running" ? "●" : "○"}</span>
          <StageHistory stage={stage} /><span className={styles.srOnly}> — {stage.status}</span>
        </li>)}
      </ol>
    </section>
  );
}
