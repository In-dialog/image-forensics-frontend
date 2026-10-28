import { PROMPT_STAGE } from '../configuration';
import type { AnalysisConfig, AnalysisPrompts, AnalysisSettings, AnalysisStage, SettingValue } from '../types';
import { PromptSettings } from './PromptSettings';
import styles from '../analysis.module.css';

export function StageSettings({stage, config, settings, prompts, onSettings, onPrompts, disabled}: {
  stage: AnalysisStage; config: AnalysisConfig; settings: AnalysisSettings; prompts: AnalysisPrompts;
  onSettings: (settings: AnalysisSettings) => void; onPrompts: (prompts: AnalysisPrompts) => void; disabled: boolean;
}) {
  const promptStage = PROMPT_STAGE[stage.key];
  function setOption(key: string, value: SettingValue) {
    if (promptStage) onSettings({...settings, stage_options: {...settings.stage_options,
      [promptStage]: {...settings.stage_options[promptStage], [key]: value}}});
  }
  return <section className={styles.stageSettings}>
    <h2>{stage.label}</h2>
    <fieldset className={styles.settingsFields} disabled={disabled}>
      <legend className={styles.srOnly}>{stage.label} settings</legend>
      {/* Keep the responsive editor inside a stable fieldset content wrapper. */}
      <div>
        {promptStage && <PromptSettings config={config} stage={promptStage} options={settings.stage_options[promptStage]} prompt={prompts[promptStage]}
          onOption={setOption} onPrompt={profile => onPrompts({...prompts, [promptStage]: profile})} />}
      </div>
    </fieldset>
  </section>;
}
