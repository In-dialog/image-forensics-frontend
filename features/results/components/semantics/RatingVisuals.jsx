import { useId, useRef, useState } from 'react';
import { ScoreGauge } from './charts/ScoreGauge';
import { ProfileChart } from './charts/ProfileChart';
import { RatingEvidence } from './RatingEvidence';
import styles from './ratingVisuals.module.css';

export function RatingVisuals({ criteria, ratings }) {
  const id = useId();
  const buttons = useRef(new Map());
  const [mode, setMode] = useState('rose');
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const numeric = criteria.filter(criterion => criterion.type === 'score');
  function select(id) { setSelected(current => current === id ? null : id); }
  function closeEvidence(id) {
    setSelected(null);
    buttons.current.get(id)?.focus({ preventScroll: true });
  }
  const evidenceId = criterionId => `${id}-evidence-${criteria.findIndex(criterion => criterion.id === criterionId)}`;
  return <div className={styles.container}><div className={styles.layout} data-profile={numeric.length > 0}>
    {numeric.length > 0 && <section className={styles.profile} aria-label="Score profile">
      <header className={styles.chartHeader}><h3>Score profile</h3><div className={styles.chartModes} role="group" aria-label="Profile style">
        <button type="button" aria-pressed={mode === 'rose'} onClick={() => setMode('rose')}>Rose</button>
        <button type="button" aria-pressed={mode === 'radar'} disabled={numeric.length < 3} title={numeric.length < 3 ? 'Radar needs three score criteria' : 'Radar profile'} onClick={() => setMode('radar')}>Radar</button>
      </div></header>
      <ProfileChart criteria={criteria} ratings={ratings} mode={mode} activeId={hovered || selected}
        selectedId={selected} evidenceId={evidenceId} onHover={setHovered} onSelect={select} />
    </section>}
    <section className={styles.gaugesSection} aria-label="Rating gauges">
      <header className={styles.chartHeader}><h3>Ratings</h3>{numeric.length > 0 && <span>% of each score’s scale</span>}</header>
      <div className={styles.gaugeGrid}>{criteria.map((criterion, index) => <div key={criterion.id} className={styles.ratingEntry}>
        <ScoreGauge criterion={criterion} rating={ratings[criterion.id]} number={index + 1} evidenceId={evidenceId(criterion.id)}
          buttonRef={element => { if (element) buttons.current.set(criterion.id, element); else buttons.current.delete(criterion.id); }}
          active={hovered === criterion.id} selected={selected === criterion.id}
          onHover={event => setHovered(event === null ? null : criterion.id)} onSelect={() => select(criterion.id)} />
        {selected === criterion.id && <RatingEvidence id={evidenceId(criterion.id)} criterion={criterion} rating={ratings[criterion.id]}
          onClose={() => closeEvidence(criterion.id)} />}
      </div>)}</div>
    </section>
  </div></div>;
}
