import type { DescriptionQuestion, RankingCriterion } from './types';

export interface EditorTemplate<T> { name: string; value: T }

export const RANKING_TEMPLATES: EditorTemplate<RankingCriterion>[] = [
  { name: 'Custom score', value: { label: 'Custom score', type: 'score', positive: '', negative: '', min: 0, max: 10, low_label: 'Not present', high_label: 'Strongly present' } },
  { name: 'Custom categories', value: { label: 'Custom categories', type: 'choice', positive: '', negative: '', choices: ['Category A', 'Category B'] } },
  { name: 'Custom Yes / No', value: { label: 'Custom question', type: 'boolean', positive: '', negative: '' } },
  { name: 'Visual prominence', value: { label: 'Visual prominence', type: 'score', positive: 'How much does this item stand out through size, contrast, position and focus?', negative: 'Do not confuse visual prominence with importance outside the image.', min: 0, max: 10, low_label: 'Hard to notice', high_label: 'Dominates attention' } },
  { name: 'Material', value: { label: 'Material', type: 'choice', positive: 'Choose the main material supported by the visible surface and construction.', negative: 'Do not infer hidden materials.', choices: ['Wood', 'Metal', 'Glass', 'Plastic', 'Fabric', 'Paper', 'Mixed', 'Other'] } },
  { name: 'Visible condition', value: { label: 'Visible condition', type: 'choice', positive: 'Assess the visible condition of this item.', negative: 'Do not infer age or unseen damage.', choices: ['Intact', 'Worn', 'Damaged', 'Mixed'] } },
  { name: 'Readable text', value: { label: 'Readable text present?', type: 'boolean', positive: 'Is there text on this item that can actually be read?', negative: 'Do not count unreadable marks or text on another item.' } },
  { name: 'Visible symbol', value: { label: 'Visible symbol present?', type: 'boolean', positive: 'Is a distinct symbol, emblem or mark visibly present on this item?', negative: 'Do not infer a person’s beliefs, identity or affiliation from appearance or a symbol.' } },
];

export const QUESTION_TEMPLATES: EditorTemplate<DescriptionQuestion>[] = [
  { name: 'Custom question', value: { label: 'Custom question', instruction: 'Describe the visible details relevant to this question.' } },
  { name: 'Appearance', value: { label: 'Appearance', instruction: 'Describe the visible shape, color, pattern and distinguishing features of this item.' } },
  { name: 'Materials and condition', value: { label: 'Materials and condition', instruction: 'What materials, textures, wear or damage are visibly supported? State when the evidence is insufficient.' } },
  { name: 'Parts and relationships', value: { label: 'Parts and relationships', instruction: 'Describe the visible parts of this item and how they connect or interact with nearby items.' } },
  { name: 'Visible symbols', value: { label: 'Visible symbols', instruction: 'Describe visible symbols, emblems or marks using their shape, color and readable text. Do not infer a person’s beliefs, identity or affiliation.' } },
  { name: 'Readable text', value: { label: 'Readable text', instruction: 'Transcribe the readable text on this item. Identify unclear passages without guessing.' } },
  { name: 'Function', value: { label: 'Function', instruction: 'What function is suggested by the visible form and use of this item? Separate visible evidence from uncertainty.' } },
  { name: 'Uncertainty', value: { label: 'Uncertainty', instruction: 'Which relevant details are obscured, ambiguous or too small to assess? State what additional visual evidence would be needed without guessing.' } },
];

/** Copy the whole semantic definition while keeping titles unique for the contract. */
export function copyEditorItem<T extends { label: string }>(item: T, existing: { label: string }[]): T {
  const base = item.label.trim() || 'Untitled';
  const labels = new Set(existing.map(value => value.label.trim().toLowerCase()));
  let label = base;
  let suffix = 2;
  while (labels.has(label.toLowerCase())) label = `${base.slice(0, 114)} (${suffix++})`;
  return { ...structuredClone(item), label };
}
