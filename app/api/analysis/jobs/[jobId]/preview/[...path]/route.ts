import { serviceUrl } from '@/server/analysis/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, {params}: {params: Promise<{jobId: string; path: string[]}>}) {
  const {jobId, path} = await params;
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(jobId) || !path.length || path.some(part => !part || part.startsWith('.') || /[\\/:\x00-\x1f]/.test(part))) {
    return Response.json({error: 'Invalid preview path.'}, {status: 400});
  }
  try {
    const response = await fetch(serviceUrl(`/jobs/${encodeURIComponent(jobId)}/preview/${path.map(encodeURIComponent).join('/')}`), {
      cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return Response.json({error: 'Preview is not ready.'}, {status: response.status});
    if (response.headers.get('content-type') !== 'image/webp') return Response.json({error: 'Invalid preview response.'}, {status: 502});
    return new Response(response.body, {headers: {'Content-Type': 'image/webp', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'}});
  } catch { return Response.json({error: 'Preview service is unavailable.'}, {status: 503}); }
}
