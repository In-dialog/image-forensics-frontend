import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { promises as fs } from 'node:fs';
import { createServer as createHttpServer } from 'node:http';
import { createServer } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const originalFetch = globalThis.fetch;
const originalDataRoot = process.env.ANALYSIS_DATA_DIR;
const originalServiceUrl = process.env.ANALYSIS_API_URL;
let temporaryRoot;
let requestBackend;
let importer;
let client;
let preview;

async function compile(sourcePath, filename) {
  const source = (await fs.readFile(new URL(sourcePath, import.meta.url), 'utf8'))
    .replace('import "server-only";', '')
    .replaceAll("'@/server/analysis/client'", "'./client.mjs'")
    .replaceAll("'@/server/analysis/backend-http'", "'./backend-http.mjs'")
    .replaceAll("'./client'", "'./client.mjs'")
    .replaceAll("'./backend-http'", "'./backend-http.mjs'");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022},
  });
  const destination = path.join(temporaryRoot, filename);
  await fs.writeFile(destination, outputText);
  return import(pathToFileURL(destination).href);
}

before(async () => {
  temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'backend-http-tests-'));
  // All requests in this suite must use native HTTP, including the route/importer.
  globalThis.fetch = () => { throw new Error('The backend must not use Undici fetch'); };
  ({ requestBackend } = await compile('../server/analysis/backend-http.ts', 'backend-http.mjs'));
  client = await compile('../server/analysis/client.ts', 'client.mjs');
  importer = await compile('../server/analysis/import-result.ts', 'import-result.mjs');
  preview = await compile('../app/api/analysis/jobs/[jobId]/preview/[...path]/route.ts', 'preview.mjs');
});

after(async () => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of [['ANALYSIS_DATA_DIR', originalDataRoot], ['ANALYSIS_API_URL', originalServiceUrl]]) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  if (temporaryRoot && path.dirname(temporaryRoot) === os.tmpdir() && path.basename(temporaryRoot).startsWith('backend-http-tests-')) {
    await fs.rm(temporaryRoot, {recursive: true, force: true});
  }
});

async function listen(t, server) {
  const sockets = new Set();
  server.on('connection', socket => {
    sockets.add(socket);
    socket.on('error', () => {});
    socket.once('close', () => sockets.delete(socket));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    const closed = new Promise(resolve => server.close(resolve));
    for (const socket of sockets) socket.destroy();
    await closed;
  });
  return new URL(`http://127.0.0.1:${server.address().port}`);
}

// Match the Python API: HTTP/1.0, Content-Length and immediate connection close.
function closedResponse(socket, body, {status = 200, type = 'application/octet-stream', length = body.length} = {}) {
  socket.end(Buffer.concat([
    Buffer.from(`HTTP/1.0 ${status} Response\r\nContent-Type: ${type}\r\nContent-Length: ${length}\r\n\r\n`), body,
  ]));
}

test('HTTP/1.0 downloads survive a closing socket with a paused consumer', {timeout: 10000}, async t => {
  const server = createServer(socket => socket.once('data', data => {
    const size = Number(data.toString().split(' ')[1].slice(1));
    closedResponse(socket, Buffer.alloc(size, 97));
  }));
  const origin = await listen(t, server);
  for (const size of [64 * 1024, 96 * 1024, 128 * 1024, 2 * 1024 * 1024]) {
    const response = await requestBackend(new URL(`/${size}`, origin));
    await delay(100); // Let FIN arrive while the body is backpressured.
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.alloc(size, 97));
  }
});

test('truncated responses reject the body read instead of crashing or succeeding', {timeout: 5000}, async t => {
  const origin = await listen(t, createServer(socket => socket.once('data', () => {
    closedResponse(socket, Buffer.alloc(96 * 1024, 97), {length: 128 * 1024});
  })));
  const response = await requestBackend(origin);
  await delay(100);
  await assert.rejects(response.arrayBuffer());
});

test('JSON and binary uploads preserve bytes, Content-Length, headers and error status', {timeout: 5000}, async t => {
  const origin = await listen(t, createHttpServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    response.writeHead(409, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({
      method: request.method, length: request.headers['content-length'],
      type: request.headers['content-type'], filename: request.headers['x-filename'],
      bytes: [...Buffer.concat(chunks)],
    }));
  }));
  process.env.ANALYSIS_API_URL = origin.href;
  for (const body of ['{"label":"é"}', new Uint8Array([0, 128, 255]), new Uint8Array([1, 0, 254]).buffer]) {
    const response = await client.proxyAnalysis('/uploads', {
      method: 'POST', body, headers: {'Content-Type': 'application/octet-stream', 'X-Filename': 'test.png'},
    });
    const expected = typeof body === 'string' ? Buffer.from(body) : Buffer.from(new Uint8Array(body));
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), {
      method: 'POST', length: String(expected.length), type: 'application/octet-stream', filename: 'test.png', bytes: [...expected],
    });
  }
});

test('abort and consumer cancellation close unfinished requests', {timeout: 5000}, async t => {
  let lastSocket;
  const origin = await listen(t, createServer(socket => socket.once('data', () => {
    lastSocket = socket;
    socket.write('HTTP/1.0 200 OK\r\nContent-Length: 1000000\r\n\r\nhello');
    socket.resume();
  })));
  const stopped = new AbortController();
  stopped.abort();
  await assert.rejects(requestBackend(origin, {signal: stopped.signal}), {name: 'AbortError'});

  const controller = new AbortController();
  const response = await requestBackend(origin, {signal: controller.signal});
  const abortedSocket = once(lastSocket, 'close');
  controller.abort();
  await assert.rejects(response.arrayBuffer());
  await abortedSocket;

  const cancelled = await requestBackend(origin);
  const cancelledSocket = once(lastSocket, 'close');
  await cancelled.body.cancel();
  await cancelledSocket;

  const timeout = await requestBackend(origin, {signal: AbortSignal.timeout(100)});
  await assert.rejects(timeout.arrayBuffer());
});

test('transport rejects remote URLs and preserves redirects without following them', async t => {
  for (const address of ['https://localhost/', 'http://example.com/', 'http://127.0.0.1.example.com/']) {
    await assert.rejects(requestBackend(new URL(address)), /local HTTP address/);
  }
  const origin = await listen(t, createHttpServer((_request, response) => {
    response.writeHead(302, {Location: 'http://example.com/'});
    response.end();
  }));
  const response = await requestBackend(origin);
  assert.equal(response.status, 302);
  await response.body.cancel();
});

test('real result transfer verifies concurrent files, cleans interrupted imports and retries', {timeout: 10000}, async t => {
  const contents = new Map([
    ['metadata.json', Buffer.from(JSON.stringify({image_width: 100, image_height: 80, extracts: []}))],
    ['original/original.webp', Buffer.alloc(96 * 1024, 97)],
    ['segments/one.webp', Buffer.alloc(128 * 1024, 98)],
    ['segments/two.webp', Buffer.alloc(2 * 1024 * 1024, 99)],
  ]);
  const files = [...contents].map(([filePath, body]) => ({path: filePath, size: body.length, sha256: createHash('sha256').update(body).digest('hex')}));
  const manifest = Buffer.from(JSON.stringify({result_id: 'network-result', files, total_size: files.reduce((sum, file) => sum + file.size, 0)}));
  let truncate = true;
  const origin = await listen(t, createServer(socket => socket.once('data', request => {
    const pathname = request.toString().split(' ')[1];
    if (pathname.endsWith('/artifact')) return closedResponse(socket, manifest, {type: 'application/json'});
    const body = contents.get(decodeURIComponent(pathname.split('/files/')[1]));
    closedResponse(socket, truncate ? body.subarray(0, body.length - 1) : body, {length: body.length});
  })));
  process.env.ANALYSIS_API_URL = origin.href;
  process.env.ANALYSIS_DATA_DIR = path.join(temporaryRoot, 'results');
  await assert.rejects(importer.importResult('network-job'), error => error.status === 503);
  assert.deepEqual(await fs.readdir(process.env.ANALYSIS_DATA_DIR), []);
  truncate = false;
  assert.equal((await importer.importResult('network-job')).result_id, 'network-result');
  for (const [filePath, expected] of contents) {
    assert.deepEqual(await fs.readFile(path.join(process.env.ANALYSIS_DATA_DIR, 'network-result', filePath)), expected);
  }
});

test('preview route streams closing responses and handles upstream errors', {timeout: 5000}, async t => {
  const body = Buffer.alloc(128 * 1024, 97);
  let status = 200;
  let type = 'image/webp';
  const origin = await listen(t, createServer(socket => socket.once('data', () => closedResponse(socket, body, {status, type}))));
  process.env.ANALYSIS_API_URL = origin.href;
  const getPreview = () => preview.GET(new Request('http://localhost/api'), {params: Promise.resolve({jobId: 'job-123', path: ['original.webp']})});
  const response = await getPreview();
  await delay(100);
  assert.equal(response.headers.get('content-type'), 'image/webp');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), body);
  type = 'text/html';
  assert.equal((await getPreview()).status, 502);
  status = 404;
  assert.equal((await getPreview()).status, 404);
});
