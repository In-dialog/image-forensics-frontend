"use client";

import "./LinearGauge.css";

export default function LinearGauge({
  value,
  range = [0, 10],
  labels = {},
  title = "",
  centered = true,
  /** When true, labels under the line show deviation from center: -5, 0, 5 instead of 0, 5, 10 */
  labelsAsDeviation = false,
}) {
  const [min, max] = range;
  const mid = (min + max) / 2;
  const halfSpan = (max - min) / 2; // 5 for 0–10
  const clamped = Math.max(min, Math.min(max, value));
  const deviation = clamped - mid; // positive = toward max, negative = toward min

  // For deviation labels: show integer -5, 0, 5 (no decimal) and keep the passed-in text
  const displayLabels = labelsAsDeviation
    ? {
        start: [Math.round(-halfSpan), labels.start],
        mid: [0, labels.mid],
        end: [Math.round(halfSpan), labels.end],
      }
    : { start: labels.start ?? min, mid: labels.mid ?? mid, end: labels.end ?? max };

  let fillStyle = {};
  if (centered) {
    // Bar grows from center: width = |deviation|/halfSpan * 50%, positioned left or right of center
    const fillPct = (Math.abs(deviation) / halfSpan) * 50;
    const isRight = deviation >= 0;
    fillStyle = {
      width: `${fillPct}%`,
      left: isRight ? "50%" : `${50 - fillPct}%`,
    };
  } else {
    const pct = ((clamped - min) / (max - min)) * 100;
    fillStyle = { width: `${pct}%`, left: "0" };
  }

  return (
    <div className="linear-gauge">
      {title && <span className="linear-gauge__title">{title}</span>}

      <div className="linear-gauge__track">
        <div className="linear-gauge__fill" style={fillStyle} />
        {centered && <div className="linear-gauge__center-line" />}
      </div>

      <div className="linear-gauge__labels">
        <span className="linear-gauge__label linear-gauge__label--start">
          {Array.isArray(displayLabels.start) ? (
            <>{displayLabels.start[0]}{displayLabels.start[1] != null && displayLabels.start[1] !== "" ? ` · ${displayLabels.start[1]}` : ""}</>
          ) : (
            displayLabels.start
          )}
        </span>
        <span className="linear-gauge__label linear-gauge__label--mid">
          {Array.isArray(displayLabels.mid) ? (
            displayLabels.mid[0]
          ) : (
            displayLabels.mid
          )}
        </span>
        <span className="linear-gauge__label linear-gauge__label--end">
          {Array.isArray(displayLabels.end) ? (
            displayLabels.end[1] != null && displayLabels.end[1] !== ""
              ? `${displayLabels.end[1]} · ${displayLabels.end[0]}`
              : displayLabels.end[0]
          ) : (
            displayLabels.end
          )}
        </span>
      </div>
    </div>
  );
}
