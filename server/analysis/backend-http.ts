import "server-only";

import { request } from 'node:http';
import { Readable } from 'node:stream';

export type BackendRequestOptions = {
  method?: string;
  headers?: HeadersInit;
  body?: string | ArrayBuffer | Uint8Array;
  signal?: AbortSignal;
};

/**
 * The Python API closes each HTTP/1.0 response. Node 24's bundled Undici can
 * assert in Parser.finish when that close races a paused download or preview
 * (nodejs/undici#5360). Native HTTP streams handle this without that parser.
 */
export async function requestBackend(url: URL, options: BackendRequestOptions = {}): Promise<Response> {
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
    throw new Error('The analysis backend must use a local HTTP address.');
  }
  const headers = new Headers(options.headers);
  const body = options.body === undefined ? undefined
    : typeof options.body === 'string' ? Buffer.from(options.body, 'utf8') : Buffer.from(new Uint8Array(options.body));
  // The Python API requires Content-Length for uploads and JSON mutations.
  if (body !== undefined) headers.set('content-length', String(body.byteLength));

  return new Promise((resolve, reject) => {
    const outgoing = request(url, {
      method: options.method || 'GET', headers: Object.fromEntries(headers),
      signal: options.signal, agent: false,
    }, incoming => {
      const responseHeaders = new Headers();
      for (let index = 0; index < incoming.rawHeaders.length; index += 2) {
        responseHeaders.append(incoming.rawHeaders[index], incoming.rawHeaders[index + 1]);
      }
      const status = incoming.statusCode || 502;
      const noBody = options.method?.toUpperCase() === 'HEAD' || [204, 205, 304].includes(status);
      const stream = Readable.toWeb(incoming, {
        strategy: {highWaterMark: incoming.readableHighWaterMark, size: chunk => chunk.byteLength},
      }) as ReadableStream<Uint8Array>;
      try {
        const response = new Response(noBody ? null : stream, {status, headers: responseHeaders});
        if (noBody) void stream.cancel().catch(() => undefined);
        resolve(response);
      } catch (error) {
        void stream.cancel().catch(() => undefined);
        reject(error);
      }
    });
    outgoing.once('error', reject);
    outgoing.end(body);
  });
}
