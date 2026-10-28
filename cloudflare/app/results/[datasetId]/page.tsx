import { notFound } from 'next/navigation';
import ResultViewer from '@/features/results/components/ResultViewer';
import { readCatalog } from '../../../lib/catalog';

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await readCatalog()).map(({ id }) => ({ datasetId: id }));
}

export default async function PublishedResultPage({ params }: { params: Promise<{ datasetId: string }> }) {
  const { datasetId } = await params;
  const dataset = (await readCatalog()).find(item => item.id === datasetId);
  if (!dataset) notFound();
  return <ResultViewer dataset={dataset} availableFiles={dataset.availableFiles} />;
}
