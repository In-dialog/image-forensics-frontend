import type { PromptInstructions } from '../../types';
import styles from '../../analysis.module.css';

export function InstructionFields({ value, onChange, positiveLabel = 'Positive instructions', negativeLabel = 'Negative instructions',
  positivePlaceholder = 'What should the analysis focus on?', negativePlaceholder = 'What should it ignore or avoid inferring?', maxLength = 12000 }: {
  value: PromptInstructions; onChange: (value: PromptInstructions) => void;
  positiveLabel?: string; negativeLabel?: string; positivePlaceholder?: string; negativePlaceholder?: string; maxLength?: number;
}) {
  return <div className={styles.fieldGrid}>
    <label className={styles.field}>{positiveLabel}
      <textarea rows={4} value={value.positive} maxLength={maxLength} placeholder={positivePlaceholder}
        onChange={event => onChange({ ...value, positive: event.target.value })} />
    </label>
    <label className={styles.field}>{negativeLabel}
      <textarea rows={4} value={value.negative} maxLength={maxLength} placeholder={negativePlaceholder}
        onChange={event => onChange({ ...value, negative: event.target.value })} />
    </label>
  </div>;
}
