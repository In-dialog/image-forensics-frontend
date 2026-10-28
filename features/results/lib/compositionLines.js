/**
 * Parse and normalize composition lines from JSON (e.g. composition_lines.json).
 * Format: { line1: { start: [x,y], end: [x,y] }, line2: ... }
 * Returns an array of segments for reuse in SVG, canvas, or 3D.
 */

/**
 * @param {Record<string, { start: number[], end: number[] }>} json - Raw composition lines object
 * @returns {{ start: [number, number], end: [number, number] }[]}
 */
export function parseCompositionLinesJson(json) {
  if (!json || typeof json !== "object") return [];
  const segments = [];
  for (const key of Object.keys(json)) {
    const line = json[key];
    if (!line || !Array.isArray(line.start) || !Array.isArray(line.end)) continue;
    const start = [Number(line.start[0]), Number(line.start[1])];
    const end = [Number(line.end[0]), Number(line.end[1])];
    if (start.some((n) => !Number.isFinite(n)) || end.some((n) => !Number.isFinite(n)))
      continue;
    segments.push({ start, end });
  }
  return segments;
}

/**
 * Given segments in image pixel coordinates, return the same segments in normalized [0,1] coordinates.
 * Useful for overlays that scale with container size.
 *
 * @param {{ start: number[], end: number[] }[]} segments
 * @param {number} width - Image/reference width
 * @param {number} height - Image/reference height
 * @returns {{ start: [number, number], end: [number, number] }[]}
 */
export function segmentsToNormalized(segments, width, height) {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0)
    return [];
  return segments.map(({ start, end }) => ({
    start: [start[0] / width, start[1] / height],
    end: [end[0] / width, end[1] / height],
  }));
}
