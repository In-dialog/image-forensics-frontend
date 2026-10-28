import "server-only";

const DEFAULT_URL = "http://127.0.0.1:8766";
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

export class RequestError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function serviceUrl(path: string) {
  const base = new URL(process.env.ANALYSIS_API_URL || DEFAULT_URL);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname) || base.protocol !== 'http:') {
    throw new Error('ANALYSIS_API_URL must use a local HTTP address.');
  }
  return new URL(path, base);
}

/** All browser mutations go through the same-origin Next server. */
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return;
  try {
    const requestUrl = new URL(request.url);
    const host = request.headers.get('host');
    if (!['http:', 'https:'].includes(requestUrl.protocol) || (host && /[\\/@?#\s]/.test(host))) throw new Error();
    // Next may normalize request.url to localhost even when the browser used
    // 127.0.0.1. Host retains the actual address the browser requested.
    const expected = host ? new URL(`${requestUrl.protocol}//${host}`).origin : requestUrl.origin;
    if (origin === expected) return;
  } catch { /* Malformed origins/hosts fail the same check as foreign origins. */ }
  throw new RequestError('This request must come from this application.', 403);
}

export async function readBody(request: Request, maximum: number): Promise<Uint8Array> {
  if (Number(request.headers.get('content-length')) > maximum) {
    throw new RequestError('The request is too large.', 413);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError('A request body is required.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximum) {
        await reader.cancel();
        throw new RequestError('The request is too large.', 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}

export async function forwardJson(request: Request, path: string) {
  return guarded(async () => {
    requireSameOrigin(request);
    const body = new TextDecoder().decode(await readBody(request, 1024 * 1024));
    try { JSON.parse(body); } catch { throw new RequestError('Invalid JSON request.'); }
    return proxyAnalysis(path, {method: request.method, body, headers: {'Content-Type': 'application/json'}});
  });
}

export async function proxyAnalysis(path: string, options: RequestInit = {}): Promise<Response> {
  try {
    const response = await fetch(serviceUrl(path), {
      ...options, cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
    const payload = await response.json();
    return Response.json(payload, {
      status: response.status, headers: {'Cache-Control': 'no-store'},
    });
  } catch {
    return Response.json({error: 'The analysis backend is unavailable. Start it on this computer, or open the setup guide, then retry.'}, {status: 503});
  }
}

export async function guarded(operation: () => Promise<Response>): Promise<Response> {
  try { return await operation(); }
  catch (error) {
    return Response.json({error: error instanceof RequestError ? error.message : 'The request could not be processed.'},
      {status: error instanceof RequestError ? error.status : 500});
  }
}
