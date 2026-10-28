import { ClusterPreview } from './ClusterPreview';
import { GroupingSelect } from './GroupingSelect';
import styles from './graphics.module.css';

export function ClusterOverview({ clusters, total, selectedId, onSelect, grouping, onGrouping, criteria }) {
  return <section className={styles.clusterOverview} aria-label="Semantic clusters">
    <header className={styles.chartHeader}><h3>Clusters</h3><span>{clusters.length} groups</span></header>
    <label className={styles.dimensionSelect}><span>Group by</span><GroupingSelect criteria={criteria} value={grouping} onChange={onGrouping} /></label>
    <div className={styles.clusterRows}>{clusters.map((cluster, index) => <ClusterPreview key={cluster.id} cluster={cluster}
      index={index} total={total} selected={selectedId === cluster.id} onSelect={onSelect} />)}</div>
  </section>;
}
