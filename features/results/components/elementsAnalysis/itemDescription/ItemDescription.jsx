"use client";

import { useState } from "react";
import { useSemanticInteraction } from "../layout/SemanticInteractionContext";
import { useDescriptions } from "./DescriptionContext";
import { descriptionSections, resultItemLabel, resultParentLabel, resolveDescriptorSelection } from "@/features/results/lib/structuredResults";
import { getResultItemImageUrl } from "@/features/results/config/dataSource";
import PoseView from "../poseView/PoseView";
import "./ItemDescription.css";

function DescriptionSections({ sections, bullets }) {
  const [requested, setSelected] = useState(sections.length > 3 ? sections[0].id : '');
  const selected = resolveDescriptorSelection(sections, requested);
  const visible = selected === '' || sections.length <= 3 ? sections : sections.filter(section => section.id === selected);
  return <>
    {sections.length > 3 && <label className="item-description__selector">Question
      <select aria-label="Question" value={selected} onChange={event => setSelected(event.target.value)}>
        <option value="">All questions ({sections.length})</option>
        {sections.map(({ id, sectionName }) => <option key={id} value={id}>{sectionName}</option>)}
      </select>
    </label>}
    {visible.map(({ id, sectionName, entries }) => <div key={id} className="item-description__category">
      <h3 className="item-description__section-title"><span>{sectionName}</span></h3>
      <div className="item-description__answer">
        {bullets && entries.length > 1 ? <ul>{entries.map((field, i) => <li key={i}>{field.value}</li>)}</ul>
          : entries.map((field, i) => <p key={i}>{field.value}</p>)}
      </div>
    </div>)}
  </>;
}

function StructuredDescription({ document, parentName, basePath }) {
  const items = Array.isArray(document.items) ? document.items.filter(item => item && (item.name === parentName || item.parent_name === parentName)) : [];
  const [selectedName, setSelectedName] = useState(parentName);
  const item = items.find(value => value.name === selectedName) ?? items[0];
  const sections = item ? descriptionSections(document, item.name) ?? [] : [];
  return <div className="item-description item-description--structured">
    {items.length > 1 && <label className="item-description__selector">Item or part
      <select aria-label="Item or part" value={item?.name || ''} onChange={event => setSelectedName(event.target.value)}>
        {items.map(value => <option key={value.name} value={value.name}>{value.source === 'part' ? 'Part: ' : 'Whole item: '}{resultItemLabel(value)}</option>)}
      </select>
    </label>}
    {item?.source === 'part' && <div className="item-description__part">
      <img src={getResultItemImageUrl(basePath, item)} alt={resultItemLabel(item)} />
      <span>Part of {resultParentLabel(item, document.items)}</span>
    </div>}
    {sections.length ? <DescriptionSections key={item.name} sections={sections} bullets={document.style === 'bullets'} />
      : <p className="item-description__placeholder">No description available</p>}
    {item && item.source !== 'part' && <PoseView />}
  </div>;
}

/** Current structured descriptions for the selected extract and its parts. */
export function ItemDescriptionTop() {
  const { document, basePath, loading, error, missing } = useDescriptions();
  const selectedKey = useSemanticInteraction()?.selectedKey ?? null;
  if (document && selectedKey) return <StructuredDescription key={selectedKey} document={document} parentName={selectedKey} basePath={basePath} />;
  const message = !selectedKey ? 'Select an item to see description' : loading ? 'Loading description...'
    : missing ? 'Descriptions were not included in this analysis.' : error ? 'Could not load descriptions.' : 'Invalid description data.';
  return <div className="item-description"><p className="item-description__placeholder">{message}</p></div>;
}
