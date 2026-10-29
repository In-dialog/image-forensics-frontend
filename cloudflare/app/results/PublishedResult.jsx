'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ResultViewer from '@/features/results/components/ResultViewer';
import { usePublishedDatasets } from '../../lib/usePublishedDatasets';

export default function PublishedResult({ datasetId }) {
  const [id, setId] = useState(datasetId);
  const { datasets, loading, error } = usePublishedDatasets();
  useEffect(() => { setId(datasetId || new URLSearchParams(window.location.search).get('dataset')); }, [datasetId]);
  if (loading) return <main><p role="status">Loading saved result...</p></main>;
  if (error) return <main><p role="alert">Could not load the saved results.</p><Link href="/results/">Return to datasets</Link></main>;
  const dataset = datasets.find(item => item.id === id);
  if (!dataset) return <main><p>This dataset is no longer available.</p><Link href="/results/">Return to datasets</Link></main>;
  return <ResultViewer key={dataset.id} dataset={dataset} availableFiles={dataset.availableFiles} />;
}
