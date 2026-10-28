import { useMemo, useState } from 'react';
import { hatchBackground, rankingDistribution } from '../../../lib/semanticCharts';
import styles from '../graphics.module.css';

export function DistributionChart({ document, onSelectItems }) {
  const [requested, setRequested] = useState(document.criteria[0]?.id);
  const criterion = document.criteria.find(item => item.id === requested) || document.criteria[0];
  const bins = useMemo(() => rankingDistribution(document.items, criterion), [document, criterion]);
  return <section className={styles.distribution} aria-label="Ranking distribution">
    <header className={styles.chartHeader}><h3>Distribution</h3><span>{document.items.length} items</span></header>
    <label className={styles.dimensionSelect}><span>Dimension</span><select value={criterion.id} onChange={event => setRequested(event.target.value)}>
      {document.criteria.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}
    </select></label>
    <div className={styles.distributionStrip} aria-hidden="true">{bins.map((bin, index) => <span key={bin.id} style={{ width: `${bin.share * 100}%`, backgroundColor: '#3c4d42', backgroundImage: hatchBackground(index) }} />)}</div>
    <div className={styles.bars}>{bins.map((bin, index) => <button key={bin.id} type="button" disabled={!bin.count} onClick={() => onSelectItems({ label: `${criterion.label} · ${bin.label}`, items: bin.items })}
      aria-label={`${criterion.label}: ${bin.label}, ${bin.count} items, ${Math.round(bin.share * 100)}%. Show items`}>
      <span className={styles.barLabel}>{bin.label}<strong>{Math.round(bin.share * 100)}% <small>({bin.count})</small></strong></span>
      <span className={styles.barTrack}><span style={{ width: `${bin.share * 100}%`, backgroundColor: '#64776a', backgroundImage: hatchBackground(index) }} /></span>
    </button>)}</div>
    <p className={styles.chartCaption}>{criterion.type === 'score' ? `Bins use the ${criterion.min}–${criterion.max} score scale. ` : ''}Percentages include all {document.items.length} items.</p>
  </section>;
}
