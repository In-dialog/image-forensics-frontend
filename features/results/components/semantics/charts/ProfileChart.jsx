import { useId } from 'react';
import { criterionColor, normalizedRating } from '../../../lib/semanticCharts';
import { formatRankingValue } from '../../../lib/structuredResults';
import styles from '../ratingVisuals.module.css';

const polar = (angle, radius) => [160 + Math.cos(angle) * radius, 150 + Math.sin(angle) * radius];
const pathFor = (start, end, radius) => {
  const a = polar(start, radius), b = polar(end, radius);
  return `M160,150 L${a.join(',')} A${radius},${radius} 0 ${end - start > Math.PI ? 1 : 0} 1 ${b.join(',')} Z`;
};

export function ProfileChart({ criteria, ratings, mode, activeId, selectedId, evidenceId, onHover, onSelect }) {
  const patternId = useId();
  const numeric = criteria.filter(criterion => criterion.type === 'score');
  if (!numeric.length) return <p className={styles.chartEmpty}>This result uses categorical ratings.</p>;
  const step = Math.PI * 2 / numeric.length;
  const values = numeric.map(criterion => normalizedRating(criterion, ratings[criterion.id].value));
  const isRadar = mode === 'radar' && numeric.length >= 3;
  const point = (index, value) => polar(-Math.PI / 2 + index * step, 105 * value);
  return <div className={styles.profileChart}>
    <svg viewBox="0 0 320 300" aria-label={isRadar ? 'Radar score profile' : 'Rose score profile'} role="group">
      <defs>{numeric.map((criterion, index) => <pattern key={criterion.id} id={`${patternId}-${index}`} patternUnits="userSpaceOnUse"
        width={index < 4 ? 5 : 8} height={index < 4 ? 5 : 8} patternTransform={`rotate(${[45, -45, 0, 90][index % 4]})`}>
        <rect width="8" height="8" fill="#a5b9ad" fillOpacity=".12" /><line x1="0" y1="0" x2="0" y2="8" stroke="#c5d3ca" strokeWidth="1.2" />
      </pattern>)}</defs>
      {[.25, .5, .75, 1].map(level => isRadar
        ? <polygon key={level} points={numeric.map((_, index) => point(index, level).join(',')).join(' ')} className={styles.chartGrid} />
        : <circle key={level} cx="160" cy="150" r={Math.sqrt(level) * 105} className={styles.chartGrid} />)}
      <text x="165" y="38" className={styles.chartTick}>100%</text>
      {isRadar && values.every(value => value !== null) && <polygon points={values.map((value, index) => point(index, value).join(',')).join(' ')} className={styles.radarFill} />}
      {isRadar && values.map((value, index) => value !== null && values[(index + 1) % values.length] !== null && <line key={index}
        x1={point(index, value)[0]} y1={point(index, value)[1]} x2={point((index + 1) % values.length, values[(index + 1) % values.length])[0]}
        y2={point((index + 1) % values.length, values[(index + 1) % values.length])[1]} className={styles.radarLine} />)}
      {numeric.map((criterion, index) => {
        const angle = -Math.PI / 2 + index * step;
        const radius = values[index] === null ? 105 : Math.sqrt(values[index]) * 105;
        const start = angle - step / 2 + .035, end = angle + step / 2 - .035;
        const label = polar(angle, 126);
        const marker = point(index, values[index] ?? 1);
        return <g key={criterion.id} role="button" tabIndex={0} aria-label={`${criterion.label}: ${formatRankingValue(ratings[criterion.id].value)}. Show evidence`}
          aria-expanded={selectedId === criterion.id} aria-controls={selectedId === criterion.id ? evidenceId(criterion.id) : undefined}
          onMouseEnter={() => onHover(criterion.id)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(criterion.id)} onBlur={() => onHover(null)}
          onClick={() => onSelect(criterion.id)} onKeyDown={event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); onSelect(criterion.id); } }}
          className={styles.profileSector} data-active={activeId === criterion.id} style={{ '--chart-color': criterionColor(criterion.id) }}>
          {isRadar ? <>
            <line x1="160" y1="150" x2={point(index, 1)[0]} y2={point(index, 1)[1]} className={styles.chartGrid} />
            <circle cx={marker[0]} cy={marker[1]} r={values[index] === null ? 6 : 5} className={styles.radarPoint} data-unknown={values[index] === null} />
          </> : <>
            <path d={pathFor(start, end, 105)} className={styles.sectorTrack} />
            {values[index] !== null && values[index] > 0 && <path d={pathFor(start, end, radius)} className={styles.sectorFill} style={{ fill: `url(#${patternId}-${index})` }} />}
            {values[index] === null && <path d={pathFor(start, end, 105)} className={styles.sectorUnknown} />}
          </>}
          <text x={label[0]} y={label[1]} className={styles.axisNumber}>{criteria.indexOf(criterion) + 1}</text>
        </g>;
      })}
    </svg>
  </div>;
}
