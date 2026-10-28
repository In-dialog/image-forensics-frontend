import DatasetGallery from "@/features/results/components/datasetGallery/DatasetGallery";
import { listDatasets } from "@/features/results/server/dataset-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const datasets = await listDatasets();
  return <DatasetGallery datasets={datasets} />;
}
