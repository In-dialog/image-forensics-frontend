import { useEffect, useMemo, useRef, useState } from 'react';
import { useImageBasePath } from '../../context/ImageDataContext';
import { getFullImageUrl, getRankingsUrl, getResultItemImageUrl } from '../../config/dataSource';
import { useFetchJson } from '../../lib/useFetchJson';
import { readRankingDocument, resultItemLabel } from '../../lib/structuredResults';
import { clusterRankings } from '../../lib/rankingClusters';
import { ResultImage } from './ResultImage';
import { RatingVisuals } from './RatingVisuals';
import { RankingState } from './RankingState';
import { PyramidChart } from './charts/PyramidChart';
import { DistributionChart } from './charts/DistributionChart';
import { ClusterOverview } from './ClusterOverview';
import { ItemDrawer } from './ItemDrawer';
import { ItemBrowser } from './ItemBrowser';
import styles from './graphics.module.css';

export function SemanticOverview({ document, status }) {
  const basePath = useImageBasePath();
  const result = useFetchJson(getRankingsUrl(basePath, 'full_image'));
  const full = useMemo(() => readRankingDocument(result.data), [result.data]);
  const [grouping, setGrouping] = useState('similarity');
  const [selection, setSelection] = useState(null);
  const [selectedName, setSelectedName] = useState(null);
  const members = useRef(null);
  useEffect(() => { if (selection) members.current?.scrollIntoView({ block: 'nearest' }); }, [selection]);
  const clusters = useMemo(() => document ? clusterRankings(document, { mode: grouping }) : [], [document, grouping]);
  const selected = document?.items.find(item => item.name === selectedName);
  const highlighted = useMemo(() => selection ? new Set(selection.items.map(item => item.name)) : null, [selection]);
  const ratings = full?.scope === 'full_image' ? full.items[0]?.ratings : null;
  return <div className={styles.overview}>
    <div className={styles.overviewHero}>
      <figure className={styles.scene}><ResultImage src={getFullImageUrl(basePath)} alt="Full analyzed image" />
        <figcaption>Scene <span>{document ? `${document.items.length} ranked items` : 'Whole image'}</span></figcaption></figure>
      <section className={styles.sceneRatings} aria-label="Whole-image ratings">
        {ratings ? <RatingVisuals criteria={full.criteria} ratings={ratings} /> : full?.scope === 'full_image'
          ? <p className={styles.chartEmpty}>No whole-image ratings were saved.</p> : <RankingState {...result} />}
      </section>
    </div>
    {document ? document.items.length > 0 ? <>
      <div className={styles.insightGrid}>
        <PyramidChart document={document} selectedName={selectedName} highlightedNames={highlighted} onSelect={setSelectedName} />
        <DistributionChart document={document} onSelectItems={setSelection} />
        <ClusterOverview clusters={clusters} total={document.items.length} selectedId={selection?.id} onSelect={cluster => setSelection(current => current?.id === cluster.id ? null : cluster)}
          grouping={grouping} onGrouping={value => { setGrouping(value); setSelection(null); }} criteria={document.criteria} />
      </div>
      {selection && <section ref={members} className={styles.selectedMembers} aria-label="Selected group items">
        <header className={styles.chartHeader}><h3>{selection.label || 'Selected items'} <span>{selection.items.length} items</span></h3>
          <button type="button" className={styles.textAction} onClick={() => setSelection(null)}>Clear selection ×</button></header>
        <div className={styles.memberStrip}>{selection.items.map(item => <button type="button" key={item.name} onClick={() => setSelectedName(item.name)}>
          <ResultImage src={getResultItemImageUrl(basePath, item)} alt="" /><span>{resultItemLabel(item)}</span>
        </button>)}</div>
      </section>}
    </> : <p className={styles.chartEmpty}>No ranked items were saved.</p> : <RankingState {...status} />}
    {document && <details className={styles.browserDisclosure}><summary>Explore items & rankings</summary>
      <ItemBrowser document={document} selectedName={selectedName} onSelect={setSelectedName} /></details>}
    {selected && <ItemDrawer item={selected} document={document} onClose={() => setSelectedName(null)} />}
  </div>;
}
