import styles from './measurementLabel.module.css';

/** Source-image distances, with readable badges placed in display coordinates. */
export function MeasurementLabels({ segments, sourceSize, displaySize }) {
  if (sourceSize.width <= 0 || sourceSize.height <= 0 || displaySize.width <= 0 || displaySize.height <= 0) return null;
  const scaleX = displaySize.width / sourceSize.width;
  const scaleY = displaySize.height / sourceSize.height;
  const height = 28;
  const inset = 4;
  const contain = (center, extent, size) => extent < size + inset * 2
    ? extent / 2 : Math.max(size / 2 + inset, Math.min(extent - size / 2 - inset, center));
  const measurements = segments.flatMap(({ start, end }, index) => {
    const dx = end[0] - start[0], dy = end[1] - start[1];
    const length = Math.hypot(dx, dy);
    if (!Number.isFinite(length) || length < 40) return [];
    const text = `${Math.round(length)} px`;
    const width = text.length * 8.5 + 18;
    const anchorX = (start[0] + end[0]) / 2 * scaleX;
    const anchorY = (start[1] + end[1]) / 2 * scaleY;
    return [{ index, text, width, anchorX, anchorY, vertical: Math.abs(dy) > Math.abs(dx),
      x: contain(anchorX, displaySize.width, width), y: contain(anchorY, displaySize.height, height) }];
  });

  // Reserve top/bottom labels first, then stagger any colliding side labels.
  const placed = [];
  for (const label of measurements.sort((a, b) => Number(b.vertical) - Number(a.vertical))) {
    const clear = y => placed.every(other => Math.abs(label.x - other.x) >= (label.width + other.width) / 2 + inset ||
      Math.abs(y - other.y) >= height + inset);
    const offsets = [0, 1, -1, 2, -2, 3, -3, 4, -4];
    const candidates = [...offsets.map(step => label.y + step * (height + 6)),
      ...placed.flatMap(other => [other.y - height - inset, other.y + height + inset])]
      .map(y => contain(y, displaySize.height, height))
      .sort((a, b) => Math.abs(a - label.y) - Math.abs(b - label.y));
    const y = candidates.find(clear);
    placed.push({ ...label, y: y ?? label.y });
  }

  // Undo image scaling once for the whole layer, including its leader lines.
  return <g className={styles.label} transform={`scale(${1 / scaleX} ${1 / scaleY})`}>
    {placed.map(label => Math.abs(label.x - label.anchorX) + Math.abs(label.y - label.anchorY) > 1 &&
      <line key={`leader-${label.index}`} x1={label.anchorX} y1={label.anchorY} x2={label.x} y2={label.y} />)}
    {placed.sort((a, b) => a.index - b.index).map(label => <g key={label.index} transform={`translate(${label.x} ${label.y})`}>
      <rect x={-label.width / 2} y={-height / 2} width={label.width} height={height} rx="3" />
      <text x="0" y="0" dy=".35em" textAnchor="middle">{label.text}</text>
    </g>)}
  </g>;
}
