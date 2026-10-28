import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../features/results/lib/structuredResults.js", import.meta.url), "utf8");
const { readRankingDocument, readDescriptionDocument, formatRankingValue, rankingSelection, descriptionSections, filterRankingItems, resultItemLabel, resultGroups, resolveDescriptorSelection } =
  await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const dataSource = await readFile(new URL('../features/results/config/dataSource.js', import.meta.url), 'utf8');
const { getResultItemImageUrl, getGranularSegmentMetadataUrl, getGranularSegmentImageUrl, getDatasetAssetUrl } = await import(`data:text/javascript;base64,${Buffer.from(dataSource).toString('base64')}`);

const fixture = () => ({ schema_version: 2, scope: "per_item", criteria: [
  { id: "criterion_1", label: "Direction", type: "score", min: -1, max: 1 },
  { id: "criterion_2", label: "Shape", type: "choice", choices: ["round", "square"] },
  { id: "criterion_3", label: "Visible", type: "boolean" },
], items: [{ name: "object_1", ratings: {
  criterion_1: { value: 0, reason: "Neutral." }, criterion_2: { value: null, reason: "Obscured." },
  criterion_3: { value: false, reason: "Not visible." },
} }] });

test("mixed results retain zero, false, and uncertainty as distinct values", () => {
  const document = readRankingDocument(fixture());
  assert.ok(document);
  const selected = rankingSelection(document, document.items[0]);
  assert.equal(formatRankingValue(selected.ratings.criterion_1.value), "0");
  assert.equal(formatRankingValue(selected.ratings.criterion_2.value), "Not enough evidence");
  assert.equal(formatRankingValue(selected.ratings.criterion_3.value), "No");
  assert.equal(selected.criteria[1].label, "Shape");
  assert.equal(selected.ratings.criterion_3.reason, "Not visible.");
});

test("invalid stored values cannot masquerade as typed rankings", () => {
  for (const bad of ["0", true, 2, Number.NaN]) {
    const document = fixture();
    document.items[0].ratings.criterion_1.value = bad;
    assert.equal(readRankingDocument(document), null);
  }
  const document = fixture();
  document.items[0].ratings.criterion_2.value = "invented category";
  assert.equal(readRankingDocument(document), null);
});

test("unstructured exports and malformed typed exports are rejected", () => {
  assert.equal(readRankingDocument({ emotional_rating: { score: 3 } }), null);
  const document = fixture();
  delete document.items[0].ratings.criterion_1;
  assert.equal(readRankingDocument(document), null);
});

test("description labels come from descriptors and unknown answers remain explicit", () => {
  const document = { schema_version: 2, style: "bullets", questions: [
    { id: "question_1", label: "Visible details", instruction: "Visible details" }, { id: "question_2", label: "Origin", instruction: "Origin" },
  ], items: [{ name: "object_1", answers: { question_1: "- Red\n- Circular", question_2: null } }] };
  assert.deepEqual(descriptionSections(document, "object_1"), [
    { id: "question_1", sectionName: "Visible details", entries: [{ label: null, value: "Red" }, { label: null, value: "Circular" }] },
    { id: "question_2", sectionName: "Origin", entries: [{ label: null, value: "Not enough evidence" }] },
  ]);
  assert.deepEqual(descriptionSections(document, "other"), []);
});

test('ranking search and sorting preserve zero, false, and unknown values without mutating saved order', () => {
  const document = fixture();
  document.items = [
    { name: 'object_unknown', ratings: { criterion_1: { value: null }, criterion_3: { value: null } } },
    { name: 'object_zero', ratings: { criterion_1: { value: 0 }, criterion_3: { value: false } } },
    { name: 'object_positive', ratings: { criterion_1: { value: 1 }, criterion_3: { value: true } } },
  ];
  assert.deepEqual(filterRankingItems(document, { criterionId: 'criterion_1', order: 'descending' }).map(item => item.name), ['object_positive', 'object_zero', 'object_unknown']);
  assert.deepEqual(filterRankingItems(document, { criterionId: 'criterion_1', order: 'ascending' }).map(item => item.name), ['object_zero', 'object_positive', 'object_unknown']);
  assert.deepEqual(filterRankingItems(document, { criterionId: 'criterion_3', order: 'ascending' }).map(item => item.name), ['object_zero', 'object_positive', 'object_unknown']);
  assert.equal(filterRankingItems(document, { query: 'OBJECT ZERO' })[0].name, 'object_zero');
  assert.equal(document.items[0].name, 'object_unknown');
});

test('focusing one custom criterion keeps its label, value, and evidence together', () => {
  const document = fixture();
  const selected = rankingSelection(document, document.items[0], [document.criteria[2]]);
  assert.deepEqual(selected.criteria.map(item => item.id), ['criterion_3']);
  assert.equal(selected.criteria[0].label, 'Visible');
  assert.deepEqual(selected.ratings.criterion_3, { value: false, reason: 'Not visible.' });
});

test('part results retain parent context, search independently, and use the existing granular crop', () => {
  const document = fixture();
  const parent = document.items[0];
  parent.parent_name = null;
  const child = { ...structuredClone(parent), name: 'object_1::small_label', label: 'Small label', parent_name: 'object_1', source: 'part', image_path: 'granular_segments/objects/object_1/small label.webp' };
  document.items.push(child);
  assert.ok(readRankingDocument(document));
  assert.equal(filterRankingItems(document, { source: 'part' })[0], child);
  assert.equal(filterRankingItems(document, { source: 'item' })[0], parent);
  assert.equal(filterRankingItems(document, { query: 'small label' })[0], child);
  const selected = rankingSelection(document, child);
  assert.equal(selected.parent_name, 'object_1');
  assert.equal(resultItemLabel(selected), 'Small label');
  assert.equal(getResultItemImageUrl('/api/datasets/demo/files', selected), '/api/datasets/demo/files/granular_segments/objects/object_1/small%20label.webp');
  for (const image_path of ['../secret.webp', '/absolute.webp', 'https://example.com/x', 'folder\\file.webp']) {
    assert.equal(getResultItemImageUrl('/data/demo', { name: 'object_1', image_path }), '/data/demo/segments/object_1.webp');
  }
});

test('renamed, reordered, added and removed criteria use stored IDs and ranges', () => {
  const document = fixture();
  const score = { ...document.criteria[0], id: 'visual/tension', label: 'Tension — custom', min: -50, max: 50 };
  document.criteria = [document.criteria[2], score, { id: 'all', label: 'New measure', type: 'boolean' }];
  document.items[0].ratings = { 'visual/tension': { value: -12.5, reason: 'Visible tension.' },
    all: { value: null, reason: 'Unclear.' }, criterion_3: { value: false, reason: 'Absent.' } };
  assert.ok(readRankingDocument(document));
  assert.deepEqual(rankingSelection(document, document.items[0]).criteria.map(c => c.label), ['Visible', 'Tension — custom', 'New measure']);
  assert.equal(resolveDescriptorSelection(document.criteria, 'all'), 'all');
  assert.equal(resolveDescriptorSelection(document.criteria, 'removed-key'), '');
  document.criteria[1].label = 'A completely new label';
  assert.equal(resolveDescriptorSelection(document.criteria, 'visual/tension'), 'visual/tension');
  assert.equal(document.items[0].ratings['visual/tension'].value, -12.5);
  document.criteria.push({ ...score });
  assert.equal(readRankingDocument(document), null);
});

test('custom choices sort in their declared order with unknown last', () => {
  const document = { schema_version: 2, scope: 'per_item', criteria: [
    { id: 'level', label: 'Activity', type: 'choice', choices: ['Low', 'Medium', 'High'] },
  ], items: [null, 'High', 'Low', 'Medium'].map((value, i) => ({ name: `item-${i}`, ratings: { level: { value, reason: 'Evidence.' } } })) };
  assert.ok(readRankingDocument(document));
  assert.deepEqual(filterRankingItems(document, { criterionId: 'level', order: 'ascending' }).map(i => i.ratings.level.value), ['Low', 'Medium', 'High', null]);
  assert.deepEqual(filterRankingItems(document, { criterionId: 'level', order: 'descending' }).map(i => i.ratings.level.value), ['High', 'Medium', 'Low', null]);
});

test('custom categories and parent labels drive filtering without renaming identities', () => {
  const document = fixture();
  const parent = document.items[0];
  Object.assign(parent, { label: 'Banner / 識別', group: 'Symbols & signs' });
  const child = { ...structuredClone(parent), name: 'part-01', label: 'Printed emblem', group: 'all', parent_name: parent.name, source: 'part' };
  document.items.push(child);
  assert.ok(readRankingDocument(document));
  assert.deepEqual(new Set(resultGroups(document)), new Set(['Symbols & signs', 'all']));
  assert.equal(filterRankingItems(document, { group: 'all' })[0], child);
  assert.equal(filterRankingItems(document, { query: '識別', source: 'part' })[0], child);
  assert.equal(rankingSelection(document, child).parentLabel, parent.label);
  assert.equal(parent.name, 'object_1');
});

test('questions with identical display labels stay independently selectable by ID', () => {
  const document = { schema_version: 2, style: 'concise', questions: ['material', 'role', 'all', 'context'].map(id => ({ id, label: 'Detail', instruction: id })),
    items: [{ name: 'stable-id', answers: { material: 'Metal', role: 'Held', all: 'Unknown use', context: null } }] };
  assert.ok(readDescriptionDocument(document));
  const sections = descriptionSections(document, 'stable-id');
  assert.equal(sections.filter(s => s.id === 'role')[0].entries[0].value, 'Held');
  assert.equal(resolveDescriptorSelection(sections, 'all'), 'all');
  assert.equal(resolveDescriptorSelection(sections, 'removed'), 'material');
  document.questions[1].label = 'Renamed relationship';
  assert.equal(descriptionSections(document, 'stable-id')[1].id, 'role');
  document.items[0].answers = { material: 'Metal', role: 'Held', all: 'Unknown use', wrong: null };
  assert.equal(readDescriptionDocument(document), null);
});

test('asset references survive label and category changes and support custom filenames', () => {
  const base = '/api/datasets/example/files';
  const item = { name: 'stable-id', label: '自由 / emblem', group: 'New / category', image_path: 'crops/first #1.png', parts_metadata_path: 'parts/custom.json' };
  assert.equal(getResultItemImageUrl(base, item), `${base}/crops/first%20%231.png`);
  assert.equal(getGranularSegmentMetadataUrl(base, item.group, item.name, item.parts_metadata_path), `${base}/parts/custom.json`);
  assert.equal(getGranularSegmentImageUrl(base, item.group, item.name, 'child', 'crops/child.jpg'), `${base}/crops/child.jpg`);
  assert.equal(getGranularSegmentMetadataUrl(base, 'Signs / writing', 'mark?'), `${base}/granular_segments/Signs%20_%20writing/mark_/segment_metadata.json`);
  for (const invalid of ['../outside.png', '/absolute.png', '//host/a.png', 'https://host/a.png', 'a\\b.png', 'a/./b.png', 'a\u0000.png']) {
    assert.equal(getDatasetAssetUrl(base, invalid), null);
  }
});
