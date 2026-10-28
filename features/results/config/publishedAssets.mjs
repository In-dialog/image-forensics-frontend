/** Viewer assets only. Model diagnostics, prompts, and import records stay private. */
const ROOT_DOCUMENTS = new Set([
  'metadata.json', 'descriptions.v2.json', 'full_image_rankings.v2.json',
  'per_item_rankings.v2.json', 'forgery_detection.json', 'synthetic_analysis.json',
]);
const IMAGE_FOLDERS = new Set([
  'original', 'segments', 'granular_segments', 'composition', 'depth',
  'negative_space', 'saliency_deepgaze_msdb', 'pose', 'forgery_detection',
]);

export function isPublishedAsset(file) {
  if (ROOT_DOCUMENTS.has(file)) return true;
  if (file === 'composition/composition_lines.json' || file === 'pose/pose.json') return true;
  if (/^granular_segments\/.+\/segment_metadata\.json$/.test(file)) return true;
  return IMAGE_FOLDERS.has(file.split('/')[0]) && /\.(webp|png|jpe?g)$/i.test(file);
}
