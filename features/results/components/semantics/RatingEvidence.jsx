import styles from './ratingVisuals.module.css';

export function RatingEvidence({ id, criterion, rating, onClose }) {
  return <section id={id} className={styles.evidence} aria-label="Rating evidence">
    <header><h4>Evidence</h4><button type="button" onClick={onClose} aria-label="Close rating evidence">×</button></header>
    <p>{rating.reason || 'No supporting explanation was saved.'}</p>
    {criterion.type === 'score' && <div className={styles.scaleMeaning}>
      <span><strong>{criterion.min}</strong>{criterion.low_label || 'Scale minimum'}</span>
      <span><strong>{criterion.max}</strong>{criterion.high_label || 'Scale maximum'}</span>
    </div>}
  </section>;
}
