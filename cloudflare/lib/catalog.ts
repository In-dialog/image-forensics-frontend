import 'server-only';
import type { Dataset } from '@/features/results/types';
import catalog from '../generated/catalog.json';

type PublishedDataset = Dataset & { availableFiles: string[] };

/** Build-time only. The exported website reads images/JSON directly from /data. */
export async function readCatalog(): Promise<PublishedDataset[]> {
  return catalog;
}
