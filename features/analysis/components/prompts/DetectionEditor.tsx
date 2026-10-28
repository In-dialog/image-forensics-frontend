import { useState } from 'react';
import type { DetectionProfile } from '../../types';
import { InstructionFields } from './InstructionFields';
import styles from '../../analysis.module.css';

const groups = [{ key: 'people', label: 'People' }, { key: 'objects', label: 'Objects' }, { key: 'texts', label: 'Text' }] as const;

export function DetectionEditor({ profile, onChange }: { profile: DetectionProfile; onChange: (profile: DetectionProfile) => void }) {
  const [group, setGroup] = useState<keyof DetectionProfile['groups']>('people');
  return <>
    <InstructionFields value={profile} onChange={instructions => onChange({ ...profile, ...instructions })}
      positivePlaceholder="Which visible subjects matter for this analysis?" />
    <h3 className={styles.editorHeading}>Refine by item type</h3>
    <div className={styles.segmentedControls} aria-label="Item type">
      {groups.map(item => <button key={item.key} type="button" aria-pressed={group === item.key} onClick={() => setGroup(item.key)}>{item.label}</button>)}
    </div>
    <InstructionFields value={profile.groups[group]} positiveLabel={`Include ${groups.find(item => item.key === group)?.label.toLowerCase()}`}
      negativeLabel="Exclude" positivePlaceholder="Details to identify in this group" negativePlaceholder="Items or details to leave out"
      onChange={instructions => onChange({ ...profile, groups: { ...profile.groups, [group]: instructions } })} />
  </>;
}
