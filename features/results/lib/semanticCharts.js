export const CHART_COLORS = ['#d5ded8', '#9dacA2', '#bac8bf', '#81968a', '#c3cec7', '#aabbb0', '#e0e6e2', '#91a399'];

export function hatchBackground(index) {
  const angle = [45, -45, 0, 90][index % 4];
  const spacing = 4 + Math.floor(index / 4) % 3 * 2;
  return `repeating-linear-gradient(${angle}deg, transparent 0 ${spacing - 1}px, #d4e0d770 ${spacing - 1}px ${spacing}px)`;
}

export function criterionColor(id) {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.codePointAt(0)) >>> 0;
  return CHART_COLORS[hash % CHART_COLORS.length];
}

/** Position on a declared scale, not a confidence or probability. */
export function normalizedRating(criterion, value) {
  if (value === null || value === undefined) return null;
  if (criterion.type === 'boolean') return typeof value === 'boolean' ? Number(value) : null;
  if (criterion.type !== 'score' || !Number.isFinite(value) || criterion.max <= criterion.min) return null;
  return Math.max(0, Math.min(1, (value - criterion.min) / (criterion.max - criterion.min)));
}

export function chartAxes(criteria) {
  return [...criteria.filter(criterion => criterion.type === 'score'), ...criteria.filter(criterion => criterion.type === 'boolean')];
}

/** Preserve item identities; zero-sum and incomplete triples cannot be projected. */
export function projectItemBalance(items, axes) {
  const points = [], unknown = [], zero = [];
  if (axes.length !== 3 || new Set(axes.map(axis => axis.id)).size !== 3) return { points, unknown: items, zero };
  for (const item of items) {
    const values = axes.map(axis => normalizedRating(axis, item.ratings[axis.id]?.value));
    if (values.some(value => value === null)) { unknown.push(item); continue; }
    const total = values.reduce((sum, value) => sum + value, 0);
    if (total === 0) { zero.push(item); continue; }
    const shares = values.map(value => value / total);
    points.push({ item, shares, x: shares[0] * 180 + shares[1] * 35 + shares[2] * 325,
      y: shares[0] * 35 + (shares[1] + shares[2]) * 275 });
  }
  return { points, unknown, zero };
}

/** Keep coincident points selectable without jittering their meaning. */
export function groupProjectedPoints(points) {
  const groups = new Map();
  for (const point of points) {
    const key = `${point.x.toFixed(5)},${point.y.toFixed(5)}`;
    if (!groups.has(key)) groups.set(key, { key, x: point.x, y: point.y, points: [] });
    groups.get(key).points.push(point);
  }
  return [...groups.values()];
}

/** A click can cover nearby markers; expose every candidate without moving the data. */
export function nearbyProjectedPoints(groups, target) {
  return groups.filter(group => Math.hypot(group.x - target.x, group.y - target.y) <= 18)
    .flatMap(group => group.points);
}

export function rankingDistribution(items, criterion) {
  if (!criterion) return [];
  let bins;
  if (criterion.type === 'score') {
    bins = Array.from({ length: 5 }, (_, index) => ({ id: `range-${index}`, label: `${index * 20}–${(index + 1) * 20}%`, items: [] }));
  } else {
    bins = (criterion.type === 'boolean' ? [true, false] : criterion.choices).map(value => ({ id: JSON.stringify(value),
      label: typeof value === 'boolean' ? value ? 'Yes' : 'No' : value, value, items: [] }));
  }
  const unknown = { id: 'unknown', label: 'Not enough evidence', items: [] };
  for (const item of items) {
    const value = item.ratings[criterion.id]?.value;
    if (value === null || value === undefined) { unknown.items.push(item); continue; }
    const bin = criterion.type === 'score' ? bins[Math.min(4, Math.floor(normalizedRating(criterion, value) * 5))]
      : bins.find(bin => bin.value === value);
    (bin || unknown).items.push(item);
  }
  if (unknown.items.length) bins.push(unknown);
  return bins.map(bin => ({ ...bin, count: bin.items.length, share: items.length ? bin.items.length / items.length : 0 }));
}
