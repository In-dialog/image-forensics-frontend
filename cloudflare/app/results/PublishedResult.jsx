'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ResultViewer from '@/features/results/components/ResultViewer';
import { usePublishedDatasets } from '../../lib/usePublishedDatasets';

export default function PublishedResult({ datasetId }) {
  const searchParams = useSearchParams();
  const id = datasetId || searchParams.get('dataset');
  const { datasets, loading, error } = usePublishedDatasets();
  if (loading) return <main><p role="status">Loading saved result...</p></main>;
  if (error) return <main><p role="alert">Could not load the saved results.</p><Link href="/results/">Return to datasets</Link></main>;
  const dataset = datasets.find(item => item.id === id);
  if (!dataset) return <main><p>This dataset is no longer available.</p><Link href="/results/">Return to datasets</Link></main>;
  return <ResultViewer key={dataset.id} dataset={dataset} availableFiles={dataset.availableFiles} />;
}
