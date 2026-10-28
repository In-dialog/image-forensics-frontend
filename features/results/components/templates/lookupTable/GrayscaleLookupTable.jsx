"use client";

/**
 * Intensity-based lookup table for grayscale images.
 * Input is treated as grayscale (converted to luminance); for each intensity value
 * we lerp between the table entries to get output RGB. Table is indexed by
 * intensity 0..1 (evenly spaced); "table" type does linear interpolation.
 *
 * Mount once; then use in CSS: filter: url(#your-filter-id);
 *
 * @param {string} filterId - ID for the filter (default "lookup-table")
 * @param {string} tableR - Output R at intensity 0, 1/(n-1), ..., 1 (space-separated)
 * @param {string} tableG - Output G at same intensity stops
 * @param {string} tableB - Output B at same intensity stops
 * @param {string} tableA - Output alpha at same intensity stops (1 = opaque, 0 = transparent)
 * @param {Array<[r,g,b,a]>} stops - Alternative: define LUT as [r,g,b,a] per intensity stop (RGB 0-255, alpha 0-1); overridden by tableR/tableG/tableB/tableA if provided
 */
// Default LUT: each stop is [r, g, b, a] in RGBA format (0-255 for RGB, 0-1 for alpha)
// rgb(64, 240, 181);
const DEFAULT_LUT_STOPS = [
  [0, 0, 38, 0], // rgba(0, 0, 38, 0) - intensity 0
  [64, 240, 181, 0.5], // rgba(0, 107, 204, 0.9) - intensity 0.5
  [255, 255, 255, 0.8], // rgba(255, 255, 255, 0.8) - intensity 1
];

function stopsToTableValues(stops, channelIndex) {
  return stops
    .map((stop) => {
      const val = stop[channelIndex];
      // RGB channels (0-2): normalize 0-255 → 0-1 for feComponentTransfer
      return channelIndex < 3 ? val / 255 : val;
    })
    .join(" ");
}

/**
 * @param {{
 *   filterId?: string,
 *   tableR?: string,
 *   tableG?: string,
 *   tableB?: string,
 *   tableA?: string,
 *   stops?: number[][]
 * }} props
 */
export default function GrayscaleLookupTable({
  filterId = "lookup-table",
  tableR,
  tableG,
  tableB,
  tableA,
  stops = DEFAULT_LUT_STOPS,
}) {
  const tableRVal = tableR ?? stopsToTableValues(stops, 0);
  const tableGVal = tableG ?? stopsToTableValues(stops, 1);
  const tableBVal = tableB ?? stopsToTableValues(stops, 2);
  const tableAVal = tableA ?? stopsToTableValues(stops, 3);
  // Convert input to luminance and duplicate to R,G,B,A so all four transfers use intensity.
  const luminanceMatrix =
    "0.2126 0.7152 0.0722 0 0  " +
    "0.2126 0.7152 0.0722 0 0  " +
    "0.2126 0.7152 0.0722 0 0  " +
    "0.2126 0.7152 0.0722 0 0";

  return (
    <svg aria-hidden="true" style={{ display: "none" }}>
      <filter id={filterId} colorInterpolationFilters="sRGB">
        <feColorMatrix
          type="matrix"
          values={luminanceMatrix}
          in="SourceGraphic"
          result="intensity"
        />
        <feComponentTransfer in="intensity" colorInterpolationFilters="sRGB">
          <feFuncR type="table" tableValues={tableRVal} />
          <feFuncG type="table" tableValues={tableGVal} />
          <feFuncB type="table" tableValues={tableBVal} />
          <feFuncA type="table" tableValues={tableAVal} />
        </feComponentTransfer>
      </filter>
    </svg>
  );
}
