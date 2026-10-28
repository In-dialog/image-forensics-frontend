import { useEffect, useRef, type ReactNode } from 'react';
import { EditorIcon } from './EditorIcon';
import styles from './promptEditor.module.css';

export function PromptCollection<T extends { label: string }>({ title, singular, label, items, selected, limit, onSelect,
  summary, addAction, actions, children }: {
  title: string; singular: string; label: string; items: T[]; selected: number; limit: number;
  onSelect: (index: number) => void; summary?: (item: T) => string;
  addAction: ReactNode; actions: ReactNode; children: ReactNode;
}) {
  const fields = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const previousCount = useRef(items.length);
  useEffect(() => {
    if (items.length > previousCount.current) {
      list.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest' });
      const titleInput = fields.current?.querySelector('input');
      titleInput?.focus();
      titleInput?.select();
    }
    previousCount.current = items.length;
  }, [items.length]);

  return <section className={styles.collection}>
    <header className={styles.collectionHeader}>
      <h3>{title}<span className={styles.count}>{items.length} / {limit}</span></h3>
      {addAction}
    </header>
    <div className={styles.workspace}>
      <div ref={list} className={styles.itemList} aria-label={label}>
        {items.map((item, index) => <button type="button" key={index} aria-pressed={selected === index} onClick={() => onSelect(index)}>
          <span className={styles.itemNumber}>{String(index + 1).padStart(2, '0')}</span>
          <span className={styles.itemText}><span>{item.label || `Untitled ${singular.toLowerCase()}`}</span>
            {summary && <small>{summary(item)}</small>}
          </span>
          <span className={styles.selectionMark}><EditorIcon name="next" /></span>
        </button>)}
      </div>
      {children && <div className={styles.detail}>
        <header className={styles.detailHeader}>
          <h4>{singular} <span>{String(selected + 1).padStart(2, '0')}</span></h4>
          {actions}
        </header>
        <div ref={fields} className={styles.fields}>{children}</div>
      </div>}
    </div>
  </section>;
}
