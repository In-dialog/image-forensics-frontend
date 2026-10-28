"use client";

import { ViewNavigation } from '@/shared/components/navigation/ViewNavigation';
import './Toolbar.css';

const VIEW_3_COLUMNS = 'columns';
const VIEW_CANVAS = 'canvas';
const VIEW_SEMANTICS = 'semantics';
const VIEW_MODELER = 'modeler';
const VIEW_OPTIONS = [
  { id: VIEW_3_COLUMNS, label: 'Composition', icon: 'composition' },
  { id: VIEW_CANVAS, label: 'Elements', icon: 'elements' },
  { id: VIEW_SEMANTICS, label: 'Semantics', icon: 'semantics' },
  { id: VIEW_MODELER, label: 'Validation', icon: 'validation' },
];

/** @param {{ viewMode: string, onViewModeChange: (view: string) => void }} props */
export default function Toolbar({ viewMode, onViewModeChange }) {
  return <div className="toolbar">
    <ViewNavigation label="Image views" options={VIEW_OPTIONS} value={viewMode} onChange={onViewModeChange} framed />
  </div>;
}

export { VIEW_3_COLUMNS, VIEW_CANVAS, VIEW_SEMANTICS, VIEW_MODELER };
