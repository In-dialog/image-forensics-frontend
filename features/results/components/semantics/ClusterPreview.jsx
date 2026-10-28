import { useImageBasePath } from '../../context/ImageDataContext';
import { getResultItemImageUrl } from '../../config/dataSource';
import { CHART_COLORS, hatchBackground } from '../../lib/semanticCharts';
import { ResultImage } from './ResultImage';
import styles from './clusterPreview.module.css';

/** Shared cluster entry for the overview list and the expanded browser. */
export function ClusterPreview({ cluster, total, index = 0, selected, onSelect }) {
  const basePath = useImageBasePath();
  const share = total > 0 ? cluster.items.length / total * 100 : 0;
  return <div className={styles.container}>
    <button type="button" className={styles.card} aria-pressed={selected}
      aria-label={`Open ${cluster.label}, ${cluster.items.length} items`} onClick={() => onSelect(cluster)}
      style={{ '--cluster-color': CHART_COLORS[index % CHART_COLORS.length] }}>
      <span className={styles.previews} aria-hidden="true">{cluster.items.slice(0, 3).map(item =>
        <ResultImage key={item.name} src={getResultItemImageUrl(basePath, item)} alt="" />)}</span>
      <span className={styles.summary}><strong>{cluster.label}</strong><span>{cluster.description}</span></span>
      <span className={styles.metrics}><strong>{Math.round(share)}%</strong><small>{cluster.items.length} items</small></span>
      <span className={styles.share} aria-hidden="true"><i style={{ width: `${share}%`, backgroundImage: hatchBackground(index) }} /></span>
    </button>
  </div>;
}
