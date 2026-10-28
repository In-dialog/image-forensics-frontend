"use client";

import { useId, useRef, useState } from 'react';
import { ViewNavigation } from '@/shared/components/navigation/ViewNavigation';
import { GroupingSelect } from './GroupingSelect';
import styles from './itemBrowserControls.module.css';

const views = [
  { id: 'clusters', label: 'Clusters', icon: 'clusters' },
  { id: 'rankings', label: 'Rankings', icon: 'rankings' },
];
const sourceLabels = { all: 'Items and parts', item: 'Whole items', part: 'Parts only' };

function ControlIcon({ name }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {name === 'search' ? <><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></>
      : name === 'filters' ? <><path d="M3 6h18M3 12h18M3 18h18M8 3v6m8 0v6M7 15v6" /></>
      : name === 'reset' ? <><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6" /></>
      : <path d="m7 7 10 10M7 17 17 7" />}
  </svg>;
}

export function ItemBrowserControls({ view, onViewChange, criteria, groups, values, onChange, count, total }) {
  const id = useId();
  const searchInput = useRef(null);
  const filterButton = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const criterion = criteria.find(item => item.id === values.criterionId);
  const showGroupCount = view === 'clusters' && values.grouping === 'similarity';
  const showOrder = view === 'rankings' && Boolean(criterion);
  const filterCount = Number(values.source !== 'all') + Number(Boolean(values.category));
  const activeFilters = [
    ...(values.source !== 'all' ? [{ key: 'source', label: sourceLabels[values.source], clear: { source: 'all' } }] : []),
    ...(values.category ? [{ key: 'category', label: `Category: ${values.category}`, clear: { category: '' } }] : []),
  ];
  function clearFilter(changes) {
    onChange(changes);
    filterButton.current?.focus();
  }
  return <div className={styles.toolbar}>
    <div className={styles.viewSettings} role="group" aria-label="View settings" data-extra={showGroupCount || showOrder}>
      <div className={styles.viewPicker}>
        <span className={styles.label}>View</span>
        <ViewNavigation label="Browse as" options={views} value={view} onChange={onViewChange} />
      </div>
      <div className={styles.field}>
        <label htmlFor={`${id}-dimension`}>{view === 'clusters' ? 'Group by' : 'Ranking criterion'}</label>
        {view === 'clusters'
          ? <GroupingSelect id={`${id}-dimension`} criteria={criteria} value={values.grouping} onChange={grouping => onChange({ grouping })} />
          : <select id={`${id}-dimension`} value={values.criterionId} onChange={event => onChange({ criterionId: event.target.value, order: 'original' })}>
            <option value="">All criteria ({criteria.length})</option>
            {criteria.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>}
      </div>
      {showGroupCount && <div className={styles.field}>
        <label htmlFor={`${id}-count`}>Number of groups</label>
        <select id={`${id}-count`} value={values.count} onChange={event => onChange({ count: event.target.value })}>
          <option value="auto">Automatic</option>{[2, 3, 4, 5, 6, 7, 8].map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>}
      {showOrder && <div className={styles.field}>
        <label htmlFor={`${id}-order`}>Sort order</label>
        <select id={`${id}-order`} value={values.order} onChange={event => onChange({ order: event.target.value })}>
          <option value="original">Image order</option>
          <option value="descending">{criterion.type === 'score' ? 'Highest first' : criterion.type === 'boolean' ? 'Yes first' : 'Reverse choice order'}</option>
          <option value="ascending">{criterion.type === 'score' ? 'Lowest first' : criterion.type === 'boolean' ? 'No first' : 'Defined choice order'}</option>
        </select>
      </div>}
    </div>
    <div className={styles.narrowing}>
      <div className={styles.searchActions}>
        <div className={styles.field}>
          <label htmlFor={`${id}-search`}>Find item</label>
          <div className={styles.search}>
            <ControlIcon name="search" />
            <input ref={searchInput} id={`${id}-search`} type="search" value={values.query} placeholder="Search…"
              onChange={event => onChange({ query: event.target.value })}
              onKeyDown={event => { if (event.key === 'Escape' && values.query) { event.preventDefault(); onChange({ query: '' }); } }} />
            {values.query && <button type="button" aria-label="Clear search" title="Clear search"
              onClick={() => { onChange({ query: '' }); searchInput.current?.focus(); }}><ControlIcon name="close" /></button>}
          </div>
        </div>
        <button ref={filterButton} type="button" className={styles.filterToggle} aria-expanded={expanded} aria-controls={`${id}-filters`}
          onClick={() => setExpanded(value => !value)}>
          <ControlIcon name="filters" /><span>Filters</span>{filterCount > 0 && <span className={styles.badge}>{filterCount}</span>}
          <svg className={styles.chevron} width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" aria-hidden="true"><path d="m3 4.5 3 3 3-3" /></svg>
        </button>
      </div>
      {expanded && <div className={styles.filters} id={`${id}-filters`} role="group" aria-label="Item filters">
        <div className={styles.field}>
          <label htmlFor={`${id}-type`}>Item type</label>
          <select id={`${id}-type`} value={values.source} onChange={event => onChange({ source: event.target.value })}>
            {Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-category`}>Category</label>
          <select id={`${id}-category`} value={values.category} onChange={event => onChange({ category: event.target.value })}>
            <option value="">All categories</option>{groups.map(group => <option key={group} value={group}>{group}</option>)}
          </select>
        </div>
      </div>}
    </div>
    <div className={styles.resultsSummary}>
      <p className={styles.resultCount} role="status"><strong>{count}</strong>{' '}<span>{count === total ? 'items' : `of ${total} items`}</span></p>
      {activeFilters.length > 0 && <>
        <div className={styles.activeFilters} role="group" aria-label="Active filters">
          {activeFilters.map(filter => <button type="button" key={filter.key} aria-label={`Remove ${filter.label} filter`}
            onClick={() => clearFilter(filter.clear)}><span>{filter.label}</span><ControlIcon name="close" /></button>)}
        </div>
        <button type="button" className={styles.clearFilters} onClick={() => clearFilter({ source: 'all', category: '' })}>
          <ControlIcon name="reset" />Clear filters
        </button>
      </>}
    </div>
  </div>;
}
