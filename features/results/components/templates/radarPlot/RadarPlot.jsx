"use client";

import "./RadarPlot.css";

const GRID_LEVELS = 5;

export default function RadarPlot({ items = [], title = "" }) {
  if (!items.length) return null;

  const n = items.length;
  const step = (2 * Math.PI) / n;

  const axes = items.map((item, i) => {
    const [min, max] = item.range ?? [0, 10];
    const clamped = Math.max(min, Math.min(max, Number(item.value) ?? 0));
    const t = (clamped - min) / (max - min || 1);
    const a = -Math.PI / 2 + i * step;
    return { ...item, a, t };
  });

  const poly = (r) =>
    axes.map(({ a }) => `${r * Math.cos(a)},${r * Math.sin(a)}`).join(" ");

  const dataPoly = axes
    .map(({ a, t }) => `${t * 100 * Math.cos(a)},${t * 100 * Math.sin(a)}`)
    .join(" ");

  return (
    <div className="radar-plot">
      {title && <span className="radar-plot__title">{title}</span>}
      <svg className="radar-plot__svg" viewBox="-230 -150 460 300">
        {Array.from({ length: GRID_LEVELS }, (_, i) => (
          <polygon
            key={i}
            className="radar-plot__grid"
            points={poly((100 * (i + 1)) / GRID_LEVELS)}
          />
        ))}
        {axes.map(({ a }, i) => (
          <line
            key={i}
            className="radar-plot__spoke"
            x1={0} y1={0}
            x2={100 * Math.cos(a)} y2={100 * Math.sin(a)}
          />
        ))}
        <polygon className="radar-plot__data" points={dataPoly} />
        {axes.map((item, i) => {
          const lr = 115;
          const lx = lr * Math.cos(item.a);
          const ly = lr * Math.sin(item.a);
          const anchor = lx < -5 ? "end" : lx > 5 ? "start" : "middle";
          return (
            <text
              key={i}
              className="radar-plot__label"
              x={lx} y={ly}
              textAnchor={anchor}
              dominantBaseline="middle"
            >
              <title>{item.title || item.key || `Axis ${i + 1}`}</title>
              {(item.title || item.key || `Axis ${i + 1}`).length > 28
                ? `${(item.title || item.key).slice(0, 25)}…` : item.title || item.key || `Axis ${i + 1}`}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
