import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../features/analysis/prompts.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
const { changeCriterionType, moveItem, newCriterion, profileErrors, promptIssues } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const templateSource = await readFile(new URL('../features/analysis/promptTemplates.ts', import.meta.url), 'utf8');
const templateCode = ts.transpileModule(templateSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { RANKING_TEMPLATES, QUESTION_TEMPLATES, copyEditorItem } = await import(`data:text/javascript;base64,${Buffer.from(templateCode).toString('base64')}`);

const score = (overrides = {}) => ({ label: 'Visual impact', type: 'score', positive: 'Evaluate contrast and composition.',
  negative: 'Ignore the popularity of the subject.', min: 0, max: 10, low_label: 'Subtle', high_label: 'Striking', ...overrides });
const ranking = (criteria) => ({ kind: 'ranking', positive: 'Use visible evidence.', negative: 'Do not invent context.', criteria });

test('switching answer types preserves intent and emits only fields accepted by the new type', () => {
  const original = score();
  const category = changeCriterionType(original, 'choice');
  assert.deepEqual(Object.keys(category).sort(), ['choices', 'label', 'negative', 'positive', 'type']);
  assert.equal(category.positive, original.positive);
  assert.equal(category.negative, original.negative);
  assert.deepEqual(profileErrors(ranking([category])), []);
  const yesNo = changeCriterionType(category, 'boolean');
  assert.deepEqual(Object.keys(yesNo).sort(), ['label', 'negative', 'positive', 'type']);
  assert.deepEqual(profileErrors(ranking([yesNo])), []);
  const numeric = changeCriterionType(yesNo, 'score');
  assert.equal(numeric.type, 'score');
  assert.equal(numeric.label, original.label);
  assert.deepEqual(profileErrors(ranking([numeric])), []);
  assert.equal(original.max, 10);
  assert.equal('choices' in original, false);
});

test('mixed ranking types and negative score ranges are valid, incomplete and reversed scales are blocked', () => {
  const criteria = [score({ label: 'Valence', min: -5, max: 5 }), changeCriterionType(score({ label: 'Setting' }), 'choice'),
    changeCriterionType(score({ label: 'Readable text present?' }), 'boolean')];
  assert.deepEqual(profileErrors(ranking(criteria)), []);
  for (const [min, max] of [[5, 5], [10, 0], [NaN, 10], [0, Infinity], [-1000001, 0]]) {
    assert.match(profileErrors(ranking([score({ min, max })])).join(' '), /upper score/);
  }
});

test('category choices and criterion titles must remain meaningful and unique', () => {
  const category = changeCriterionType(score(), 'choice');
  for (const choices of [['Indoor'], ['Indoor', ''], [' Indoor ', 'indoor'], Array.from({ length: 21 }, (_, i) => `Option ${i}`)]) {
    assert.match(profileErrors(ranking([{ ...category, choices }])).join(' '), /different, nonempty choices/);
  }
  assert.match(profileErrors(ranking([score(), score({ label: ' visual IMPACT ' })])).join(' '), /unique/);
  assert.match(profileErrors(ranking([score({ label: '' })])).join(' '), /needs a title/);
});

test('reordering retains complete criteria and adding after removal produces a unique title', () => {
  const items = [score({ label: 'Criterion 1' }), score({ label: 'Criterion 3' })];
  const added = newCriterion(items);
  assert.equal(added.label, 'Criterion 4');
  const moved = moveItem([...items, added], 2, -1);
  assert.equal(moved[1], added);
  assert.equal(moved[2], items[1]);
  assert.equal(items.length, 2);
  assert.deepEqual(profileErrors(ranking(moved)), []);
});

test('concise, detailed and bullet descriptions support custom questions with validation before save', () => {
  for (const style of ['concise', 'detailed', 'bullets']) {
    const description = { kind: 'description', positive: 'Focus on packaging.', negative: 'Avoid marketing claims.', style,
      questions: [{ label: 'Materials', instruction: 'Which materials are visibly present?' }, { label: 'Text', instruction: 'What text is legible?' }] };
    assert.deepEqual(profileErrors(description), []);
    assert.match(profileErrors({ ...description, questions: [{ label: 'Materials', instruction: ' ' }] }).join(' '), /needs instructions/);
    assert.match(profileErrors({ ...description, questions: [...description.questions, { label: 'TEXT', instruction: 'Describe text.' }] }).join(' '), /unique/);
    assert.match(profileErrors({ ...description, questions: [] }).join(' '), /1–12/);
  }
});

test('validation identifies the affected stage so users can navigate directly to its editor', () => {
  const prompts = { full_image_rankings: ranking([score()]), per_item_rankings: ranking([score({ min: 10, max: 0 })]) };
  const issues = promptIssues(prompts);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].stage, 'per_item_rankings');
});

test('every quick-add template is valid and can be combined without altering the output contract', () => {
  assert.deepEqual(profileErrors(ranking(RANKING_TEMPLATES.map(template => template.value))), []);
  for (const style of ['concise', 'detailed', 'bullets']) {
    assert.deepEqual(profileErrors({ kind: 'description', positive: '', negative: '', style, questions: QUESTION_TEMPLATES.map(template => template.value) }), []);
  }
  assert.deepEqual(new Set(RANKING_TEMPLATES.map(template => template.value.type)), new Set(['score', 'choice', 'boolean']));
});

test('duplicated categories keep instructions and independent choice arrays with valid unique names', () => {
  const original = RANKING_TEMPLATES.find(template => template.value.type === 'choice').value;
  const first = copyEditorItem(original, [original]);
  const second = copyEditorItem(original, [original, first]);
  assert.equal(first.label, `${original.label} (2)`);
  assert.equal(second.label, `${original.label} (3)`);
  assert.equal(first.positive, original.positive);
  first.choices[0] = 'Edited category';
  assert.notEqual(original.choices[0], first.choices[0]);
  assert.notEqual(second.choices[0], first.choices[0]);
  assert.deepEqual(profileErrors(ranking([original, first, second])), []);
  const long = score({ label: 'A'.repeat(120) });
  assert.ok(copyEditorItem(long, [long]).label.length <= 120);
});
