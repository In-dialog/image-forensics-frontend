/**
 * Centralized calculations: JSON extract → world position/size.
 * Expects metadata with image_width, image_height; extracts with bbox_position [x,y,z], bbox_size [w,h] or bbox [x0,y0,x1,y1].
 */

export const DEPTH_SCALE = 2;

/** Exponent for depth power transform (values in [0,1]). > 1 pulls high values toward 0. Use 1 to disable. */
export const DEPTH_POWER = 2;

export function fullQuadSize(imageWidth, imageHeight, fullQuadMaxSize = 2) {
  const aspect = imageWidth / imageHeight;
  if (aspect >= 1) return { w: fullQuadMaxSize, h: fullQuadMaxSize / aspect };
  return { w: fullQuadMaxSize * aspect, h: fullQuadMaxSize };
}

export function getExtractPosition(extract) {
  const pos = extract.bbox_position ?? [extract.x, extract.y, extract.z];
  return { x: pos[0], y: pos[1], z: pos[2] };
}

/**
 * Rank normalization (uniform distribution): sort by z, assign each point a value in [0, 1] by rank.
 * Returns array same length as extracts; depthRanks[i] is the normalized depth for extracts[i].
 * Call once per dataset.
 */
export function getExtractDepthRanks(extracts) {
  const list = Array.isArray(extracts) ? extracts : [];
  const withZ = list.map((extract, index) => ({
    index,
    z: getExtractPosition(extract).z ?? 0,
  }));
  withZ.sort((a, b) => {
    const za = a.z != null && !Number.isNaN(a.z) ? a.z : 0;
    const zb = b.z != null && !Number.isNaN(b.z) ? b.z : 0;
    return za - zb;
  });
  const n = withZ.length;
  const ranks = new Array(n);
  if (n === 0) return ranks;
  if (n === 1) {
    ranks[withZ[0].index] = 0.5;
    return ranks;
  }
  for (let rank = 0; rank < n; rank++) {
    ranks[withZ[rank].index] = rank / (n - 1);
  }
  return ranks;
}

/**
 * Power transform for values in [0, 1]. With exponent p > 1, pulls values toward 0:
 * 1 stays 1; values near 0.9 move down faster (e.g. 0.9^2 = 0.81).
 * Use to spread out depth when ranks are clustered near 1.
 */
export function powerTransform(value, exponent = 1) {
  if (exponent === 1 || value <= 0 || value >= 1) return value;
  if (!Number.isFinite(value) || !Number.isFinite(exponent) || exponent <= 0)
    return value;
  return value ** exponent;
}

/**
 * Z range used for positioned extracts: pz = powerTransform(rank, DEPTH_POWER) + 0.5, rank in [0, 1].
 * Use for container box or any UI that should match the depth of placed objects.
 */
export function getExtractDepthRange() {
  const zMin = 0.5; // rank 0 → powerTransform(0) = 0 → pz = 0.5
  const zMax = 1.5; // rank 1 → powerTransform(1) = 1 → pz = 1.5
  return { zMin, zMax };
}

/** Average pz of all depth ranks (same transform as positionFromExtract). Use for orbit target z. */
export function getAverageDepth(depthRanks) {
  if (!Array.isArray(depthRanks) || depthRanks.length === 0) return 0;
  let sum = 0;
  for (const r of depthRanks) {
    const t = powerTransform(
      r != null && Number.isFinite(r) ? r : 0,
      DEPTH_POWER,
    );
    sum += t + 0.5;
  }
  return sum / depthRanks.length;
}

/**
 * Position/size from extract. Derives image dimensions and full quad size from metadata.
 * @param metadata - { image_width, image_height }
 * @param depthRank - number in [0, 1] from getExtractDepthRanks(extracts)[i]
 * @param fullQuadMaxSize - optional, default 2
 */
export function positionFromExtract(
  extract,
  metadata,
  depthRank,
  fullQuadMaxSize = 2,
) {
  const imageWidth = metadata?.image_width;
  const imageHeight = metadata?.image_height;
  if (!imageWidth || !imageHeight) return { px: 0, py: 0, pz: 0 };
  const { w: fullW, h: fullH } = fullQuadSize(
    imageWidth,
    imageHeight,
    fullQuadMaxSize,
  );
  const { x, y } = getExtractPosition(extract);
  const px = (x / imageWidth) * fullW - fullW / 2;
  const py = fullH / 2 - (y / imageHeight) * fullH;
  let r = depthRank != null && Number.isFinite(depthRank) ? depthRank : 0;
  r = powerTransform(r, DEPTH_POWER);
  const pz = r + 0.5;

  return { px, py, pz };
}

/** Derives image dimensions and full quad size from metadata. */
export function sizeFromExtract(extract, metadata, fullQuadMaxSize = 2) {
  const imageWidth = metadata?.image_width;
  const imageHeight = metadata?.image_height;
  if (!imageWidth || !imageHeight)
    return { segW: fullQuadMaxSize * 0.2, segH: fullQuadMaxSize * 0.2 };
  const { w: fullW, h: fullH } = fullQuadSize(
    imageWidth,
    imageHeight,
    fullQuadMaxSize,
  );
  const { bbox, bbox_size } = extract;
  if (Array.isArray(bbox_size) && bbox_size.length >= 2) {
    return {
      segW: (bbox_size[0] / imageWidth) * fullW,
      segH: (bbox_size[1] / imageHeight) * fullH,
    };
  }
  if (Array.isArray(bbox) && bbox.length >= 4) {
    return {
      segW: ((bbox[2] - bbox[0]) / imageWidth) * fullW,
      segH: ((bbox[3] - bbox[1]) / imageHeight) * fullH,
    };
  }
  return { segW: fullW * 0.2, segH: fullH * 0.2 };
}
