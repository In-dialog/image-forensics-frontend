import type { JobPreview } from '../hooks/useJobPreviews';
import styles from './runOutput.module.css';

export function PreviewStrip({ previews, selectedPath, onSelect, imageUrl }: {
  previews: JobPreview[];
  selectedPath?: string;
  onSelect: (path: string) => void;
  imageUrl: (preview: JobPreview) => string;
}) {
  return <nav className={styles.previewStrip} aria-label="Output previews">
    {previews.map(preview => <button type="button" key={preview.path} title={preview.label}
      aria-label={`Show ${preview.label}`} aria-pressed={selectedPath === preview.path} onClick={() => onSelect(preview.path)}>
      {/* Local outputs are generated incrementally and can have any aspect ratio. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl(preview)} alt="" loading="lazy" />
    </button>)}
  </nav>;
}
