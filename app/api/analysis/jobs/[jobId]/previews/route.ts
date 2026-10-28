import { proxyAnalysis } from '@/server/analysis/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, {params}: {params: Promise<{jobId: string}>}) {
  const {jobId} = await params;
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(jobId)) return Response.json({error: 'Invalid analysis ID.'}, {status: 400});
  return proxyAnalysis(`/jobs/${encodeURIComponent(jobId)}/previews`);
}
