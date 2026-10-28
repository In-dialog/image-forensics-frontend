import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../features/results/lib/semanticCharts.js', import.meta.url), 'utf8');
const { normalizedRating, projectItemBalance, groupProjectedPoints, nearbyProjectedPoints, rankingDistribution, criterionColor, chartAxes } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const axes = [{ id: 'a', type: 'score', min: -20, max: 80 }, { id: 'b', type: 'score', min: 0, max: 10 }, { id: 'c', type: 'boolean' }];
const item = (name, values) => ({ name, label: 'Same display label', ratings: Object.fromEntries(axes.map((axis, index) => [axis.id, { value: values[index] }])) });

test('scale percentages respect custom minima, preserve false, and never coerce unknown evidence', () => {
  assert.equal(normalizedRating(axes[0], 0), .2);
  assert.equal(normalizedRating(axes[0], -20), 0);
  assert.equal(normalizedRating(axes[0], 80), 1);
  assert.equal(normalizedRating(axes[0], null), null);
  assert.equal(normalizedRating(axes[0], '0'), null);
  assert.equal(normalizedRating(axes[2], false), 0);
  assert.equal(normalizedRating(axes[2], true), 1);
  assert.equal(normalizedRating({ id: 'choice', type: 'choice' }, 'Support'), null);
});

test('the pyramid preserves identity after exclusions and projects vertices exactly', () => {
  const result = projectItemBalance([item('unknown', [null, 1, true]), item('minimum', [-20, 0, false]),
    item('a', [80, 0, false]), item('b', [-20, 10, false]), item('c', [-20, 0, true])], axes);
  assert.deepEqual(result.unknown.map(item => item.name), ['unknown']);
  assert.deepEqual(result.zero.map(item => item.name), ['minimum']);
  assert.deepEqual(result.points.map(point => [point.item.name, point.x, point.y]), [['a', 180, 35], ['b', 35, 275], ['c', 325, 275]]);
  assert.ok(result.points.every(point => Math.abs(point.shares.reduce((a, b) => a + b, 0) - 1) < 1e-9));
});

test('overlapping points retain every item instead of jittering coordinates or losing selection', () => {
  const original = [item('first', [30, 5, true]), item('second', [30, 5, true]), item('third', [80, 0, false])];
  const groups = groupProjectedPoints(projectItemBalance(original, axes).points);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].points.map(point => point.item.name), ['first', 'second']);
  assert.equal(groups[0].x, groups[0].points[0].x);
  assert.deepEqual(nearbyProjectedPoints([...groups, { x: groups[0].x + 5, y: groups[0].y, points: [{ item: { name: 'nearby' } }] }], groups[0]).map(point => point.item.name), ['first', 'second', 'nearby']);
  assert.equal(projectItemBalance(original, [axes[0], axes[0], axes[2]]).points.length, 0);
});

test('distributions include unknown values in the denominator and place the maximum in the last bin', () => {
  const items = [item('minimum', [-20, 0, false]), item('boundary', [0, 2, true]), item('maximum', [80, 10, false]), item('missing', [null, null, null])];
  const bins = rankingDistribution(items, axes[0]);
  assert.deepEqual(bins.map(bin => bin.count), [1, 1, 0, 0, 1, 1]);
  assert.equal(bins.reduce((sum, bin) => sum + bin.share, 0), 1);
  assert.deepEqual(rankingDistribution(items, axes[2]).map(bin => [bin.label, bin.count]), [['Yes', 1], ['No', 2], ['Not enough evidence', 1]]);
  assert.ok(rankingDistribution([], axes[0]).every(bin => bin.share === 0));
});

test('categorical values and renamed descriptors stay distinct and use declared ordering', () => {
  const criterion = { id: 'a', type: 'choice', choices: ['Support', 'unknown', 'Neutral'] };
  const bins = rankingDistribution([item('first', ['unknown', 0, false]), item('second', [null, 0, false]), item('third', ['Support', 0, false])], criterion);
  assert.deepEqual(bins.map(bin => [bin.label, bin.count]), [['Support', 1], ['unknown', 1], ['Neutral', 0], ['Not enough evidence', 1]]);
  assert.notEqual(bins[1].id, bins[3].id);
  assert.equal(criterionColor('stable:id'), criterionColor('stable:id'));
  assert.deepEqual(chartAxes([criterion, axes[2], axes[1]]).map(axis => axis.id), ['b', 'c']);
});
