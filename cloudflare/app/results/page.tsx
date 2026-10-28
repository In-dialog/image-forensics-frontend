import DatasetGallery from '@/features/results/components/datasetGallery/DatasetGallery';
import { readCatalog } from '../../lib/catalog';

export default async function PublishedResultsPage() {
  return <DatasetGallery datasets={await readCatalog()} />;
}
