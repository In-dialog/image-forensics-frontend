import type { AnalysisSettings, Device } from '../types';
import styles from '../analysis.module.css';

export function GlobalSettings({ settings, onSettings, disabled }: {
  settings: AnalysisSettings; onSettings: (settings: AnalysisSettings) => void; disabled: boolean;
}) {
  return <section>
    <h2>Global settings</h2>
    <p className={styles.hint}>Shared processing settings for every stage. Turn individual stages on or off in Executor.</p>
    <fieldset className={styles.settingsFields} disabled={disabled}>
      <legend className={styles.srOnly}>Global analysis settings</legend>
      <label className={styles.field}>Processing device
        <select value={settings.device} onChange={event => onSettings({ ...settings, device: event.target.value as Device })}>
          <option value="auto">Automatic</option><option value="cpu">CPU</option><option value="cuda">CUDA GPU</option>
        </select>
        <small>Shared by image processing and vision models.</small>
      </label>
      <details className={styles.advanced}>
        <summary>Advanced settings</summary>
        <div className={styles.advancedBody}>
          <label className={styles.field}>Minimum item size (px)
            <input type="number" min="1" step="1" value={settings.min_item_size_px}
              onChange={event => onSettings({ ...settings, min_item_size_px: Number(event.target.value) })} />
            <small>Shared by segment analysis and image description.</small>
          </label>
          <h3 className={styles.editorHeading}>Synthetic image detection</h3>
          <label className={styles.field}>Service URL
            <input type="url" value={settings.synthetic_api.url}
              onChange={event => onSettings({ ...settings, synthetic_api: { ...settings.synthetic_api, url: event.target.value } })} />
          </label>
          <div className={styles.fieldGrid}>
            <label className={styles.checkbox}><input type="checkbox" checked={settings.synthetic_api.auto_start}
              onChange={event => onSettings({ ...settings, synthetic_api: { ...settings.synthetic_api, auto_start: event.target.checked } })} />
              <span>Start service automatically</span>
            </label>
            <label className={styles.field}>Startup timeout (seconds)
              <input type="number" min="1" value={settings.synthetic_api.start_timeout_seconds}
                onChange={event => onSettings({ ...settings, synthetic_api: { ...settings.synthetic_api, start_timeout_seconds: Number(event.target.value) } })} />
            </label>
          </div>
        </div>
      </details>
    </fieldset>
  </section>;
}
