import { useMemo, useState } from 'react';
import { filterRankingItems, resultGroups } from '../../lib/structuredResults';
import { clusterRankings } from '../../lib/rankingClusters';
import { ClusterBrowser } from './ClusterBrowser';
import { RankingTable } from './RankingTable';
import { ItemBrowserControls } from './ItemBrowserControls';
import styles from './semantics.module.css';
import graphics from './graphics.module.css';

export function ItemBrowser({ document, selectedName, onSelect }) {
  const [view, setView] = useState('rankings');
  const [clusterId, setClusterId] = useState(null);
  const [values, setValues] = useState({ grouping: 'similarity', count: 'auto',
    criterionId: document.criteria.length > 3 ? document.criteria[0].id : '',
    query: '', source: 'all', category: '', order: 'original' });
  const { grouping, count, criterionId, query, source, category, order } = values;
  const groups = useMemo(() => resultGroups(document), [document]);
  const candidates = useMemo(() => filterRankingItems(document, { source, group: category }), [document, source, category]);
  const filtered = useMemo(() => filterRankingItems(document, { query, source, group: category, criterionId, order }), [document, query, source, category, criterionId, order]);
  const clusters = useMemo(() => clusterRankings(document, { mode: grouping, count, items: candidates }), [document, grouping, count, candidates]);
  const visibleNames = useMemo(() => new Set(filtered.map(item => item.name)), [filtered]);
  const visibleClusters = useMemo(() => clusters.map(cluster => ({ ...cluster, items: cluster.items.filter(item => visibleNames.has(item.name)) })), [clusters, visibleNames]);
  const criteria = criterionId ? document.criteria.filter(criterion => criterion.id === criterionId) : document.criteria;
  function chooseCluster(id) { setClusterId(id); onSelect(null); }
  function changeControls(changes) {
    setValues(previous => ({ ...previous, ...changes }));
    if (['source', 'category', 'grouping', 'count'].some(key => Object.hasOwn(changes, key))) chooseCluster(null);
  }

  return <section className={graphics.expandedBrowser} aria-label="Item browser">
    <ItemBrowserControls view={view} onViewChange={setView} criteria={document.criteria} groups={groups}
      values={values} onChange={changeControls} count={filtered.length} total={document.items.length} />
    <div className={styles.workspace}>
      <div className={styles.exploration}>
        {!document.items.length ? <p className={styles.state}>No ranked items were saved.</p>
          : view === 'clusters' ? <ClusterBrowser clusters={visibleClusters} clusterId={clusterId} onCluster={chooseCluster}
            selectedName={selectedName} onSelect={onSelect} document={document} />
          : <RankingTable items={filtered} criteria={criteria} document={document} selectedName={selectedName} onSelect={onSelect} />}
      </div>
    </div>
  </section>;
}
