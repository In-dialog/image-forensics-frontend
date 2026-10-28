/** Compare saved ratings on equal scales. Missing evidence never becomes zero or false. */
export function ratingDistance(first, second, criteria) {
  let distance = 0, compared = 0;
  for (const criterion of criteria) {
    const a = first.ratings[criterion.id]?.value ?? null;
    const b = second.ratings[criterion.id]?.value ?? null;
    if (a === null && b === null) continue;
    compared++;
    distance += a === null || b === null ? 1 : criterion.type === 'score'
      ? Math.abs(a - b) / (criterion.max - criterion.min) : Number(a !== b);
  }
  return compared ? distance / compared : 1;
}

function representative(items, criteria) {
  return { ratings: Object.fromEntries(criteria.map(criterion => {
    const values = items.map(item => item.ratings[criterion.id].value).filter(value => value !== null);
    let value = null;
    if (values.length && criterion.type === 'score') value = values.reduce((sum, next) => sum + next, 0) / values.length;
    else if (values.length) {
      const counts = new Map();
      for (const next of values) counts.set(next, (counts.get(next) || 0) + 1);
      value = [...counts].sort((a, b) => b[1] - a[1])[0][0];
    }
    return [criterion.id, { value }];
  })) };
}

const number = value => Number(value.toFixed(2)).toLocaleString('en-US');
const display = value => typeof value === 'boolean' ? value ? 'Yes' : 'No' : typeof value === 'number' ? number(value) : value;
const unknown = items => ({ id: 'unknown', label: 'Not enough evidence', description: 'Unrated items', items });

function describeGroup(items, allItems, criteria) {
  const center = representative(items, criteria);
  const overall = representative(allItems, criteria);
  const candidates = criteria.map(criterion => {
    const value = center.ratings[criterion.id].value;
    const baseline = overall.ratings[criterion.id].value;
    const contrast = value === null ? -1 : criterion.type === 'score'
      ? Math.abs(value - (baseline ?? value)) / (criterion.max - criterion.min)
      : items.filter(item => item.ratings[criterion.id].value === value).length / items.length -
        allItems.filter(item => item.ratings[criterion.id].value === value).length / allItems.length;
    return { criterion, value, contrast };
  }).sort((a, b) => b.contrast - a.contrast);
  const first = candidates[0];
  return first?.value != null ? `${first.criterion.label}: ${display(first.value)}${first.criterion.type === 'score' ? ' avg.' : ''}` : 'Similar saved ratings';
}

/** Deterministic mixed-rating clustering; works entirely from the downloaded result. */
export function clusterRankings(document, { mode = 'similarity', count = 'auto', items = document.items } = {}) {
  const { criteria } = document;
  if (!items.length) return [];
  if (mode === 'category') {
    const groups = new Map();
    for (const item of items) {
      const group = item.group?.trim() ? item.group : 'Uncategorized';
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(item);
    }
    return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([label, members]) =>
      ({ id: `category:${label}`, label, description: 'Detected category', items: members }));
  }
  if (mode.startsWith('criterion:')) {
    const criterion = criteria.find(item => item.id === mode.slice(10));
    if (!criterion) return [];
    const groups = new Map();
    const missing = [];
    for (const item of items) {
      const value = item.ratings[criterion.id].value;
      if (value === null) { missing.push(item); continue; }
      const key = criterion.type === 'score' ? Math.min(2, Math.floor(3 * (value - criterion.min) / (criterion.max - criterion.min))) : value;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }
    const order = criterion.type === 'choice' ? criterion.choices : criterion.type === 'boolean' ? [true, false] : [0, 1, 2];
    const result = order.filter(key => groups.has(key)).map(key => {
      const step = (criterion.max - criterion.min) / 3;
      const label = criterion.type === 'score' ? ['Lower third', 'Middle third', 'Upper third'][key] : display(key);
      const description = criterion.type === 'score' ? `${criterion.label} · ≈ ${number(criterion.min + key * step)} to ${number(criterion.min + (key + 1) * step)}` : criterion.label;
      return { id: `${mode}:${key}`, label, description, items: groups.get(key) };
    });
    return missing.length ? [...result, unknown(missing)] : result;
  }

  const known = items.filter(item => criteria.some(criterion => item.ratings[criterion.id].value !== null))
    .sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  const missing = items.filter(item => criteria.every(criterion => item.ratings[criterion.id].value === null));
  if (!known.length) return [unknown(missing)];
  const requested = count === 'auto' ? Math.max(2, Math.round(Math.sqrt(known.length / 2))) : Number(count);
  const size = Math.min(known.length, Math.max(1, Math.min(8, Number.isFinite(requested) ? requested : 1)));
  let centers = [known[0]];
  while (centers.length < size) {
    let farthest = null, largest = 0;
    for (const item of known) {
      const distance = Math.min(...centers.map(center => ratingDistance(item, center, criteria)));
      if (distance > largest + 1e-9) { farthest = item; largest = distance; }
    }
    if (!farthest) break;
    centers.push(farthest);
  }
  let assignments = [];
  let groups = [];
  for (let iteration = 0; iteration < 16; iteration++) {
    const next = known.map(item => {
      let closest = 0, distance = Infinity;
      centers.forEach((center, index) => {
        const candidate = ratingDistance(item, center, criteria);
        if (candidate < distance) { closest = index; distance = candidate; }
      });
      return closest;
    });
    groups = centers.map((_, index) => known.filter((__, itemIndex) => next[itemIndex] === index));
    if (next.every((value, index) => value === assignments[index])) break;
    assignments = next;
    centers = groups.map((members, index) => members.length ? representative(members, criteria) : centers[index]);
  }
  const result = groups.filter(group => group.length).map((members, index) => ({
    id: `similarity:${members[0].name}`, label: `Group ${index + 1}`,
    description: describeGroup(members, known, criteria), items: members,
  }));
  return missing.length ? [...result, unknown(missing)] : result;
}
