import { EditorIcon } from './EditorIcon';
import styles from './promptEditor.module.css';

export function ItemActions({ index, count, label, onMove, onRemove, onDuplicate, duplicateDisabled }: {
  index: number; count: number; label: string; onMove: (offset: -1 | 1) => void; onRemove: () => void;
  onDuplicate?: () => void; duplicateDisabled?: boolean;
}) {
  return <div className={styles.itemActions}>
    <div className={styles.reorder} role="group" aria-label="Reorder">
      <button className={styles.actionButton} type="button" disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Move ${label} up`} title="Move up"><EditorIcon name="up" /></button>
      <button className={styles.actionButton} type="button" disabled={index === count - 1} onClick={() => onMove(1)} aria-label={`Move ${label} down`} title="Move down"><EditorIcon name="down" /></button>
    </div>
    {onDuplicate && <button className={styles.actionButton} type="button" disabled={duplicateDisabled} onClick={onDuplicate} aria-label={`Duplicate ${label}`}><EditorIcon name="copy" />Duplicate</button>}
    <button className={`${styles.actionButton} ${styles.removeButton}`} type="button" disabled={count <= 1} onClick={onRemove} aria-label={`Remove ${label}`}><EditorIcon name="remove" />Remove</button>
  </div>;
}
