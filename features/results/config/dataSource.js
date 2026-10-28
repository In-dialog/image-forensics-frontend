/**
 * Single source of truth: one frozen config, one join helper, generic candidate logic.
 *
 * Structure:
 *   {basePath}/
 *     {metadataFilename}
 *     {mainImage.folder}/{mainImage.filename}.{mainImage.ext}
 *     {compositionLines.folder}/{compositionLines.filename}
 *     {segments.folder}/{segmentName}.{segments.ext}
 */

const CONFIG = Object.freeze({
  metadataFilename: "metadata.json",
  mainImage: Object.freeze({
    folder: "original",
    filename: "original",
    ext: ".webp",
  }),
  compositionLines: Object.freeze({
    folder: "composition",
    filename: "composition_lines.json",
  }),
  segments: Object.freeze({ folder: "segments", ext: ".webp" }),
  /** Extensions to try for folder images (ImageFromFolder). Single format only. */
  candidateImageExtensions: Object.freeze([".webp"]),
});

export const dataSource = CONFIG;

/** Preserve the root-relative dataset URL on nested result routes. */
export function join(basePath, ...parts) {
  const trim = (s) => String(s).replace(/^\/+|\/+$/g, "");
  return [String(basePath).replace(/\/+$/g, ""), ...parts.map(trim)].join("/");
}

// Asset URL getters.

export function getMetadataUrl(basePath) {
  return join(basePath, CONFIG.metadataFilename);
}

export function getFullImageUrl(basePath) {
  const { folder, filename, ext } = CONFIG.mainImage;
  return join(basePath, folder, filename + ext);
}

export function getCompositionLinesUrl(basePath) {
  const { folder, filename } = CONFIG.compositionLines;
  return join(basePath, folder, filename);
}

export function getSegmentImageUrl(basePath, segmentName) {
  const { folder, ext } = CONFIG.segments;
  return join(basePath, folder, encodeURIComponent(safeComponent(segmentName)) + ext);
}

/** Resolve only dataset-relative paths, independent of display labels. */
export function getDatasetAssetUrl(basePath, file) {
  if (typeof file === 'string' && !file.includes('\\') && !file.includes(':')) {
    const segments = file.split('/');
    if (segments.every(segment => segment && !segment.startsWith('.') && !/[. ]$|[\x00-\x1f]/.test(segment))) {
      return join(basePath, ...segments.map(encodeURIComponent));
    }
  }
  return null;
}

function safeComponent(value) {
  return String(value).replace(/[<>:"/\\|?*]/g, '_').trim() || 'image';
}

/** Optional typed metadata points to the existing parent or granular crop. */
export function getResultItemImageUrl(basePath, item) {
  return getDatasetAssetUrl(basePath, item?.image_path) || getSegmentImageUrl(basePath, item.name);
}

export function getDescriptionUrl(basePath) {
  return join(basePath, "descriptions.v2.json");
}

export function getRankingsUrl(basePath, scope = "full_image") {
  return join(basePath, scope === "per_item" ? "per_item_rankings.v2.json" : "full_image_rankings.v2.json");
}

/** Single URL for a folder image: {basePath}/{folderName}/{folderName}.webp */
export function getFolderImageCandidateUrls(basePath, folderName) {
  const ext = CONFIG.candidateImageExtensions[0] || CONFIG.mainImage.ext;
  return [join(basePath, folderName, folderName + ext)];
}

/** URL for granular segment metadata: {basePath}/granular_segments/{group}/{itemName}/segment_metadata.json */
export function getGranularSegmentMetadataUrl(basePath, group, itemName, metadataPath = null) {
  return getDatasetAssetUrl(basePath, metadataPath) || join(
    basePath,
    "granular_segments",
    encodeURIComponent(safeComponent(group)),
    encodeURIComponent(safeComponent(itemName)),
    "segment_metadata.json",
  );
}

/** URL for one component image: {basePath}/granular_segments/{group}/{itemName}/{segmentName}.webp */
export function getGranularSegmentImageUrl(
  basePath,
  group,
  itemName,
  segmentName,
  imagePath = null,
) {
  return getDatasetAssetUrl(basePath, imagePath) || join(
    basePath,
    "granular_segments",
    encodeURIComponent(safeComponent(group)),
    encodeURIComponent(safeComponent(itemName)),
    encodeURIComponent(safeComponent(segmentName)) + ".webp",
  );
}

/** URL for a pose image: {basePath}/pose/{itemName}_pose.webp */
export function getPoseImageUrl(basePath, itemName) {
  return join(basePath, "pose", encodeURIComponent(itemName) + "_pose.webp");
}

/** URL for forgery detection: {basePath}/forgery_detection.json */
export function getForgeryDetectionUrl(basePath) {
  return join(basePath, "forgery_detection.json");
}

/** URL for forgery detection section image: {basePath}/forgery_detection/{sectionKey}/{filename} */
export function getForgeryDetectionImageUrl(basePath, sectionKey, filename) {
  if (!sectionKey || !filename) return "";
  return join(basePath, "forgery_detection", sectionKey, filename);
}

/** URL for synthetic analysis: {basePath}/synthetic_analysis.json */
export function getSyntheticAnalysisUrl(basePath) {
  return join(basePath, "synthetic_analysis.json");
}
