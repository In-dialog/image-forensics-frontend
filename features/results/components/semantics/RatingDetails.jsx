import { formatRankingValue } from '../../lib/structuredResults';
import styles from './semantics.module.css';

export function RatingDetails({ criteria, ratings }) {
  return <div className={styles.ratings}>{criteria.map((criterion, index) => {
    const { value, reason } = ratings[criterion.id];
    return <details className={styles.rating} key={criterion.id} open={index === 0}>
      <summary><span>{criterion.label}</span><strong data-unknown={value === null}>{formatRankingValue(value)}</strong></summary>
      {criterion.type === 'score' && value !== null && <div className={styles.scale}>
        <meter min={criterion.min} max={criterion.max} value={value} aria-label={criterion.label} />
        <div><span>{criterion.min} {criterion.low_label}</span><span>{criterion.max} {criterion.high_label}</span></div>
      </div>}
      <p>{reason || 'No supporting explanation was saved.'}</p>
    </details>;
  })}</div>;
}
