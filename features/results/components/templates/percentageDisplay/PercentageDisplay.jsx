"use client";

import "./PercentageDisplay.css";

/**
 * Standalone percentage display: value, range (mapped to 0–100%), title, explanation, value in center.
 * @param {number} value - Raw value (will be clamped to range)
 * @param {[number, number]} range - [min, max] to map to 0–100%
 * @param {string} title - Title text
 * @param {string} explanation - Explanation text
 * @param {string} [valueSuffix] - Optional suffix for the center value (e.g. "%", " pts")
 * @param {string} [imageSrc] - Optional image URL to display next to the item
 * @param {string} [imageAlt] - Optional alt text for the image
 */
export default function PercentageDisplay({
  value,
  range = [0, 100],
  title = "",
  explanation = "",
  valueSuffix = "",
  imageSrc = "",
  imageAlt = "",
}) {
  const [min, max] = range;
  const clamped = Math.max(min, Math.min(max, value));
  const pct = max === min ? 0 : ((clamped - min) / (max - min)) * 100;

  return (
    <div className="percentage-display">
      {imageSrc && (
        <div className="percentage-display__image-wrap">
          <img
            src={imageSrc}
            alt={imageAlt || title}
            className="percentage-display__image"
          />
        </div>
      )}
      <div className="percentage-display__content">
      {title && <span className="percentage-display__title">{title}</span>}

      <div className="percentage-display__gauge-wrap">
        <div className="percentage-display__track">
          <div
            className="percentage-display__fill"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="percentage-display__center">
          <span className="percentage-display__value">
            {typeof value === "number" && Number.isFinite(value)
              ? `${Math.round(pct)}%`
              : value}
            {valueSuffix}
          </span>
        </div>
      </div>

      {explanation && (
        <p className="percentage-display__explanation">{explanation}</p>
      )}
      </div>
    </div>
  );
}
