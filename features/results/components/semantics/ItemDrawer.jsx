import { useEffect, useRef } from 'react';
import { ItemInspector } from './ItemInspector';
import styles from './graphics.module.css';

export function ItemDrawer({ item, document, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = window.document.activeElement;
    element.showModal();
    return () => { element.close(); previous?.focus(); };
  }, []);
  return <dialog ref={dialog} className={styles.drawer} aria-label="Item analysis" onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}>
    <ItemInspector item={item} document={document} onClose={onClose} />
  </dialog>;
}
