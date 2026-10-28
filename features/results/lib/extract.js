const NO_TYPE = "(no type)";

/** Canonical way to get an extract's group label. */
export function getExtractGroup(extract) {
  return extract?.group ?? NO_TYPE;
}

/**
 * Extract image dimensions from ImageDataContext value.
 * Returns { width, height } or null when data is not loaded.
 */
export function getImageDimensions(data) {
  const w = data?.metadata?.image_width;
  const h = data?.metadata?.image_height;
  if (w == null || h == null) return null;
  return { width: w, height: h };
}
