import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';

const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText.replaceAll('"react/jsx-runtime"', JSON.stringify(import.meta.resolve('react/jsx-runtime')))).toString('base64')}`;
const configuration = moduleUrl(await readFile(new URL('../features/analysis/configuration.ts', import.meta.url), 'utf8'));
const source = (await readFile(new URL('../features/analysis/components/AdvancedSettings.tsx', import.meta.url), 'utf8'))
  .replace("'../configuration'", JSON.stringify(configuration))
  .replace("import styles from '../analysis.module.css';", 'const styles = {};');
const { AdvancedSettings } = await import(moduleUrl(source));

function descendants(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(descendants);
  return [node, ...descendants(node.props?.children)];
}

test('presence penalty is an optional bounded number inside the collapsed advanced controls', () => {
  const updates = [];
  const tree = AdvancedSettings({ config: { models: ['qwen'] }, options: { model: 'qwen', presence_penalty: null },
    onOption: (key, value) => updates.push({ key, value }) });
  assert.equal(tree.type, 'details');
  assert.equal(tree.props.open, undefined);
  const label = descendants(tree).find(node => node.type === 'label' && node.props.children[0] === 'Presence penalty');
  assert.ok(label);
  const input = descendants(label).find(node => node.type === 'input');
  assert.equal(input.props.type, 'number');
  assert.equal(input.props.min, -2);
  assert.equal(input.props.max, 2);
  assert.equal(input.props.value, '');
  for (const value of ['-2', '0', '1.5', '2', '']) input.props.onChange({ target: { value } });
  assert.deepEqual(updates, [-2, 0, 1.5, 2, null].map(value => ({ key: 'presence_penalty', value })));
});
