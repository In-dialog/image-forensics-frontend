/**
 * Global color palette for non-grey/black/white colors.
 * Names describe usage, not color – mirrors app/globals.css :root variables.
 * Use for JS/Three.js where CSS vars aren't available.
 */
export const palette = {
  accent: "#40f0b5",
  accentAlpha: "#40f0b584",
  annotationStroke: "#40f0b5",
  annotationStrokeMuted: "#40f0b589",
  annotationFill: "#40f0b5",
  annotationStrokeBright: "#40f0b5",
  selectionOutline: "#40f0b5",
  canvas3dLine: "#40f0b52c",
  canvas3dDepth: "#40f0b5",
  canvas3dMesh: "#40f0b5",
  error: "#c44",
  errorMuted: "#c06060",
} as const;
