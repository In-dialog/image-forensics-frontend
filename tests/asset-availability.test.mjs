import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = await readFile(new URL('../features/results/lib/assetAvailability.js', import.meta.url), 'utf8');
const { makeAssetAvailability } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('a result manifest suppresses skipped stages while allowing encoded child crop names', () => {
  const hasAsset = makeAssetAvailability('/api/datasets/example/files', ['metadata.json', 'segments/person_0.webp', 'granular_segments/people/person_0/blue mark.webp']);
  assert.equal(hasAsset('/api/datasets/example/files/metadata.json'), true);
  assert.equal(hasAsset('/api/datasets/example/files/granular_segments/people/person_0/blue%20mark.webp'), true);
  assert.equal(hasAsset('/api/datasets/example/files/pose/person_0_pose.webp'), false);
  assert.equal(hasAsset('/api/datasets/example/files/depth/depth.webp'), false);
  assert.equal(hasAsset('/api/datasets/other/files/metadata.json'), false);
});

test('missing file inventories cannot trigger speculative asset requests', () => {
  assert.throws(() => makeAssetAvailability('/example', undefined), /inventory is required/);
  assert.throws(() => makeAssetAvailability('/example', null), /inventory is required/);
  assert.equal(makeAssetAvailability('/example', [])('/example/metadata.json'), false);
});
