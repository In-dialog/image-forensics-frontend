import PublishedResult from '../PublishedResult';
import { Suspense } from 'react';
import { readCatalog } from '../../../lib/catalog';

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await readCatalog()).map(({ id }) => ({ datasetId: id }));
}

export default async function PublishedResultPage({ params }: { params: Promise<{ datasetId: string }> }) {
  const { datasetId } = await params;
  return <Suspense fallback={<p role="status">Loading saved result...</p>}><PublishedResult datasetId={datasetId} /></Suspense>;
}
