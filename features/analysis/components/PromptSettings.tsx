import { useState } from 'react';
import { profileErrors } from '../prompts';
import type { AnalysisConfig, PromptProfile, PromptStage, SettingValue, StageOptions } from '../types';
import { AdvancedSettings } from './AdvancedSettings';
import { DetectionEditor } from './prompts/DetectionEditor';
import { DescriptionEditor } from './prompts/DescriptionEditor';
import { RankingEditor } from './prompts/RankingEditor';
import styles from '../analysis.module.css';

export function PromptSettings({config, stage, options, prompt, onOption, onPrompt}: {
  config: AnalysisConfig; stage: PromptStage; options: StageOptions; prompt: PromptProfile;
  onOption: (key: string, value: SettingValue) => void; onPrompt: (profile: PromptProfile) => void;
}) {
  const [preset, setPreset] = useState('');
  const [revision, setRevision] = useState(0);
  const presets = (config.prompt_presets?.[stage] || []).filter(item => item.profile.kind === prompt.kind);
  const errors = profileErrors(prompt);
  function applyPreset() {
    const item = presets[Number(preset)];
    if (preset === '' || !item) return;
    onPrompt(structuredClone(item.profile));
    setRevision(value => value + 1);
    setPreset('');
  }
  return <>
    {presets.length > 0 && <div className={styles.presetRow}>
      <label className={styles.field}>Start from a preset
        <select value={preset} onChange={event => setPreset(event.target.value)}>
          <option value="">Choose a preset</option>
          {presets.map((item, index) => <option key={index} value={index}>{item.name}</option>)}
        </select>
      </label>
      <button type="button" className={styles.secondaryButton} disabled={preset === ''} onClick={applyPreset}>Apply preset</button>
    </div>}
    {prompt.kind === 'detection' && <DetectionEditor key={revision} profile={prompt} onChange={onPrompt} />}
    {prompt.kind === 'description' && <DescriptionEditor key={revision} profile={prompt} onChange={onPrompt} />}
    {prompt.kind === 'ranking' && <RankingEditor key={revision} profile={prompt} onChange={onPrompt} />}
    {errors.length > 0 && <div className={styles.validationErrors} role="status"><p>Complete these details before saving or starting:</p>
      <ul>{errors.map((error, index) => <li key={index}>{error}</li>)}</ul>
    </div>}
    {!config.ollama_available && <p className={styles.hint}>The model service is offline. Start it before running model stages.</p>}
    <AdvancedSettings config={config} options={options} onOption={onOption} />
  </>;
}
