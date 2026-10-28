import { REQUIRED_STAGES, type AnalysisStage, type StageGroup } from "../types";
import styles from "../analysis.module.css";

const groups: { key: StageGroup; label: string }[] = [
  { key: "global", label: "Whole image" },
  { key: "per_item", label: "Per item" },
  { key: "ranking", label: "Rankings" },
];

export function StageSelector({ stages, selected, onChange, disabled }: {
  stages: AnalysisStage[]; selected: string[]; onChange: (selected: string[]) => void; disabled?: boolean;
}) {
  function toggle(key: string) {
    onChange(selected.includes(key) ? selected.filter((value) => value !== key) : [...selected, key]);
  }
  return (
    <section className={styles.section} aria-labelledby="stages-heading">
      <div className={styles.sectionHeading}>
        <h2 id="stages-heading">Analysis stages</h2>
        <div className={styles.inlineActions}>
          <button type="button" disabled={disabled} onClick={() => onChange(stages.map((stage) => stage.key))}>Select all</button>
          <button type="button" disabled={disabled} onClick={() => onChange([...REQUIRED_STAGES])}>Required only</button>
        </div>
      </div>
      <p className={styles.hint}>Object extraction and the original image are included in every new analysis.</p>
      <div className={styles.stageGroups}>
        {groups.map((group) => (
          <fieldset className={styles.stageGroup} key={group.key} disabled={disabled}>
            <legend>{group.label}</legend>
            {stages.filter((stage) => stage.group === group.key).map((stage) => (
              <label key={stage.key} className={styles.checkbox}>
                <input type="checkbox" checked={selected.includes(stage.key)} disabled={REQUIRED_STAGES.includes(stage.key)} onChange={() => toggle(stage.key)} />
                <span>{stage.label}{REQUIRED_STAGES.includes(stage.key) && <small>Included</small>}</span>
              </label>
            ))}
          </fieldset>
        ))}
      </div>
    </section>
  );
}
