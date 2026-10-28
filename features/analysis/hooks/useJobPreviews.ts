import { useEffect, useState } from 'react';
import { analysisRequest } from '../api/client';
import { isActiveJob, type AnalysisJob } from '../types';

export type JobPreview = {path: string; label: string; version: string};

export function useJobPreviews(job: AnalysisJob) {
  const [previews, setPreviews] = useState<JobPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const active = isActiveJob(job);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const data = await analysisRequest<{previews: JobPreview[]}>(`/jobs/${encodeURIComponent(job.id)}/previews`, {signal: controller.signal});
        if (controller.signal.aborted) return;
        setPreviews(data.previews); setError(null);
      } catch {
        if (controller.signal.aborted) return;
        setError('Previews are temporarily unavailable. The run log is still available below.');
      }
      if (active && !controller.signal.aborted) timer = setTimeout(refresh, 2500);
    }
    void refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [job.id, active]);
  return {previews, error};
}
