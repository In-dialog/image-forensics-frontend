import { useState } from 'react';
import { changeCriterionType, criterionSummary, moveItem, PROMPT_LIMITS } from '../../prompts';
import { copyEditorItem, RANKING_TEMPLATES } from '../../promptTemplates';
import type { RankingCriterion, RankingProfile } from '../../types';
import { InstructionFields } from './InstructionFields';
import { ItemActions } from './ItemActions';
import { TemplatePicker } from './TemplatePicker';
import { PromptCollection } from './PromptCollection';
import { EditorIcon } from './EditorIcon';
import editorStyles from './promptEditor.module.css';
import styles from '../../analysis.module.css';

export function RankingEditor({ profile, onChange }: { profile: RankingProfile; onChange: (profile: RankingProfile) => void }) {
  const [selected, setSelected] = useState(0);
  const index = Math.min(selected, profile.criteria.length - 1);
  const criterion = profile.criteria[index];
  function update(value: RankingCriterion) {
    onChange({ ...profile, criteria: profile.criteria.map((item, i) => i === index ? value : item) });
  }
  function addCriterion(value: RankingCriterion) {
    if (profile.criteria.length >= PROMPT_LIMITS.criteria) return;
    setSelected(profile.criteria.length);
    onChange({ ...profile, criteria: [...profile.criteria, copyEditorItem(value, profile.criteria)] });
  }
  return <>
    <InstructionFields value={profile} onChange={instructions => onChange({ ...profile, ...instructions })}
      positivePlaceholder="What overall perspective should the ratings use?" negativePlaceholder="Which assumptions or signals should not influence the ratings?" />
    <PromptCollection title="Criteria" singular="Criterion" label="Ranking criteria" items={profile.criteria}
      selected={index} limit={PROMPT_LIMITS.criteria} onSelect={setSelected}
      summary={item => item.type === 'score' ? `Score · ${criterionSummary(item)}` : item.type === 'choice' ? `${item.choices.length} choices` : 'Yes / No'}
      addAction={<TemplatePicker templates={RANKING_TEMPLATES} label="Criterion templates" buttonLabel="Add criterion"
        disabled={profile.criteria.length >= PROMPT_LIMITS.criteria} onAdd={addCriterion} />}
      actions={criterion && <ItemActions index={index} count={profile.criteria.length} label={criterion.label || `criterion ${index + 1}`}
          onDuplicate={() => addCriterion(criterion)} duplicateDisabled={profile.criteria.length >= PROMPT_LIMITS.criteria}
          onMove={offset => { onChange({ ...profile, criteria: moveItem(profile.criteria, index, offset) }); setSelected(index + offset); }}
          onRemove={() => { onChange({ ...profile, criteria: profile.criteria.filter((_, i) => i !== index) }); setSelected(Math.max(0, index - 1)); }} />}>
      {criterion && <>
      <div className={styles.fieldGrid}>
        <label className={styles.field}>Title<input value={criterion.label} maxLength={120} onChange={event => update({ ...criterion, label: event.target.value })} /></label>
        <label className={styles.field}>Answer type
          <select value={criterion.type} onChange={event => update(changeCriterionType(criterion, event.target.value as RankingCriterion['type']))}>
            <option value="score">Score on a scale</option><option value="choice">Choose a category</option><option value="boolean">Yes / No</option>
          </select>
        </label>
      </div>
      <InstructionFields value={criterion} maxLength={5000} positiveLabel="What should be evaluated?" negativeLabel="What should be excluded?"
        positivePlaceholder="Define the visible evidence that matters for this criterion" negativePlaceholder="Avoid these assumptions or unrelated details"
        onChange={instructions => update({ ...criterion, ...instructions })} />
      {criterion.type === 'score' && <section className={editorStyles.answerSection}>
        <h4>Score range</h4>
        <div className={styles.fieldGrid}>
          <label className={styles.field}>Lowest score
            <input type="number" step="any" min={-1000000} max={1000000} value={Number.isFinite(criterion.min) ? criterion.min : ''}
              onChange={event => update({ ...criterion, min: event.target.value === '' ? NaN : Number(event.target.value) })} />
          </label>
          <label className={styles.field}>Highest score
            <input type="number" step="any" min={-1000000} max={1000000} value={Number.isFinite(criterion.max) ? criterion.max : ''}
              onChange={event => update({ ...criterion, max: event.target.value === '' ? NaN : Number(event.target.value) })} />
          </label>
          <label className={styles.field}>What does the lowest score mean?
            <input value={criterion.low_label} maxLength={200} placeholder="Absent or very weak" onChange={event => update({ ...criterion, low_label: event.target.value })} />
          </label>
          <label className={styles.field}>What does the highest score mean?
            <input value={criterion.high_label} maxLength={200} placeholder="Clearly and strongly present" onChange={event => update({ ...criterion, high_label: event.target.value })} />
          </label>
        </div>
      </section>}
      {criterion.type === 'choice' && <section className={editorStyles.answerSection}>
        <div className={editorStyles.answerHeader}><h4>Allowed answers</h4>
          <button type="button" className={editorStyles.actionButton} disabled={criterion.choices.length >= PROMPT_LIMITS.choices}
            onClick={() => update({ ...criterion, choices: [...criterion.choices, ''] })}><EditorIcon name="add" />Add choice</button>
        </div>
        <div className={editorStyles.choiceList}>{criterion.choices.map((choice, choiceIndex) => <div className={editorStyles.choiceRow} key={choiceIndex}>
          <span className={editorStyles.itemNumber}>{String(choiceIndex + 1).padStart(2, '0')}</span>
          <label className={styles.field}><span className={styles.srOnly}>Choice {choiceIndex + 1}</span>
            <input value={choice} maxLength={120} placeholder={`Choice ${choiceIndex + 1}`}
              onChange={event => update({ ...criterion, choices: criterion.choices.map((value, i) => i === choiceIndex ? event.target.value : value) })} />
          </label>
          <button type="button" className={`${editorStyles.actionButton} ${editorStyles.removeButton}`} disabled={criterion.choices.length <= 2} aria-label={`Remove choice ${choiceIndex + 1}`}
            onClick={() => update({ ...criterion, choices: criterion.choices.filter((_, i) => i !== choiceIndex) })}><EditorIcon name="remove" /></button>
        </div>)}</div>
      </section>}
      </>}
    </PromptCollection>
  </>;
}
