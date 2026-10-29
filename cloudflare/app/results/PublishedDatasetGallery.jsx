'use client';

import DatasetGallery from '@/features/results/components/datasetGallery/DatasetGallery';
import { usePublishedDatasets } from '../../lib/usePublishedDatasets';

export default function PublishedDatasetGallery() {
  const state = usePublishedDatasets();
  return <DatasetGallery {...state} datasets={state.datasets.map(dataset => ({
    ...dataset, href: `/results/view/?dataset=${encodeURIComponent(dataset.id)}`,
  }))} />;
}
