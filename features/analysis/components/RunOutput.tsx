import type { AnalysisJob } from '../types';
import { useJobPreviews } from '../hooks/useJobPreviews';
import { RunLog } from './RunLog';
import { RunPreview } from './RunPreview';
import styles from './runOutput.module.css';

export function RunOutput({ job }: { job: AnalysisJob }) {
  const { previews, error } = useJobPreviews(job);
  return <div className={styles.runOutput}>
    <RunPreview jobId={job.id} previews={previews} error={error} />
    <RunLog lines={job.error ? [...job.logs, job.error] : job.logs} />
  </div>;
}
