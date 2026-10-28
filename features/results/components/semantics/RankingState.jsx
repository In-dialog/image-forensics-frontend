import styles from './semantics.module.css';

export function RankingState({ loading, missing, error }) {
  return <p className={styles.state} role="status">{loading ? 'Loading rankings…' : missing ? 'Rankings were not included in this analysis.'
    : error ? 'Could not load rankings.' : 'Invalid ranking data.'}</p>;
}
