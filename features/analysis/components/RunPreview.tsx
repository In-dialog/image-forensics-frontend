import { useState } from 'react';
import type { JobPreview } from '../hooks/useJobPreviews';
import { PreviewStrip } from './PreviewStrip';
import styles from './runOutput.module.css';

function PreviewImage({ src, label }: { src: string; label: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? <p className={styles.placeholder} role="status">This preview is still being written.</p>
    // Local outputs can change while a run is writing them.
    // eslint-disable-next-line @next/next/no-img-element
    : <img className={styles.previewImage} src={src} alt={label} onError={() => setFailed(true)} />;
}

export function RunPreview({ jobId, previews, error }: { jobId: string; previews: JobPreview[]; error: string | null }) {
  const [selected, setSelected] = useState<string | null>(null);
  const current = previews.find(preview => preview.path === selected) || previews[0];
  const imageUrl = (preview: JobPreview) => `/api/analysis/jobs/${encodeURIComponent(jobId)}/preview/${preview.path.split('/').map(encodeURIComponent).join('/')}?v=${encodeURIComponent(preview.version)}`;
  return <section className={styles.previews} aria-labelledby="preview-heading">
    <header className={styles.previewHeading}>
      <h2 id="preview-heading">Preview</h2>
      {selected && <button type="button" onClick={() => setSelected(null)}>Follow latest</button>}
    </header>
    <div className={styles.previewStage}>
      {current ? <PreviewImage key={imageUrl(current)} src={imageUrl(current)} label={current.label} />
        : <p className={styles.placeholder}>{error || 'Previews appear here as stages produce images.'}</p>}
    </div>
    <footer className={styles.previewFooter}>
      {current && <p className={styles.previewCaption} title={current.label}>{current.label}</p>}
      {error && current && <p className={styles.previewError} role="status">{error}</p>}
      {previews.length > 1 && <PreviewStrip previews={previews} selectedPath={current?.path} onSelect={setSelected} imageUrl={imageUrl} />}
    </footer>
  </section>;
}
