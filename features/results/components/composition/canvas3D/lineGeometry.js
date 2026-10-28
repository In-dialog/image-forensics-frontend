/**
 * Reusable line-segment geometry for rectangles. Use with @react-three/drei <Line segments points={...} />.
 * Each function returns an array of points [p0, p1, p1, p2, p2, p3, p3, p0] for 4 edges.
 */

/**
 * Points for one rectangle in the XZ plane (constant y). Use for ground or horizontal quads.
 * @param {number} xMin - min X
 * @param {number} xMax - max X
 * @param {number} zMin - min Z
 * @param {number} zMax - max Z
 * @param {number} y - constant Y
 * @returns {number[][]} segment points for Line (pairs per edge)
 */
export function rectanglePointsXZ(xMin, xMax, zMin, zMax, y) {
  const p0 = [xMin, y, zMin];
  const p1 = [xMax, y, zMin];
  const p2 = [xMax, y, zMax];
  const p3 = [xMin, y, zMax];
  return [p0, p1, p1, p2, p2, p3, p3, p0];
}

/**
 * Points for one rectangle in the XY plane (constant z).
 * @param {number} xMin - min X
 * @param {number} xMax - max X
 * @param {number} yMin - min Y
 * @param {number} yMax - max Y
 * @param {number} z - constant Z
 * @returns {number[][]} segment points for Line
 */
export function rectanglePointsXY(xMin, xMax, yMin, yMax, z) {
  const p0 = [xMin, yMin, z];
  const p1 = [xMax, yMin, z];
  const p2 = [xMax, yMax, z];
  const p3 = [xMin, yMax, z];
  return [p0, p1, p1, p2, p2, p3, p3, p0];
}

/**
 * Points for one rectangle in the YZ plane (constant x).
 * @param {number} yMin - min Y
 * @param {number} yMax - max Y
 * @param {number} zMin - min Z
 * @param {number} zMax - max Z
 * @param {number} x - constant X
 * @returns {number[][]} segment points for Line
 */
export function rectanglePointsYZ(yMin, yMax, zMin, zMax, x) {
  const p0 = [x, yMin, zMin];
  const p1 = [x, yMax, zMin];
  const p2 = [x, yMax, zMax];
  const p3 = [x, yMin, zMax];
  return [p0, p1, p1, p2, p2, p3, p3, p0];
}

/**
 * Points for the two diagonals of a rectangle (X shape) in the XY plane.
 * @returns {number[][]} segment points: [p0,p2, p1,p3] (opposite corners)
 */
export function rectangleDiagonalPointsXY(xMin, xMax, yMin, yMax, z) {
  const p0 = [xMin, yMin, z];
  const p1 = [xMax, yMin, z];
  const p2 = [xMax, yMax, z];
  const p3 = [xMin, yMax, z];
  return [p0, p2, p1, p3];
}

/**
 * Points for the two diagonals of a rectangle (X shape) in the XZ plane.
 * @returns {number[][]} segment points
 */
export function rectangleDiagonalPointsXZ(xMin, xMax, zMin, zMax, y) {
  const p0 = [xMin, y, zMin];
  const p1 = [xMax, y, zMin];
  const p2 = [xMax, y, zMax];
  const p3 = [xMin, y, zMax];
  return [p0, p2, p1, p3];
}

/**
 * Points for one line segment between two 3D points. Use with <Line segments points={...} />.
 * Optionally extends the segment beyond both endpoints by a given length (drafting-style).
 *
 * @param {[number, number, number]} from - start point [x, y, z]
 * @param {[number, number, number]} to - end point [x, y, z]
 * @param {number} [extension=0] - length to extend beyond each endpoint (same at both ends)
 * @returns {number[][]} segment points [start, end] (extended if extension > 0)
 */
export function lineSegmentPoints(from, to, extension = 0.05) {
  if (!extension || !Number.isFinite(extension)) {
    return [from, to];
  }
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len === 0) return [from, to];
  const ux = dx / len;
  const uy = dy / len;
  const uz = dz / len;
  const start = [
    from[0] - ux * extension,
    from[1] - uy * extension,
    from[2] - uz * extension,
  ];
  const end = [
    to[0] + ux * extension,
    to[1] + uy * extension,
    to[2] + uz * extension,
  ];
  return [start, end];
}

/**
 * Points for one vertical segment (for dashed drop line).
 * @param {number} x - X
 * @param {number} z - Z
 * @param {number} yTop - top Y
 * @param {number} yBottom - bottom Y
 * @returns {number[][]} segment points [top, bottom]
 */
export function verticalSegmentPoints(x, z, yTop, yBottom) {
  return [
    [x, yTop, z],
    [x, yBottom, z],
  ];
}

/**
 * Extension lines for a rectangle in the XZ plane: each edge extended outward by a given length,
 * plus short perpendicular "tick" marks at each corner (drafting style).
 * Use with <Line segments points={...} /> for a single Line, or split into two Line components
 * (e.g. one for extensions, one for ticks) if you need different colors/widths.
 *
 * @param {number} xMin - min X of rectangle
 * @param {number} xMax - max X of rectangle
 * @param {number} zMin - min Z of rectangle
 * @param {number} zMax - max Z of rectangle
 * @param {number} y - constant Y
 * @param {number} [extensionLength=1] - how far each edge is extended beyond the rectangle
 * @param {number} [tickLength=0.2] - length of perpendicular corner ticks
 * @returns {{ extensionPoints: number[][], tickPoints: number[][] }} segment points for Line(s);
 *   extensionPoints = 4 extended edges, tickPoints = 8 corner tick segments
 */
export function rectangleExtensionLinesXZ(
  xMin,
  xMax,
  zMin,
  zMax,
  y,
  extensionLength = 1,
  tickLength = 0.2,
) {
  const e = extensionLength;
  const t = tickLength;

  // Four extended edges (collinear with rectangle edges, drawn beyond the corners)
  const extensionPoints = [
    [xMin - e, y, zMin],
    [xMax + e, y, zMin], // bottom
    [xMin - e, y, zMax],
    [xMax + e, y, zMax], // top
    [xMin, y, zMin - e],
    [xMin, y, zMax + e], // left
    [xMax, y, zMin - e],
    [xMax, y, zMax + e], // right
  ];

  // Perpendicular corner ticks (outward from each corner)
  const tickPoints = [
    [xMin - t, y, zMin],
    [xMin, y, zMin], // bottom-left: left tick
    [xMin, y, zMin],
    [xMin, y, zMin - t], // bottom-left: down tick
    [xMax, y, zMin],
    [xMax + t, y, zMin], // bottom-right: right tick
    [xMax, y, zMin],
    [xMax, y, zMin - t], // bottom-right: down tick
    [xMax, y, zMax],
    [xMax + t, y, zMax], // top-right: right tick
    [xMax, y, zMax],
    [xMax, y, zMax + t], // top-right: up tick
    [xMin, y, zMax],
    [xMin - t, y, zMax], // top-left: left tick
    [xMin, y, zMax],
    [xMin, y, zMax + t], // top-left: up tick
  ];

  return { extensionPoints, tickPoints };
}

/**
 * Same as rectangleExtensionLinesXZ but returns a single merged array of segment points
 * (extensions first, then ticks), for use with one <Line segments points={...} />.
 */
export function rectangleExtensionLinesXZMerged(
  xMin,
  xMax,
  zMin,
  zMax,
  y,
  extensionLength = 1,
  tickLength = 0.2,
) {
  const { extensionPoints, tickPoints } = rectangleExtensionLinesXZ(
    xMin,
    xMax,
    zMin,
    zMax,
    y,
    extensionLength,
    tickLength,
  );
  return [...extensionPoints, ...tickPoints];
}

/**
 * Merge multiple segment-point arrays into one, for drawing several rectangles with a single Line.
 * @param {...number[][][]} pointArrays - arrays of [x,y,z] points (each array = one rectangle's segment list)
 * @returns {number[][]} flattened points for Line segments
 */
export function mergeSegmentPoints(...pointArrays) {
  return pointArrays.flat(1);
}
