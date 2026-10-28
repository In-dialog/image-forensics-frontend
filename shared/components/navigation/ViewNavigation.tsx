"use client";

import type { CSSProperties } from 'react';
import { NavigationIcon, type NavigationIconName } from './NavigationIcon';
import styles from './navigation.module.css';

type ViewOption = { id: string; label: string; icon: NavigationIconName };

export function ViewNavigation({ label, options, value, onChange, framed = false }: {
  label: string; options: readonly ViewOption[]; value: string;
  onChange: (value: string) => void; framed?: boolean;
}) {
  return <div className={`${styles.views} ${framed ? styles.framed : ''}`} role="group" aria-label={label}
    style={{ '--view-count': options.length } as CSSProperties}>
    {options.map(option => <button key={option.id} type="button" className={styles.item}
      aria-pressed={value === option.id} onClick={() => onChange(option.id)}>
      <NavigationIcon name={option.icon} /><span>{option.label}</span>
    </button>)}
  </div>;
}
