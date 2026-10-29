import PublishedResult from '../PublishedResult';
import { Suspense } from 'react';

export default function PublishedResultPage() {
  return <Suspense fallback={<p role="status">Loading saved result...</p>}><PublishedResult datasetId={null} /></Suspense>;
}
