import { notFound } from "next/navigation";
import { getDataset, getDatasetAvailableFiles } from "@/features/results/server/dataset-repository";
import ResultViewer from "@/features/results/components/ResultViewer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ResultPage({ params }: { params: Promise<{ datasetId: string }> }) {
  const { datasetId } = await params;
  const dataset = await getDataset(datasetId);
  if (!dataset) notFound();
  const availableFiles = await getDatasetAvailableFiles(datasetId);
  if (!availableFiles) notFound();
  return <ResultViewer key={dataset.id} dataset={dataset} availableFiles={availableFiles} />;
}
