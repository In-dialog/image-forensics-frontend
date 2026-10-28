import type { KeyboardEvent } from 'react';
import { PROMPT_STAGE, STAGE_GROUPS } from '../configuration';
import type { AnalysisStage } from '../types';
import styles from '../analysis.module.css';

export function AnalysisTabs({stages, selected, onSelect}: {
  stages: AnalysisStage[]; selected: string; onSelect: (key: string) => void;
}) {
  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const index = tabs.indexOf(event.target as HTMLButtonElement);
    if (index < 0) return;
    let next = index;
    if (['ArrowDown', 'ArrowRight'].includes(event.key)) next = (index + 1) % tabs.length;
    else if (['ArrowUp', 'ArrowLeft'].includes(event.key)) next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    tabs[next].focus(); tabs[next].click();
  }
  const tab = (key: string, label: string) => <button key={key} type="button" role="tab"
    id={`analysis-tab-${key}`} aria-controls="analysis-panel" aria-selected={selected === key}
    tabIndex={selected === key ? 0 : -1} className={`${styles.tab} ${key === 'executor' ? styles.executorTab : ''}`} onClick={() => onSelect(key)}>{label}</button>;
  return <div className={styles.tabs} role="tablist" aria-label="Analysis configuration" aria-orientation="vertical" onKeyDown={navigate}>
    {tab('executor', 'Executor')}
    {tab('global-settings', 'Global settings')}
    {STAGE_GROUPS.map(group => <div key={group.key} className={styles.tabGroup} role="presentation">
      <span className={styles.tabGroupLabel}>{group.label}</span>
      {stages.filter(stage => stage.group === group.key && PROMPT_STAGE[stage.key]).map(stage => tab(stage.key, stage.label))}
    </div>)}
    {tab('history', 'Recent runs')}
  </div>;
}
