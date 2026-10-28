import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { createExportPlan, writeExport, redactRuntimeProvenance } from '../scripts/export-datasets.mjs';
import { normalizeSegmentFiles } from '../scripts/finalize-static-export.mjs';

async function fixture(run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'forensics-static-test-'));
  const data = path.join(root, 'data');
  const dataset = path.join(data, 'an-image');
  await fs.mkdir(path.join(dataset, 'original'), { recursive: true });
  await fs.writeFile(path.join(dataset, 'metadata.json'), JSON.stringify({ source_image: 'sample.jpg', image_width: 200, image_height: 100, extracts: [] }));
  await fs.writeFile(path.join(dataset, 'original', 'original.webp'), 'image fixture');
  await fs.writeFile(path.join(dataset, 'vision_calls_debug.json'), '{"private":true}');
  await fs.writeFile(path.join(dataset, 'prompt.txt'), 'private prompt');
  const files = ['metadata.json', 'original/original.webp', 'vision_calls_debug.json', 'prompt.txt'];
  const marker = async value => fs.writeFile(path.join(dataset, '.import.json'), JSON.stringify({ files: value }));
  await marker(files);
  try { await run({ root, data, dataset, files, marker }); }
  finally {
    if (path.dirname(root) === os.tmpdir() && path.basename(root).startsWith('forensics-static-test-')) {
      await fs.rm(root, { recursive: true, force: true });
    }
  }
}

test('static catalog publishes completed viewer assets without private diagnostics or API URLs', () => fixture(async ({ root, data }) => {
  const plan = await createExportPlan(data);
  assert.equal(plan.datasets.length, 1);
  assert.equal(plan.datasets[0].basePath, '/data/an-image');
  assert.equal(plan.datasets[0].previewUrl, '/data/an-image/original/original.webp');
  assert.deepEqual(plan.datasets[0].availableFiles, ['metadata.json', 'original/original.webp']);
  await writeExport(plan, root);
  assert.equal(await fs.readFile(path.join(root, 'cloudflare', 'public', 'data', 'an-image', 'original', 'original.webp'), 'utf8'), 'image fixture');
  const published = await fs.readdir(path.join(root, 'cloudflare', 'public', 'data', 'an-image'));
  assert.deepEqual(published.sort(), ['metadata.json', 'original']);
  assert.equal(JSON.parse(await fs.readFile(path.join(root, 'cloudflare', 'generated', 'catalog.json')))[0].id, 'an-image');
}));

test('unsafe and duplicate manifest paths cannot be published', () => fixture(async ({ data, marker }) => {
  for (const file of ['../metadata.json', '.private/secret.json', 'original\\image.webp', 'metadata.json:stream', 'CON.json']) {
    await marker(['metadata.json', file]);
    await assert.rejects(createExportPlan(data), /Invalid import inventory/);
  }
  await marker(['metadata.json', 'METADATA.JSON']);
  await assert.rejects(createExportPlan(data), /Invalid import inventory/);
}));

test('preflight checks missing assets and Cloudflare limits without writing generated output', () => fixture(async ({ root, data, marker }) => {
  await assert.rejects(createExportPlan(data, { maxAssetBytes: 5 }), /asset size limit/);
  await assert.rejects(createExportPlan(data, { maxFiles: 1 }), /Too many dataset files/);
  await marker(['metadata.json', 'original/missing.webp']);
  await assert.rejects(createExportPlan(data), /ENOENT/);
  await assert.rejects(fs.access(path.join(root, 'cloudflare')), /ENOENT/);
}));

test('unfinished folders are skipped and dataset junctions cannot escape the export root', () => fixture(async ({ root, data }) => {
  await fs.mkdir(path.join(data, '.import-interrupted'));
  await fs.mkdir(path.join(data, 'unfinished'));
  assert.equal((await createExportPlan(data)).datasets.length, 1);
  const external = path.join(root, 'outside');
  await fs.mkdir(external);
  await fs.symlink(external, path.join(data, 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(createExportPlan(data), /Dataset links are not publishable/);
}));

test('regeneration replaces stale generated datasets but preserves supplied source files', () => fixture(async ({ root, data, dataset }) => {
  await writeExport(await createExportPlan(data), root);
  const old = path.join(root, 'cloudflare', 'public', 'data', 'deleted-dataset');
  await fs.mkdir(old);
  await fs.writeFile(path.join(old, 'secret.json'), '{}');
  await writeExport(await createExportPlan(data), root);
  await assert.rejects(fs.access(old), /ENOENT/);
  await fs.access(path.join(dataset, 'vision_calls_debug.json'));
  await fs.access(path.join(dataset, '.import.json'));
}));

test('custom item and part asset references remain publishable independently of labels or folders', () => fixture(async ({ data, dataset, files, marker }) => {
  await fs.mkdir(path.join(dataset, 'custom'));
  await fs.writeFile(path.join(dataset, 'custom', 'object.png'), 'custom image');
  await fs.writeFile(path.join(dataset, 'custom', 'child.png'), 'custom part');
  await fs.writeFile(path.join(dataset, 'custom', 'parts.json'), JSON.stringify({ extracts: [{ name: 'Renamed part', image_path: 'custom/child.png' }] }));
  await fs.writeFile(path.join(dataset, 'metadata.json'), JSON.stringify({ image_width: 200, image_height: 100, extracts: [
    { name: 'Any label', group: 'Any category', image_path: 'custom/object.png', parts_metadata_path: 'custom/parts.json' },
  ] }));
  await marker([...files, 'custom/object.png', 'custom/child.png', 'custom/parts.json']);
  const plan = await createExportPlan(data);
  for (const file of ['custom/object.png', 'custom/child.png', 'custom/parts.json']) assert.ok(plan.datasets[0].availableFiles.includes(file), file);
}));

test('nested static navigation payloads gain the exact browser filename on Windows and remain idempotent', () => fixture(async ({ root }) => {
  const output = path.join(root, 'static');
  const payload = path.join(output, 'results', '__next.results', '$d$datasetId', '__PAGE__.txt');
  await fs.mkdir(path.dirname(payload), { recursive: true });
  await fs.writeFile(payload, 'navigation payload');
  assert.equal(await normalizeSegmentFiles(output), 1);
  assert.equal(await fs.readFile(path.join(output, 'results', '__next.results.$d$datasetId.__PAGE__.txt'), 'utf8'), 'navigation payload');
  assert.equal(await normalizeSegmentFiles(output), 0);
  await fs.writeFile(path.join(output, 'results', '__next.results.$d$datasetId.__PAGE__.txt'), 'conflicting content');
  await assert.rejects(normalizeSegmentFiles(output), /Conflicting static segment payloads/);
}));

test('publication redacts Windows, UNC, and POSIX provenance without changing local files or analytical content', () => fixture(async ({ root, data, dataset, files, marker }) => {
  const metadata = {
    source_image: 'C:\\private\\images\\protest.jpg',
    source_image_path: '\\\\workstation\\private-share\\protest.jpg',
    output_folder: '/home/researcher/private/output/run-1',
    image_width: 200, image_height: 100,
    extracts: [{ name: 'Custom label', group: 'Custom category', image_path: 'original/original.webp' }],
    provenance: [{ source_image_path: '/home/researcher/private/protest.jpg', output_folder: 'C:\\private\\output' }],
    evidence: 'Visible text says C:\\private\\images. Preserve quoted evidence.',
  };
  const rankings = {
    source_image: '/home/researcher/private/protest.jpg',
    descriptors: [{ id: 'custom', label: 'Custom criterion', question: 'Read /this/text exactly.' }],
    items: [{ name: 'Custom label', image_path: 'original/original.webp', values: { custom: { value: 0, evidence: 'Literal text' } } }],
  };
  const original = JSON.stringify(metadata, null, 2) + '\n';
  const originalRankings = JSON.stringify(rankings, null, 2) + '\n';
  await fs.writeFile(path.join(dataset, 'metadata.json'), original);
  await fs.writeFile(path.join(dataset, 'per_item_rankings.v2.json'), originalRankings);
  await marker([...files, 'per_item_rankings.v2.json']);
  await writeExport(await createExportPlan(data), root);
  const publishedRoot = path.join(root, 'cloudflare', 'public', 'data', 'an-image');
  const published = JSON.parse(await fs.readFile(path.join(publishedRoot, 'metadata.json'), 'utf8'));
  assert.equal(published.source_image, 'protest.jpg');
  assert.equal(published.source_image_path, 'protest.jpg');
  assert.equal(published.output_folder, 'an-image');
  assert.deepEqual(published.provenance, [{ source_image_path: 'protest.jpg', output_folder: 'an-image' }]);
  assert.deepEqual(published.extracts, metadata.extracts);
  assert.equal(published.evidence, metadata.evidence);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(publishedRoot, 'per_item_rankings.v2.json'), 'utf8')), { ...rankings, source_image: 'protest.jpg' });
  assert.equal(await fs.readFile(path.join(dataset, 'metadata.json'), 'utf8'), original);
  assert.equal(await fs.readFile(path.join(dataset, 'per_item_rankings.v2.json'), 'utf8'), originalRankings);
}));

test('already safe JSON is preserved byte-for-byte, including relative paths, custom assets, and evidence text', () => {
  const original = '{\n  "source_image_path": "imports/image.jpg",\n  "output_folder": "an-image",\n  "source_image": "C:drive-relative.jpg",\n  "image_path": "custom/crop.webp",\n  "evidence": "/home/user is visible in the image"\n}\n';
  assert.equal(redactRuntimeProvenance(original, 'an-image'), original);
});
