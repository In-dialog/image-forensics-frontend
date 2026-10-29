import PublishedResult from '../PublishedResult';
import { readCatalog } from '../../../lib/catalog';

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await readCatalog()).map(({ id }) => ({ datasetId: id }));
}

export default async function PublishedResultPage({ params }: { params: Promise<{ datasetId: string }> }) {
  const { datasetId } = await params;
  return <PublishedResult datasetId={datasetId} />;
}
