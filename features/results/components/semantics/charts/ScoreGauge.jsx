import { criterionColor, normalizedRating } from '../../../lib/semanticCharts';
import { formatRankingValue } from '../../../lib/structuredResults';
import styles from '../ratingVisuals.module.css';

export function ScoreGauge({ criterion, rating, number, active, selected, evidenceId, buttonRef, onHover, onSelect }) {
  const value = rating.value;
  const percent = normalizedRating(criterion, value);
  const color = criterionColor(criterion.id);
  return <button ref={buttonRef} type="button" className={styles.gauge} data-active={active || selected}
    data-selected={selected} data-criterion={criterion.id} style={{ '--chart-color': color }}
    aria-label={`${criterion.label}: ${formatRankingValue(value)}${criterion.type === 'score' && percent !== null ? `, ${Math.round(percent * 100)}% of scale` : ''}. Show evidence`}
    aria-expanded={selected} aria-controls={selected ? evidenceId : undefined}
    onClick={onSelect} onMouseEnter={onHover} onMouseLeave={() => onHover(null)} onFocus={onHover} onBlur={() => onHover(null)}>
    <span className={styles.criterionNumber} aria-hidden="true">{number}</span>
    {criterion.type === 'score' ? <svg viewBox="0 0 100 100" className={styles.gaugeSvg} aria-hidden="true">
      <circle cx="50" cy="50" r="39" className={styles.gaugeTrack} strokeDasharray={value === null ? '3 5' : undefined} />
      {percent !== null && percent > 0 && <circle cx="50" cy="50" r="39" pathLength="100" className={styles.gaugeFill}
        strokeDasharray={`${percent * 100} 100`} transform="rotate(-90 50 50)" />}
      <text x="50" y="52" className={styles.gaugeNumber}>{percent === null ? '—' : `${Math.round(percent * 100)}%`}</text>
    </svg> : <div className={styles.categoryValue} data-unknown={value === null}>
      <span className={styles.categoryMark}>{value === null ? '?' : criterion.type === 'boolean' ? value ? '●' : '○' : '◇'}</span>
    </div>}
    <span className={styles.gaugeText}>
      <span className={styles.gaugeLabel}>{criterion.label}</span>
      <span className={styles.gaugeValue}><strong>{value === null ? 'Unknown' : formatRankingValue(value)}</strong>
        <span>{criterion.type === 'score' ? `on ${criterion.min} → ${criterion.max}` : criterion.type === 'boolean' ? 'Yes / No' : 'Category'}</span>
      </span>
    </span>
    <svg className={styles.chevron} width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
  </button>;
}
