import { guarded, MAX_IMAGE_BYTES, proxyAnalysis, readBody, RequestError, requireSameOrigin } from '@/server/analysis/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function POST(request: Request) {
  return guarded(async () => {
    requireSameOrigin(request);
    const bytes = await readBody(request, MAX_IMAGE_BYTES + 65536);
    let form: FormData;
    try {
      form = await new Response(Buffer.from(bytes), {headers: {'Content-Type': request.headers.get('content-type') || ''}}).formData();
    } catch { throw new RequestError('Choose an image to upload.'); }
    const image = form.get('image');
    if (!(image instanceof File) || image.size === 0) throw new RequestError('Choose an image to upload.');
    if (image.size > MAX_IMAGE_BYTES) throw new RequestError('Choose an image smaller than 20 MB.', 413);
    return proxyAnalysis('/uploads', {
      method: 'POST', body: await image.arrayBuffer(),
      headers: {'Content-Type': 'application/octet-stream', 'X-Filename': encodeURIComponent(image.name)},
    });
  });
}
