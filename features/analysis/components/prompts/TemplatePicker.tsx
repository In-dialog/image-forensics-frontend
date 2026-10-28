import { useEffect, useId, useRef, useState } from 'react';
import type { EditorTemplate } from '../../promptTemplates';
import { EditorIcon } from './EditorIcon';
import styles from './promptEditor.module.css';

export function TemplatePicker<T>({ templates, label, buttonLabel, disabled, onAdd }: {
  templates: EditorTemplate<T>[]; label: string; buttonLabel: string; disabled: boolean; onAdd: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  function add(value: T) { setOpen(false); onAdd(value); }
  return <div ref={root} className={styles.templatePicker}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
    onKeyDown={event => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
      if (!open && event.key === 'ArrowDown' && !disabled) { event.preventDefault(); setOpen(true); }
      else if (open && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const items = [...(root.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') || [])];
        const current = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
          : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items[next]?.focus();
      }
    }}>
    <div className={styles.addControls}>
      <button type="button" className={styles.addButton} disabled={disabled} onClick={() => add(templates[0].value)}><EditorIcon name="add" />{buttonLabel}</button>
      <button ref={trigger} type="button" className={styles.templateToggle} aria-label={label} title={label}
        aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} disabled={disabled} onClick={() => setOpen(value => !value)}><EditorIcon name="down" /></button>
    </div>
    {open && <div id={menuId} role="menu" aria-label={label} className={styles.templateMenu}>
      <span className={styles.menuHeading}>Templates</span>
      {templates.slice(1).map(template => <button key={template.name} type="button" role="menuitem" tabIndex={-1} disabled={disabled}
        onClick={() => add(template.value)}><EditorIcon name="add" />{template.name}</button>)}
    </div>}
  </div>;
}
