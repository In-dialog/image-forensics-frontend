import { useMemo, useState } from 'react';
import { chartAxes, groupProjectedPoints, nearbyProjectedPoints, projectItemBalance, CHART_COLORS } from '../../../lib/semanticCharts';
import { resultItemLabel } from '../../../lib/structuredResults';
import styles from '../graphics.module.css';

const vertices = [[180, 35], [35, 275], [325, 275]];
const between = (a, b, t) => a.map((value, index) => value + (b[index] - value) * t);

export function PyramidChart({ document, items = document.items, selectedName, highlightedNames, onSelect }) {
  const available = useMemo(() => chartAxes(document.criteria), [document]);
  const [requested, setRequested] = useState(() => available.slice(0, 3).map(axis => axis.id));
  const axes = requested.map(id => available.find(axis => axis.id === id)).filter(Boolean);
  const projection = useMemo(() => projectItemBalance(items, axes), [items, axes]);
  const groups = useMemo(() => groupProjectedPoints(projection.points), [projection]);
  const [hovered, setHovered] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const active = groups.find(group => group.key === expanded?.key);
  const activePoints = active ? expanded.nearby ? nearbyProjectedPoints(groups, active) : active.points : [];
  function chooseAxis(index, value) {
    const next = [...requested], duplicate = next.indexOf(value);
    if (duplicate >= 0) next[duplicate] = next[index];
    next[index] = value; setRequested(next); setExpanded(null);
  }
  function choose(group, nearby = true) {
    const points = nearby ? nearbyProjectedPoints(groups, group) : group.points;
    if (points.length === 1) onSelect(points[0].item.name);
    else setExpanded(current => current?.key === group.key && current.nearby === nearby ? null : { key: group.key, nearby });
  }
  return <section className={styles.pyramid} aria-label="Item balance pyramid">
    <header className={styles.chartHeader}><h3>Item balance</h3>
      <details className={styles.axisSettings}><summary>Axes</summary><div>
        {[0, 1, 2].map(index => <label key={index}>Axis {String.fromCharCode(65 + index)}<select value={requested[index] || ''} onChange={event => chooseAxis(index, event.target.value)}>
          {!requested[index] && <option value="">Choose a dimension</option>}
          {available.map(axis => <option key={axis.id} value={axis.id}>{axis.label}{axis.type === 'boolean' ? ' (No / Yes)' : ''}</option>)}
        </select></label>)}
      </div></details>
    </header>
    <svg viewBox="0 0 360 310" className={styles.pyramidSvg} role="group" aria-label="Pyramid of relative ranking balance">
      {[.2, .4, .6, .8].flatMap(t => vertices.map((vertex, index) => {
        const a = between(vertex, vertices[(index + 1) % 3], t), b = between(vertex, vertices[(index + 2) % 3], t);
        return <line key={`${t}-${index}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className={styles.chartGrid} />;
      }))}
      <polygon points={vertices.map(point => point.join(',')).join(' ')} className={styles.triangle} />
      {vertices.map((vertex, index) => <text key={index} x={vertex[0]} y={vertex[1] + (index === 0 ? -13 : 22)} className={styles.axisLetter} fill={CHART_COLORS[index]}>{String.fromCharCode(65 + index)}</text>)}
      {axes.length === 3 && [...groups].sort((a, b) => a.points.length - b.points.length).map(group => {
        const selected = group.points.some(point => point.item.name === selectedName);
        const highlighted = !highlightedNames || group.points.some(point => highlightedNames.has(point.item.name));
        const label = group.points.length === 1 ? resultItemLabel(group.points[0].item) : `${group.points.length} overlapping items`;
        return <g key={group.key} role="button" tabIndex={0} aria-label={`Inspect ${label}`} className={styles.pyramidPoint}
          data-selected={selected} data-dimmed={!highlighted} onClick={() => choose(group)}
          onKeyDown={event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); choose(group, false); } }}
          onMouseEnter={() => setHovered(group.key)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(group.key)} onBlur={() => setHovered(null)}>
          <title>{label}</title><circle cx={group.x} cy={group.y} r={group.points.length > 1 ? 11 : 7} />
          {group.points.length > 1 && <text x={group.x} y={group.y + 1}>{group.points.length}</text>}
        </g>;
      })}
    </svg>
    {axes.length < 3 ? <p className={styles.chartEmpty}>The pyramid needs three score or yes/no criteria.</p> : <>
      <div className={styles.axisLegend}>{axes.map((axis, index) => <span key={axis.id}><i style={{ color: CHART_COLORS[index] }}>{String.fromCharCode(65 + index)}</i>{axis.label}</span>)}</div>
      <p className={styles.chartCaption}>Relative balance of normalized ratings · {projection.points.length} plotted
        {projection.unknown.length > 0 && ` · ${projection.unknown.length} unknown`}{projection.zero.length > 0 && ` · ${projection.zero.length} all at minimum`}</p>
      <div className={styles.pointReadout} role="status">{hovered ? (() => {
        const group = groups.find(item => item.key === hovered);
        if (!group) return null;
        return <><strong>{group.points.length === 1 ? resultItemLabel(group.points[0].item) : `${group.points.length} items at this position`}</strong>
          <span>{group.points[0].shares.map((share, index) => `${String.fromCharCode(65 + index)} ${Math.round(share * 100)}%`).join(' · ')}</span></>;
      })() : <span>Select a point to inspect its items</span>}</div>
    </>}
    {active && <div className={styles.pointItems} data-point-items aria-label={expanded.nearby ? 'Items in this area' : 'Items at this position'}><header><span>{activePoints.length} items {expanded.nearby ? 'in this area' : 'at this position'}</span><button type="button" onClick={() => setExpanded(null)} aria-label="Close overlapping items">×</button></header>
      {activePoints.map(point => <button type="button" key={point.item.name} onClick={() => onSelect(point.item.name)}>{resultItemLabel(point.item)}<span>↗</span></button>)}
    </div>}
  </section>;
}
