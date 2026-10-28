import { useEffect, useRef } from 'react';
import { useImageBasePath } from '../../context/ImageDataContext';
import { getResultItemImageUrl } from '../../config/dataSource';
import { resultItemLabel, resultParentLabel } from '../../lib/structuredResults';
import { ResultImage } from './ResultImage';
import { ClusterPreview } from './ClusterPreview';
import styles from './semantics.module.css';

export function ClusterBrowser({ clusters, clusterId, onCluster, selectedName, onSelect, document }) {
  const basePath = useImageBasePath();
  const browser = useRef(null);
  const previousCluster = useRef(clusterId);
  useEffect(() => {
    if (previousCluster.current !== clusterId) browser.current?.querySelector('h3')?.focus({ preventScroll: true });
    previousCluster.current = clusterId;
  }, [clusterId]);
  const active = clusters.find(cluster => cluster.id === clusterId);
  if (active) return <div ref={browser} className={styles.browser}>
    <header className={styles.breadcrumb}>
      <button type="button" onClick={() => onCluster(null)}>← All clusters</button>
      <h3 tabIndex={-1}>{active.label}<span>{active.items.length} items</span></h3>
    </header>
    <p className={styles.groupDescription}>{active.description}</p>
    <div className={styles.itemGrid}>{active.items.map(item => <button type="button" key={item.name}
      className={styles.item} aria-pressed={selectedName === item.name} onClick={() => onSelect(item.name)}>
      <ResultImage src={getResultItemImageUrl(basePath, item)} alt="" className={styles.itemImage} />
      <span>{resultItemLabel(item)}</span>
      {item.parent_name && <small>Part of {resultParentLabel(item, document.items)}</small>}
    </button>)}</div>
    {!active.items.length && <p className={styles.state}>No items in this cluster match your search.</p>}
  </div>;
  const visible = clusters.filter(cluster => cluster.items.length);
  const total = visible.reduce((sum, cluster) => sum + cluster.items.length, 0);
  return <div ref={browser} className={styles.browser}>
    <div className={styles.clusterHeading}><h3 tabIndex={-1}>Clusters</h3><span>{visible.length} groups · {visible.reduce((sum, cluster) => sum + cluster.items.length, 0)} items</span></div>
    <div className={styles.clusterGrid}>{visible.map((cluster, index) => <ClusterPreview key={cluster.id} cluster={cluster}
      total={total} index={index} onSelect={item => onCluster(item.id)} />)}</div>
    {!visible.length && <p className={styles.state}>No items match these filters.</p>}
  </div>;
}
