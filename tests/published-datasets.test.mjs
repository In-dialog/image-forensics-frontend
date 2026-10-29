import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadDatasets } from '../cloudflare/lib/loadDatasets.mjs';

const item = id => ({ id, name: 'old name', availableFiles: ['metadata.json', 'original/original.webp'] });
const metadata = { source_image: 'current name.jpg', image_width: 100, image_height: 100, extracts: [] };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

test('fresh metadata is authoritative; deleted entries are omitted even when an old catalog lists them', async () => {
  const datasets = await loadDatasets({ fetcher: async (url, options) => {
    assert.equal(options.cache, 'no-store');
    if (url === '/data/catalog.json') return json([item('deleted'), item('live')]);
    if (url.includes('/deleted/')) return json({}, 404);
    if (url.endsWith('metadata.json')) return json(metadata);
    return new Response(null, { status: 200 });
  } });
  assert.deepEqual(datasets.map(dataset => dataset.id), ['live']);
  assert.equal(datasets[0].name, 'current name.jpg');
  assert.equal(datasets[0].previewUrl, '/data/live/original/original.webp');
});

test('missing preview produces no-preview state, without removing a valid result', async () => {
  const datasets = await loadDatasets({ fetcher: async url => {
    if (url === '/data/catalog.json') return json([item('live')]);
    if (url.endsWith('metadata.json')) return json(metadata);
    return json({}, 404);
  } });
  assert.equal(datasets.length, 1);
  assert.equal(datasets[0].previewUrl, '');
});

test('empty catalog succeeds; service errors do not masquerade as an empty database', async () => {
  assert.deepEqual(await loadDatasets({ fetcher: async () => json([]) }), []);
  await assert.rejects(loadDatasets({ fetcher: async () => json({}, 503) }), /index/);
  await assert.rejects(loadDatasets({ fetcher: async url => url.endsWith('catalog.json') ? json([item('live')]) : json({}, 500) }), /metadata/);
  await assert.rejects(loadDatasets({ fetcher: async () => json([item('../private')]) }), /Invalid/);
});

test('each load discovers additions and deletions instead of retaining a previous response', async () => {
  let current = [item('first')];
  const fetcher = async url => url.endsWith('catalog.json') ? json(current) : url.endsWith('metadata.json') ? json(metadata) : new Response(null);
  assert.deepEqual((await loadDatasets({ fetcher })).map(dataset => dataset.id), ['first']);
  current = [item('second')];
  assert.deepEqual((await loadDatasets({ fetcher })).map(dataset => dataset.id), ['second']);
});
