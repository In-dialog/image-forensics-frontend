import { useState } from 'react';
import { moveItem, PROMPT_LIMITS } from '../../prompts';
import { copyEditorItem, QUESTION_TEMPLATES } from '../../promptTemplates';
import type { DescriptionProfile, DescriptionQuestion } from '../../types';
import { InstructionFields } from './InstructionFields';
import { ItemActions } from './ItemActions';
import { TemplatePicker } from './TemplatePicker';
import { PromptCollection } from './PromptCollection';
import styles from '../../analysis.module.css';

export function DescriptionEditor({ profile, onChange }: { profile: DescriptionProfile; onChange: (profile: DescriptionProfile) => void }) {
  const [selected, setSelected] = useState(0);
  const index = Math.min(selected, profile.questions.length - 1);
  const question = profile.questions[index];
  function updateQuestion(patch: Partial<DescriptionProfile['questions'][number]>) {
    onChange({ ...profile, questions: profile.questions.map((item, i) => i === index ? { ...item, ...patch } : item) });
  }
  function addQuestion(value: DescriptionQuestion) {
    if (profile.questions.length >= PROMPT_LIMITS.questions) return;
    setSelected(profile.questions.length);
    onChange({ ...profile, questions: [...profile.questions, copyEditorItem(value, profile.questions)] });
  }
  return <>
    <label className={styles.field}>Description style
      <select value={profile.style} onChange={event => onChange({ ...profile, style: event.target.value as DescriptionProfile['style'] })}>
        <option value="concise">Concise — short and direct</option>
        <option value="detailed">Detailed — include context and visible evidence</option>
        <option value="bullets">Bullet points — easy to scan</option>
      </select>
    </label>
    <InstructionFields value={profile} onChange={instructions => onChange({ ...profile, ...instructions })} />
    <PromptCollection title="Questions" singular="Question" label="Description questions" items={profile.questions}
      selected={index} limit={PROMPT_LIMITS.questions} onSelect={setSelected}
      addAction={<TemplatePicker templates={QUESTION_TEMPLATES} label="Question templates" buttonLabel="Add question"
        disabled={profile.questions.length >= PROMPT_LIMITS.questions} onAdd={addQuestion} />}
      actions={question && <ItemActions index={index} count={profile.questions.length} label={question.label || `question ${index + 1}`}
          onDuplicate={() => addQuestion(question)} duplicateDisabled={profile.questions.length >= PROMPT_LIMITS.questions}
          onMove={offset => { onChange({ ...profile, questions: moveItem(profile.questions, index, offset) }); setSelected(index + offset); }}
          onRemove={() => { onChange({ ...profile, questions: profile.questions.filter((_, i) => i !== index) }); setSelected(Math.max(0, index - 1)); }} />}>
      {question && <>
        <label className={styles.field}>Title<input value={question.label} maxLength={120} onChange={event => updateQuestion({ label: event.target.value })} /></label>
        <label className={styles.field}>What do you want to know?
          <textarea rows={4} value={question.instruction} maxLength={5000} onChange={event => updateQuestion({ instruction: event.target.value })}
            placeholder="Describe the composition, explain visible relationships, read a sign…" />
        </label>
      </>}
    </PromptCollection>
  </>;
}
