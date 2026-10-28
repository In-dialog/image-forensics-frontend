import { useEffect, useRef } from 'react';
import { useImageBasePath } from '../../context/ImageDataContext';
import { getResultItemImageUrl } from '../../config/dataSource';
import { resultItemLabel, resultParentLabel, resultItemGroup } from '../../lib/structuredResults';
import { RatingDetails } from './RatingDetails';
import { RatingVisuals } from './RatingVisuals';
import { ResultImage } from './ResultImage';
import styles from './semantics.module.css';
import graphics from './graphics.module.css';

export function ItemInspector({ item, document, onClose }) {
  const basePath = useImageBasePath();
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [item.name]);
  return <aside className={styles.inspector} aria-label="Item details">
    <header className={styles.inspectorHeader}>
      <div>{resultItemGroup(item) !== resultItemLabel(item) && <p>{resultItemGroup(item)}</p>}<h3 ref={heading} tabIndex={-1}>{resultItemLabel(item)}</h3></div>
      {onClose && <button type="button" className={styles.close} onClick={onClose} aria-label="Close item details" title="Close item details">×</button>}
    </header>
    {item.parent_name && <p className={styles.parent}>Part of {resultParentLabel(item, document.items)}</p>}
    <ResultImage src={getResultItemImageUrl(basePath, item)} alt={resultItemLabel(item)} className={styles.preview} />
    <RatingVisuals key={item.name} criteria={document.criteria} ratings={item.ratings} />
    <details className={graphics.tableDisclosure}><summary>All ranking evidence</summary><RatingDetails key={item.name} criteria={document.criteria} ratings={item.ratings} /></details>
  </aside>;
}
