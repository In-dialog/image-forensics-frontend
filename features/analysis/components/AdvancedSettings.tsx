import { FIELD_LABELS } from '../configuration';
import type { AnalysisConfig, SettingValue, StageOptions } from '../types';
import styles from '../analysis.module.css';

const specialFields = new Set(['model', 'think', 'mask_choice_mode']);

export function AdvancedSettings({ config, options, onOption }: {
  config: AnalysisConfig; options: StageOptions; onOption: (key: string, value: SettingValue) => void;
}) {
  const field = (key: string, value: SettingValue) => typeof value === 'boolean'
    ? <label key={key} className={styles.checkbox}><input type="checkbox" checked={value} onChange={event => onOption(key, event.target.checked)} /><span>{FIELD_LABELS[key] || key.replaceAll('_', ' ')}</span></label>
    : <label key={key} className={styles.field}>{FIELD_LABELS[key] || key.replaceAll('_', ' ')}
      <input type={typeof value === 'string' ? 'text' : 'number'} step="any" value={value === null ? '' : String(value)}
        min={key === 'presence_penalty' ? -2 : undefined} max={key === 'presence_penalty' ? 2 : undefined}
        onChange={event => onOption(key, event.target.value === '' ? null : typeof value === 'string' ? event.target.value : Number(event.target.value))} />
    </label>;
  return <details className={styles.advanced}>
    <summary>Advanced settings</summary>
    <p className={styles.hint}>Model, generation and processing options. Blank optional values use the model default.</p>
    <div className={styles.fieldGrid}>
      <label className={styles.field}>Model
        <input list="analysis-models" value={String(options.model || '')} onChange={event => onOption('model', event.target.value)} />
        <datalist id="analysis-models">{config.models.map(model => <option value={model} key={model} />)}</datalist>
      </label>
      {Object.entries(options).filter(([key]) => !specialFields.has(key)).map(([key, value]) => field(key, value))}
      {'think' in options && <label className={styles.field}>Reasoning
        <select value={options.think === null ? 'default' : String(options.think)} onChange={event => {
          const value = event.target.value;
          onOption('think', value === 'default' ? null : value === 'true' ? true : value === 'false' ? false : value);
        }}>
          <option value="default">Model default</option><option value="false">Off</option><option value="true">On</option>
          <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
        </select>
      </label>}
      {'mask_choice_mode' in options && <label className={styles.field}>Mask choice
        <select value={String(options.mask_choice_mode)} onChange={event => onOption('mask_choice_mode', event.target.value)}>
          <option value="fill">Fill</option><option value="score">Score</option>
          <option value="score_x_fill">Score × fill</option><option value="balanced">Balanced</option>
        </select>
      </label>}
    </div>
  </details>;
}
