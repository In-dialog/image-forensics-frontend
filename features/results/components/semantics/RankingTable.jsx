import { useImageBasePath } from '../../context/ImageDataContext';
import { getResultItemImageUrl } from '../../config/dataSource';
import { formatRankingValue, resultItemLabel, resultParentLabel } from '../../lib/structuredResults';
import { ResultImage } from './ResultImage';
import styles from './semantics.module.css';

export function RankingTable({ items, criteria, document, selectedName, onSelect }) {
  const basePath = useImageBasePath();
  return <div className={styles.tableScroll}>
    {items.length ? <table className={styles.table}>
      <thead><tr><th scope="col">Item</th>{criteria.map(criterion => <th scope="col" key={criterion.id}>
        {criterion.label}{criterion.type === 'score' && <small>{criterion.min} to {criterion.max}</small>}
      </th>)}</tr></thead>
      <tbody>{items.map(item => <tr key={item.name} data-selected={selectedName === item.name}>
        <th scope="row"><button type="button" aria-pressed={selectedName === item.name} onClick={() => onSelect(item.name)}>
          <ResultImage src={getResultItemImageUrl(basePath, item)} alt="" className={styles.tableImage} />
          <span>{resultItemLabel(item)}{item.parent_name && <small>Part of {resultParentLabel(item, document.items)}</small>}</span>
        </button></th>
        {criteria.map(criterion => <td key={criterion.id} data-unknown={item.ratings[criterion.id].value === null}>
          {formatRankingValue(item.ratings[criterion.id].value)}
        </td>)}
      </tr>)}</tbody>
    </table> : <p className={styles.state}>No items match these filters.</p>}
  </div>;
}
