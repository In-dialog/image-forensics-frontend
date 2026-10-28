import type { PromptStage, StageGroup } from './types';

export const STAGE_GROUPS: {key: StageGroup; label: string}[] = [
  {key: 'global', label: 'Whole image'}, {key: 'per_item', label: 'Per item'}, {key: 'ranking', label: 'Rankings'},
];
export const PROMPT_STAGE: Record<string, PromptStage | undefined> = {
  extract_objects: 'object_detect', analyze_segments: 'analyze_segments', image_description: 'image_description',
  full_image_rankings: 'full_image_rankings', per_item_rankings: 'per_item_rankings',
};
export const PROMPT_STAGE_LABELS: Record<PromptStage, string> = {
  object_detect: 'Object extraction', analyze_segments: 'Segment analysis', image_description: 'Image descriptions',
  full_image_rankings: 'Whole image rankings', per_item_rankings: 'Per item rankings',
};
export const FIELD_LABELS: Record<string, string> = {
  num_ctx: 'Context length', num_predict: 'Maximum output tokens', temperature: 'Temperature', top_k: 'Top K', top_p: 'Top P',
  repeat_penalty: 'Repetition penalty', presence_penalty: 'Presence penalty', repeat_last_n: 'Repetition window', seed: 'Random seed',
  bbox_dedupe_tolerance: 'Box fallback tolerance (px)', mask_choice_threshold: 'Mask choice threshold',
  min_sam_score: 'Minimum SAM score', sam_mask_threshold: 'SAM mask threshold', max_items_people: 'Maximum people',
  max_items_objects: 'Maximum objects', max_items_texts: 'Maximum text items', ignore_items_smaller_than: 'Ignore items smaller than (px)',
  save_vision_overlay: 'Save vision overlay', debug_logs: 'Detailed debug logs',
};
