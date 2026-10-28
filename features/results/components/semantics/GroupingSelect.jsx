export function GroupingSelect({ id, criteria, value, onChange }) {
  return <select id={id} value={value} onChange={event => onChange(event.target.value)}>
    <option value="similarity">Similar rankings</option>
    <option value="category">Object category</option>
    <optgroup label="Ranking criteria">{criteria.map(criterion =>
      <option key={criterion.id} value={`criterion:${criterion.id}`}>{criterion.label}</option>)}</optgroup>
  </select>;
}
