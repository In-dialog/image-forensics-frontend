import { guarded, requireSameOrigin } from '@/server/analysis/client';
import { importResult } from '@/server/analysis/import-result';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request, {params}: {params: Promise<{jobId: string}>}) {
  return guarded(async () => {
    requireSameOrigin(request);
    const {jobId} = await params;
    return Response.json(await importResult(jobId));
  });
}
