/** Typed exports stay self-describing when the backend is offline. */
const nonempty = value => typeof value === 'string' && Boolean(value.trim());
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function readRankingDocument(document) {
  if (document?.schema_version !== 2 || !Array.isArray(document.criteria) ||
      !Array.isArray(document.items) || !["full_image", "per_item"].includes(document.scope)) return null;
  const ids = new Set();
  for (const criterion of document.criteria) {
    if (!criterion || !nonempty(criterion.id) || ids.has(criterion.id) ||
        !nonempty(criterion.label) || !["score", "choice", "boolean"].includes(criterion.type)) return null;
    ids.add(criterion.id);
    if (criterion.type === "score" && (!Number.isFinite(criterion.min) ||
        !Number.isFinite(criterion.max) || criterion.min >= criterion.max)) return null;
    if (criterion.type === "choice" && (!Array.isArray(criterion.choices) ||
        !criterion.choices.length || criterion.choices.some(choice => !nonempty(choice)) ||
        new Set(criterion.choices).size !== criterion.choices.length)) return null;
  }
  if (!ids.size) return null;
  const names = new Set();
  for (const item of document.items) {
    if (!item || !nonempty(item.name) || names.has(item.name) || !record(item.ratings) ||
        Object.keys(item.ratings).length !== ids.size) return null;
    if (['label', 'group', 'parent_name', 'image_path', 'source'].some(key => item[key] != null && typeof item[key] !== 'string')) return null;
    if (item.source != null && !['item', 'part'].includes(item.source)) return null;
    names.add(item.name);
    for (const criterion of document.criteria) {
      const result = item.ratings[criterion.id];
      if (!Object.hasOwn(item.ratings, criterion.id) || !record(result) ||
          !Object.hasOwn(result, 'value') || typeof result.reason !== "string") return null;
      const value = result.value;
      if (value === null) continue;
      if (criterion.type === "score" && (!Number.isFinite(value) || value < criterion.min || value > criterion.max)) return null;
      if (criterion.type === "boolean" && typeof value !== "boolean") return null;
      if (criterion.type === "choice" && !criterion.choices.includes(value)) return null;
    }
  }
  return document;
}

export function formatRankingValue(value) {
  if (value === null || value === undefined) return "Not enough evidence";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

/** Carry the typed result and the displayed criteria into the detail panels. */
export function rankingSelection(document, item, criteria = document.criteria) {
  return { ...item, parentLabel: resultParentLabel(item, document.items), criteria };
}

export function resultParentLabel(item, items = []) {
  if (!item.parent_name) return null;
  return resultItemLabel(items.find(parent => parent.name === item.parent_name) || { name: item.parent_name });
}

export function resultItemGroup(item) {
  return nonempty(item.group) ? item.group : 'Uncategorized';
}

export function resultGroups(document) {
  return [...new Set(document.items.map(resultItemGroup))].sort((a, b) => a.localeCompare(b));
}

/** Descriptors own their keys; renaming a label never changes the selection. */
export function resolveDescriptorSelection(descriptors, selected) {
  if (selected === '' || descriptors.some(entry => entry.id === selected)) return selected;
  return descriptors.length > 3 ? descriptors[0].id : '';
}

/** Keep unknown values last for every sort direction; never coerce false or zero. */
export function filterRankingItems(document, { query = '', criterionId = null, order = 'original', source = 'all', group = '' } = {}) {
  const search = query.trim().toLowerCase().replaceAll('_', ' ');
  const items = document.items.filter(item => (source === 'all' || (item.source || 'item') === source) &&
    (!group || resultItemGroup(item) === group) &&
    [item.name, item.label, item.parent_name, resultParentLabel(item, document.items), resultItemGroup(item)]
      .filter(Boolean).some(value => value.toLowerCase().replaceAll('_', ' ').includes(search)));
  const criterion = document.criteria.find(item => item.id === criterionId);
  if (!criterion || order === 'original') return items;
  const direction = order === 'descending' ? -1 : 1;
  return items.sort((a, b) => {
    const first = a.ratings[criterion.id].value;
    const second = b.ratings[criterion.id].value;
    if (first === null) return second === null ? 0 : 1;
    if (second === null) return -1;
    const comparison = criterion.type === 'score' ? first - second
      : criterion.type === 'boolean' ? (first === second ? 0 : first ? 1 : -1)
      : criterion.choices.indexOf(first) - criterion.choices.indexOf(second);
    return comparison * direction;
  });
}

export function resultItemLabel(item) {
  return typeof item.label === 'string' && item.label.trim() ? item.label : String(item.name).split('::').at(-1).replaceAll('_', ' ');
}

export function readDescriptionDocument(document) {
  if (document?.schema_version !== 2 || !['concise', 'detailed', 'bullets'].includes(document.style) ||
      !Array.isArray(document.questions) || !document.questions.length || !Array.isArray(document.items)) return null;
  const ids = new Set();
  for (const question of document.questions) {
    if (!question || !nonempty(question.id) || ids.has(question.id) ||
        !nonempty(question.label) || typeof question.instruction !== 'string') return null;
    ids.add(question.id);
  }
  const names = new Set();
  for (const item of document.items) {
    if (!item || !nonempty(item.name) || names.has(item.name) || !record(item.answers) ||
        Object.keys(item.answers).length !== ids.size) return null;
    if (['label', 'group', 'parent_name', 'image_path', 'source'].some(key => item[key] != null && typeof item[key] !== 'string')) return null;
    if (item.source != null && !['item', 'part'].includes(item.source)) return null;
    if ([...ids].some(id => !Object.hasOwn(item.answers, id) || (item.answers[id] !== null && typeof item.answers[id] !== 'string'))) return null;
    names.add(item.name);
  }
  return document;
}

export function descriptionSections(document, name) {
  if (!readDescriptionDocument(document)) return null;
  const item = document.items.find((item) => item && item.name === name);
  if (!item) return [];
  const sections = [];
  for (const question of document.questions) {
    if (!question || typeof question.id !== 'string') return null;
    const answer = item.answers?.[question.id];
    if (typeof question.label !== "string" || (answer !== null && typeof answer !== "string")) return null;
    const lines = answer === null ? ["Not enough evidence"] : document.style === "bullets"
      ? answer.split("\n").map((line) => line.replace(/^\s*[-*]\s*/, "")).filter(Boolean) : [answer];
    sections.push({ id: question.id, sectionName: question.label, entries: lines.map((value) => ({ label: null, value })) });
  }
  return sections;
}
