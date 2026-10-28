/**
 * Parse bounding boxes from metadata (metadata.json with extracts).
 * Each extract may have bbox [x0, y0, x1, y1] and bbox_position [x, y, z] for depth.
 */

/**
 * @param {{ extracts?: Array<{ bbox?: number[], bbox_position?: number[], name?: string, group?: string }>, image_width?: number, image_height?: number }} metadata
 * @returns {{ x0: number, y0: number, x1: number, y1: number, z: number, name?: string, group?: string }[]}
 */
export function getBoundingBoxesFromMetadata(metadata) {
  const extracts = metadata?.extracts;
  if (!Array.isArray(extracts)) return [];
  const boxes = [];
  for (const ex of extracts) {
    const bbox = ex.bbox;
    if (!Array.isArray(bbox) || bbox.length < 4) continue;
    const x0 = Number(bbox[0]);
    const y0 = Number(bbox[1]);
    const x1 = Number(bbox[2]);
    const y1 = Number(bbox[3]);
    if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1) || !Number.isFinite(y1))
      continue;
    const pos = ex.bbox_position;
    const z = Array.isArray(pos) && pos.length >= 3 && Number.isFinite(Number(pos[2])) ? Number(pos[2]) : 0;
    boxes.push({
      x0,
      y0,
      x1,
      y1,
      z,
      name: ex.name,
      group: ex.group,
    });
  }
  return boxes;
}

/**
 * Return the n largest boxes by area (width × height). Preserves z and other fields.
 */
export function takeLargestBoundingBoxes(boxes, n = 3) {
  if (!Array.isArray(boxes) || n <= 0) return [];
  return [...boxes]
    .sort((a, b) => {
      const areaA = (a.x1 - a.x0) * (a.y1 - a.y0);
      const areaB = (b.x1 - b.x0) * (b.y1 - b.y0);
      return areaB - areaA;
    })
    .slice(0, n);
}

function rectsOverlap(a, b) {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
}

function pointInRect(x, y, r) {
  return x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
}

/** Clip segment (sx1,sy1)-(sx2,sy2) to the parts outside rect r. Returns array of { start, end }. */
function segmentOutsideRect(sx1, sy1, sx2, sy2, r) {
  const dx = sx2 - sx1;
  const dy = sy2 - sy1;
  const ts = [];
  const at = (t) => ({ x: sx1 + t * dx, y: sy1 + t * dy });
  const pushT = (t) => {
    if (!Number.isFinite(t) || t < 0 || t > 1) return;
    const p = at(t);
    const onLeftRight = (p.x <= r.x0 + 1e-9 || p.x >= r.x1 - 1e-9) && p.y >= r.y0 && p.y <= r.y1;
    const onTopBottom = (p.y <= r.y0 + 1e-9 || p.y >= r.y1 - 1e-9) && p.x >= r.x0 && p.x <= r.x1;
    if (onLeftRight || onTopBottom) ts.push(t);
  };
  if (dx !== 0) {
    pushT((r.x0 - sx1) / dx);
    pushT((r.x1 - sx1) / dx);
  }
  if (dy !== 0) {
    pushT((r.y0 - sy1) / dy);
    pushT((r.y1 - sy1) / dy);
  }
  ts.push(0, 1);
  ts.sort((a, b) => a - b);
  const uniq = [];
  for (let i = 0; i < ts.length; i++) {
    if (i === 0 || ts[i] - ts[i - 1] > 1e-9) uniq.push(ts[i]);
  }
  const out = [];
  for (let i = 0; i < uniq.length - 1; i++) {
    const ta = uniq[i];
    const tb = uniq[i + 1];
    const mx = sx1 + 0.5 * (ta + tb) * dx;
    const my = sy1 + 0.5 * (ta + tb) * dy;
    if (!pointInRect(mx, my, r)) {
      out.push({
        start: [sx1 + ta * dx, sy1 + ta * dy],
        end: [sx1 + tb * dx, sy1 + tb * dy],
      });
    }
  }
  return out;
}

/** Clip a list of segments by a rect; returns segments that lie outside the rect. */
function clipSegmentsByRect(segments, r) {
  const result = [];
  for (const seg of segments) {
    const [x1, y1] = seg.start;
    const [x2, y2] = seg.end;
    result.push(...segmentOutsideRect(x1, y1, x2, y2, r));
  }
  return result;
}

/**
 * Get line segments from an extract's bbox_composition (lines from bbox edge to image border).
 * Each side (left, right, top, bottom) has { start: [x,y], end: [x,y] } in image coordinates.
 * @param {{ bbox_composition?: Record<string, { start?: number[], end?: number[] }> }} extract
 * @returns {{ start: [number, number], end: [number, number] }[]}
 */
export function getBboxCompositionSegments(extract) {
  const comp = extract?.bbox_composition;
  if (!comp || typeof comp !== "object") return [];
  const segments = [];
  for (const side of ["left", "right", "top", "bottom"]) {
    const line = comp[side];
    if (!line || !Array.isArray(line.start) || !Array.isArray(line.end)) continue;
    const start = [Number(line.start[0]), Number(line.start[1])];
    const end = [Number(line.end[0]), Number(line.end[1])];
    if (start.some((n) => !Number.isFinite(n)) || end.some((n) => !Number.isFinite(n))) continue;
    segments.push({ start, end });
  }
  return segments;
}

/**
 * Return line segments to draw so that edges under a box with higher z are not drawn.
 * @param {{ x0: number, y0: number, x1: number, y1: number, z: number }[]} boxes
 * @returns {{ start: [number, number], end: [number, number] }[]}
 */
export function getVisibleBoxEdges(boxes) {
  if (!Array.isArray(boxes) || boxes.length === 0) return [];
  const segments = [];
  for (const box of boxes) {
    const fronts = boxes.filter((b) => b.z > box.z && rectsOverlap(box, b));
    const edges = [
      { start: [box.x0, box.y0], end: [box.x1, box.y0] },
      { start: [box.x1, box.y0], end: [box.x1, box.y1] },
      { start: [box.x1, box.y1], end: [box.x0, box.y1] },
      { start: [box.x0, box.y1], end: [box.x0, box.y0] },
    ];
    let visible = edges;
    for (const f of fronts) {
      const r = { x0: f.x0, y0: f.y0, x1: f.x1, y1: f.y1 };
      visible = clipSegmentsByRect(visible, r);
    }
    segments.push(...visible);
  }
  return segments;
}
