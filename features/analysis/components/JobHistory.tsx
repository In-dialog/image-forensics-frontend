import type { AnalysisJob } from "../types";
import styles from "../analysis.module.css";

export function JobHistory({ jobs, selectedId, onSelect }: { jobs: AnalysisJob[]; selectedId?: string; onSelect: (job: AnalysisJob) => void }) {
  if (!jobs.length) return null;
  return <section className={styles.history} aria-labelledby="history-heading">
    <h2 id="history-heading">Recent analyses</h2>
    <ul>{jobs.slice(0, 10).map((job) => <li key={job.id}>
      <button type="button" className={styles.historyItem} aria-pressed={selectedId === job.id} onClick={() => onSelect(job)}>
        <span className={styles.historyName}>{job.original_filename || job.result_id}</span>
        <span className={styles.historyMeta}><time dateTime={job.created_at}>{new Date(job.created_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}</time> · {job.status === "succeeded" ? "Complete" : job.status}</span>
      </button>
    </li>)}</ul>
  </section>;
}
