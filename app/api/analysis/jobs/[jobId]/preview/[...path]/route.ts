import { serviceUrl } from '@/server/analysis/client';
import { requestBackend } from '@/server/analysis/backend-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, {params}: {params: Promise<{jobId: string; path: string[]}>}) {
  const {jobId, path} = await params;
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(jobId) || !path.length || path.some(part => !part || part.startsWith('.') || /[\\/:\x00-\x1f]/.test(part))) {
    return Response.json({error: 'Invalid preview path.'}, {status: 400});
  }
  try {
    const response = await requestBackend(serviceUrl(`/jobs/${encodeURIComponent(jobId)}/preview/${path.map(encodeURIComponent).join('/')}`), {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok || response.headers.get('content-type') !== 'image/webp') {
      await response.body?.cancel().catch(() => undefined);
      return Response.json({error: response.ok ? 'Invalid preview response.' : 'Preview is not ready.'}, {status: response.ok ? 502 : response.status});
    }
    return new Response(response.body, {headers: {'Content-Type': 'image/webp', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'}});
  } catch { return Response.json({error: 'Preview service is unavailable.'}, {status: 503}); }
}
