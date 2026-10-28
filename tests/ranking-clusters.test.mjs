import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../features/results/lib/rankingClusters.js', import.meta.url), 'utf8');
const { clusterRankings, ratingDistance } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const criteria = [
  { id: 'custom.score', label: 'Influence', type: 'score', min: -20, max: 80 },
  { id: 'choice/id', label: 'Role', type: 'choice', choices: ['Signal', 'Background'] },
  { id: 'flag', label: 'Visible', type: 'boolean' },
];
const item = (name, score, choice, flag, group = 'Objects') => ({ name, group, ratings: {
  'custom.score': { value: score, reason: '' }, 'choice/id': { value: choice, reason: '' }, flag: { value: flag, reason: '' },
} });
const members = groups => groups.map(group => group.items.map(item => item.name));

test('similarity gives scores and categories equal weight and preserves unknowns', () => {
  const zero = item('zero', 0, 'Signal', false);
  assert.equal(ratingDistance(zero, zero, criteria), 0);
  assert.equal(ratingDistance(item('a', -20, 'Signal', false), item('b', 80, 'Background', true), criteria), 1);
  assert.equal(ratingDistance(zero, item('missing', null, null, null), criteria), 1);
  assert.equal(ratingDistance(item('a', 0, null, null), item('b', null, 'Signal', null), criteria), 1);
  const scaled = [{ ...criteria[0], min: -200, max: 800 }];
  assert.equal(ratingDistance(item('a', -20, null, null), item('b', 30, null, null), [criteria[0]]),
    ratingDistance(item('a', -200, null, null), item('b', 300, null, null), scaled));
});

test('similar items cluster together, with fully unknown items kept separate', () => {
  const document = { criteria, items: [item('a', -20, 'Background', false), item('b', -18, 'Background', false),
    item('c', 79, 'Signal', true), item('d', 80, 'Signal', true), item('e', null, null, null)] };
  const original = structuredClone(document);
  const clusters = clusterRankings(document, { count: 2 });
  assert.deepEqual(members(clusters), [['a', 'b'], ['c', 'd'], ['e']]);
  assert.equal(clusters.at(-1).id, 'unknown');
  assert.deepEqual(document, original);
  assert.deepEqual(members(clusterRankings({ ...document, items: [...document.items].reverse() }, { count: 2 })).slice(0, 2), [['a', 'b'], ['c', 'd']]);
});

test('labels and opaque descriptor IDs never change membership', () => {
  const document = { criteria, items: [item('same-label-a', 0, 'Signal', true), item('same-label-b', 80, 'Background', false)] };
  const renamed = { ...document, criteria: criteria.map(criterion => ({ ...criterion, label: 'A renamed criterion' })) };
  assert.deepEqual(members(clusterRankings(document)), members(clusterRankings(renamed)));
  assert.deepEqual(members(clusterRankings(document, { mode: 'criterion:choice/id' })), [['same-label-a'], ['same-label-b']]);
});

test('identical, single, empty, and entirely unknown datasets do not invent extra groups', () => {
  assert.deepEqual(clusterRankings({ criteria, items: [] }), []);
  assert.equal(clusterRankings({ criteria, items: [item('a', 0, 'Signal', false)] }, { count: 8 }).length, 1);
  assert.equal(clusterRankings({ criteria, items: ['a', 'b', 'c'].map(name => item(name, 0, 'Signal', false)) }, { count: 8 }).length, 1);
  const result = clusterRankings({ criteria, items: ['a', 'b'].map(name => item(name, null, null, null)) });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'unknown');
});

test('criterion groups respect declared choices, booleans, custom ranges, and unknown values', () => {
  const document = { criteria, items: [item('a', -20, 'Background', false), item('b', 20, 'Signal', true),
    item('c', 80, null, null), item('d', null, null, null)] };
  assert.deepEqual(members(clusterRankings(document, { mode: 'criterion:custom.score' })), [['a'], ['b'], ['c'], ['d']]);
  assert.deepEqual(clusterRankings(document, { mode: 'criterion:flag' }).map(group => group.label), ['Yes', 'No', 'Not enough evidence']);
  assert.deepEqual(members(clusterRankings(document, { mode: 'criterion:choice/id' })), [['b'], ['a'], ['c', 'd']]);
  assert.deepEqual(clusterRankings(document, { mode: 'criterion:deleted' }), []);
});

test('category names stay dynamic and source subsets contain each item exactly once', () => {
  const document = { criteria, items: [item('a', 0, 'Signal', false, 'Text on clothing'), item('b', 80, 'Background', true, 'Text on clothing'), item('c', 40, null, false, '')] };
  assert.deepEqual(clusterRankings(document, { mode: 'category' }).map(group => group.label), ['Text on clothing', 'Uncategorized']);
  const subset = document.items.slice(1);
  assert.deepEqual(members(clusterRankings(document, { items: subset })).flat().sort(), ['b', 'c']);
});
