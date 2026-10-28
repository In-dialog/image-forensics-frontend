import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const originalCwd = process.cwd();
const originalFetch = globalThis.fetch;
const originalDataRoot = process.env.ANALYSIS_DATA_DIR;
const originalServiceUrl = process.env.ANALYSIS_API_URL;
let temporaryRoot;
let client;
let importer;
let repository;

async function loadServerModule(relativePath, filename, replacements = []) {
  let source = (await fs.readFile(path.join(projectRoot, relativePath), "utf8")).replace('import "server-only";', "");
  for (const [from, to] of replacements) source = source.replace(from, to);
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  });
  const compiled = path.join(temporaryRoot, filename);
  await fs.writeFile(compiled, outputText);
  return import(pathToFileURL(compiled).href);
}

before(async () => {
  temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "analysis-transfer-tests-"));
  process.chdir(temporaryRoot);
  client = await loadServerModule("server/analysis/client.ts", "client.mjs");
  importer = await loadServerModule("server/analysis/import-result.ts", "importer.mjs", [["'./client'", "'./client.mjs'"]]);
  repository = await loadServerModule("features/results/server/dataset-repository.ts", "repository.mjs");
});

beforeEach(async () => {
  process.env.ANALYSIS_DATA_DIR = await fs.mkdtemp(path.join(temporaryRoot, "data-"));
  process.env.ANALYSIS_API_URL = "http://127.0.0.1:8766";
  globalThis.fetch = async () => { throw new Error("Unexpected network request in test"); };
});

after(async () => {
  globalThis.fetch = originalFetch;
  process.chdir(originalCwd);
  for (const [key, value] of [["ANALYSIS_DATA_DIR", originalDataRoot], ["ANALYSIS_API_URL", originalServiceUrl]]) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  if (temporaryRoot && path.dirname(temporaryRoot) === os.tmpdir() && path.basename(temporaryRoot).startsWith("analysis-transfer-tests-")) {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
});

function fixture(resultId = "result-123") {
  const contents = new Map([
    ["metadata.json", Buffer.from(JSON.stringify({ image_width: 100, image_height: 80, source_image: "Example", extracts: [] }))],
    ["original/original.webp", Buffer.from("an image fixture")],
    ["segments/Person 0.webp", Buffer.from("a segment fixture")],
  ]);
  return artifactFrom(contents, resultId);
}

function artifactFrom(contents, resultId = "result-123") {
  const files = [...contents].map(([filePath, body]) => ({ path: filePath, size: body.byteLength, sha256: createHash("sha256").update(body).digest("hex") }));
  return { contents, manifest: { result_id: resultId, files, total_size: files.reduce((sum, file) => sum + file.size, 0) } };
}

function serve({ manifest, contents }, overrides = {}) {
  const calls = [];
  globalThis.fetch = async (input) => {
    const url = new URL(input);
    calls.push(url.pathname);
    if (url.pathname.endsWith("/artifact")) return Response.json(manifest);
    const filePath = decodeURIComponent(url.pathname.split("/files/")[1]);
    if (overrides.file) return overrides.file(filePath, contents.get(filePath));
    const body = contents.get(filePath);
    return body ? new Response(body) : Response.json({ error: "Missing fixture" }, { status: 404 });
  };
  return calls;
}

const rejectsStatus = (operation, status) => assert.rejects(operation, (error) => error instanceof client.RequestError && error.status === status);

test("imports verified files atomically, deduplicates concurrent requests, then reuses the completed result", async () => {
  const artifact = fixture();
  let release;
  let signalDownloadStarted;
  const pause = new Promise((resolve) => { release = resolve; });
  const started = new Promise((resolve) => { signalDownloadStarted = resolve; });
  const calls = serve(artifact, { file: async (filePath, body) => {
    if (filePath === "original/original.webp") { signalDownloadStarted(); await pause; }
    return new Response(new ReadableStream({ start(controller) {
      controller.enqueue(body.subarray(0, 3));
      controller.enqueue(body.subarray(3));
      controller.close();
    } }));
  } });
  const pending = importer.importResult("job-123");
  assert.equal(importer.importResult("job-123"), pending);
  try {
    await started;
    assert.deepEqual(await repository.listDatasets(), []);
    assert.ok((await fs.readdir(process.env.ANALYSIS_DATA_DIR)).every((name) => name.startsWith(".import-")));
  } finally { release(); }
  assert.deepEqual(await pending, { result_id: "result-123", url: "/results/result-123" });
  assert.deepEqual((await repository.listDatasets()).map(({ id }) => id), ["result-123"]);
  const destination = path.join(process.env.ANALYSIS_DATA_DIR, "result-123");
  for (const [filePath, expected] of artifact.contents) assert.deepEqual(await fs.readFile(path.join(destination, filePath)), expected);
  const initialDownloads = calls.filter((url) => url.includes("/files/")).length;
  const markerPath = path.join(destination, '.import.json');
  const marker = JSON.parse(await fs.readFile(markerPath, 'utf8'));
  assert.deepEqual(marker.files, artifact.manifest.files.map(file => file.path));
  assert.deepEqual(await repository.getDatasetAvailableFiles('result-123'), marker.files);
  await importer.importResult("job-123");
  assert.equal(calls.filter((url) => url.includes("/files/")).length, initialDownloads);
  assert.deepEqual(await repository.getDatasetAvailableFiles('result-123'), artifact.manifest.files.map(file => file.path));
  // An explicit offline migration may archive source files while retaining its fingerprint.
  marker.files = ['metadata.json'];
  await fs.writeFile(markerPath, JSON.stringify(marker));
  await importer.importResult('job-123');
  assert.deepEqual(await repository.getDatasetAvailableFiles('result-123'), ['metadata.json']);
  assert.equal(calls.filter((url) => url.includes('/files/')).length, initialDownloads);
  assert.deepEqual(await fs.readdir(process.env.ANALYSIS_DATA_DIR), ["result-123"]);
  delete marker.files;
  await fs.writeFile(markerPath, JSON.stringify(marker));
  assert.equal(await repository.getDatasetAvailableFiles('result-123'), null);
  await rejectsStatus(importer.importResult('job-123'), 409);
});

test("hash or length verification failures leave no visible or staging result and can be retried", async () => {
  for (const corruption of ["same-size", "extra-byte", "short"]) {
    const artifact = fixture();
    serve(artifact, { file: (filePath, body) => {
      if (filePath !== "original/original.webp") return new Response(body);
      const corrupt = corruption === "same-size" ? Buffer.alloc(body.length, 65)
        : corruption === "extra-byte" ? Buffer.concat([body, Buffer.from("!")]) : body.subarray(1);
      return new Response(corrupt);
    } });
    await rejectsStatus(importer.importResult(`job-${corruption}`), 502);
    assert.deepEqual(await fs.readdir(process.env.ANALYSIS_DATA_DIR), []);
  }
  serve(fixture());
  assert.equal((await importer.importResult("job-same-size")).result_id, "result-123");
});

test("never replaces an existing result, incomplete destination, or malformed completion marker", async () => {
  serve(fixture());
  const destination = path.join(process.env.ANALYSIS_DATA_DIR, "result-123");
  await fs.mkdir(destination);
  await fs.writeFile(path.join(destination, "keep.txt"), "user file");
  await rejectsStatus(importer.importResult("job-existing"), 409);
  await fs.writeFile(path.join(destination, ".import.json"), "{");
  await rejectsStatus(importer.importResult("job-existing"), 409);
  await fs.writeFile(path.join(destination, ".import.json"), JSON.stringify({ job_id: "another-job", fingerprint: "different" }));
  await rejectsStatus(importer.importResult("job-existing"), 409);
  assert.equal(await fs.readFile(path.join(destination, "keep.txt"), "utf8"), "user file");
  assert.deepEqual(await fs.readdir(process.env.ANALYSIS_DATA_DIR), ["result-123"]);
});

test("rejects a destination junction without touching its target", async () => {
  serve(fixture());
  const outside = await fs.mkdtemp(path.join(temporaryRoot, "outside-"));
  await fs.writeFile(path.join(outside, "keep.txt"), "user file");
  await fs.symlink(outside, path.join(process.env.ANALYSIS_DATA_DIR, "result-123"), "junction");
  await rejectsStatus(importer.importResult("job-junction"), 409);
  assert.equal(await fs.readFile(path.join(outside, "keep.txt"), "utf8"), "user file");
});

test("rejects unsafe paths, duplicate names, invalid IDs, and manifests above backend transfer limits before downloading", async () => {
  const invalid = [];
  for (const filePath of ["../escape.json", "x/../../escape.json", "x\\escape.json", "/absolute.json", "C:/escape.json", ".private/info.json", "x/CON.json", "x/file.json:stream", "script.html", "x/name.json "]) {
    const { manifest } = fixture();
    manifest.files[1].path = filePath;
    invalid.push(manifest);
  }
  const duplicate = fixture().manifest;
  duplicate.files[1].path = "METADATA.JSON";
  invalid.push(duplicate);
  for (const id of [undefined, null, "..", "../escape", "legacy~collision"]) {
    invalid.push({ ...fixture().manifest, result_id: id });
  }
  const oversizedFile = fixture().manifest;
  oversizedFile.files[0].size = 128 * 1024 * 1024 + 1;
  oversizedFile.total_size = oversizedFile.files.reduce((sum, file) => sum + file.size, 0);
  invalid.push(oversizedFile);
  const oversizedTotal = fixture().manifest;
  oversizedTotal.files = Array.from({ length: 9 }, (_, index) => ({ path: index ? `file-${index}.json` : "metadata.json", size: 128 * 1024 * 1024, sha256: "a".repeat(64) }));
  oversizedTotal.total_size = 9 * 128 * 1024 * 1024;
  invalid.push(oversizedTotal);
  const oversizedCount = fixture().manifest;
  oversizedCount.files = Array.from({ length: 10001 }, (_, index) => ({ path: index ? `file-${index}.json` : "metadata.json", size: 0, sha256: "a".repeat(64) }));
  oversizedCount.total_size = 0;
  invalid.push(oversizedCount);
  for (const manifest of invalid) {
    const calls = serve({ manifest, contents: new Map() });
    await rejectsStatus(importer.importResult("job-unsafe"), 502);
    assert.equal(calls.length, 1);
  }
  await rejectsStatus(importer.importResult("../invalid"), 400);
  assert.deepEqual(await fs.readdir(process.env.ANALYSIS_DATA_DIR), []);
});

test("invalid manifest JSON and invalid downloaded metadata return upstream errors and clean up", async () => {
  globalThis.fetch = async () => new Response("{");
  await rejectsStatus(importer.importResult("job-bad-json"), 502);
  for (const metadata of ["{", "null", "{}", '{"extracts":[]}']) {
    const artifact = artifactFrom(new Map([["metadata.json", Buffer.from(metadata)]]));
    serve(artifact);
    await rejectsStatus(importer.importResult("job-bad-metadata"), 502);
    assert.deepEqual(await fs.readdir(process.env.ANALYSIS_DATA_DIR), []);
  }
});

test("download failures preserve actionable upstream status and clean up all workers", async () => {
  serve(fixture(), { file: () => Response.json({ error: "Result disappeared" }, { status: 404 }) });
  await assert.rejects(importer.importResult("job-missing"), (error) => error.status === 404 && error.message === "Result disappeared");
  assert.deepEqual(await fs.readdir(process.env.ANALYSIS_DATA_DIR), []);
  serve(fixture(), { file: () => new Response(new ReadableStream({ start(controller) { controller.error(new Error("Connection closed mid-download")); } })) });
  await rejectsStatus(importer.importResult("job-interrupted"), 503);
  assert.deepEqual(await fs.readdir(process.env.ANALYSIS_DATA_DIR), []);
  globalThis.fetch = async () => { throw new Error("Connection refused"); };
  await rejectsStatus(importer.importResult("job-offline"), 503);
});

test("client enforces local API addresses and same-origin mutations", () => {
  for (const url of ["http://127.0.0.1:8766", "http://localhost:8766", "http://[::1]:8766"]) {
    process.env.ANALYSIS_API_URL = url;
    assert.equal(client.serviceUrl("/health").pathname, "/health");
  }
  for (const url of ["https://localhost:8766", "http://example.com", "http://127.0.0.1.evil.test"]) {
    process.env.ANALYSIS_API_URL = url;
    assert.throws(() => client.serviceUrl("/health"));
  }
  assert.doesNotThrow(() => client.requireSameOrigin(new Request("http://localhost:3100/api", { headers: { origin: "http://localhost:3100" } })));
  assert.throws(() => client.requireSameOrigin(new Request("http://localhost:3100/api", { headers: { origin: "http://other.test" } })), (error) => error.status === 403);
});

test("same-origin checks use the incoming Host when Next normalizes request.url", () => {
  const normalized = (origin, host = "127.0.0.1:3101", url = "http://localhost:3101/api") =>
    new Request(url, { headers: { host, origin } });
  assert.doesNotThrow(() => client.requireSameOrigin(normalized("http://127.0.0.1:3101")));
  assert.doesNotThrow(() => client.requireSameOrigin(normalized("https://127.0.0.1:3101", "127.0.0.1:3101", "https://localhost:3101/api")));
  for (const origin of ["http://other.test:3101", "http://localhost:3101", "http://127.0.0.1:3102", "https://127.0.0.1:3101", "ftp://127.0.0.1:3101", "null"]) {
    assert.throws(() => client.requireSameOrigin(normalized(origin)), (error) => error.status === 403);
  }
  for (const host of ["127.0.0.1:3101@other.test", "127.0.0.1:3101/path", "127.0.0.1:3101#fragment"]) {
    assert.throws(() => client.requireSameOrigin(normalized("http://127.0.0.1:3101", host)), (error) => error.status === 403);
  }
});

test("client limits request bytes even without Content-Length and rejects invalid JSON before forwarding", async () => {
  const request = (body, headers = {}) => new Request("http://localhost:3100/api", { method: "POST", body, headers });
  assert.equal(new TextDecoder().decode(await client.readBody(request("hello"), 5)), "hello");
  await rejectsStatus(client.readBody(request("hello!"), 5), 413);
  await rejectsStatus(client.readBody(request("x", { "content-length": "100" }), 5), 413);
  const invalid = await client.forwardJson(request("{"), "/config");
  assert.equal(invalid.status, 400);
  const crossOrigin = await client.forwardJson(request("{}", { origin: "http://other.test" }), "/config");
  assert.equal(crossOrigin.status, 403);
});

test("proxy preserves backend errors, hides unexpected exceptions, and reports unavailable service", async () => {
  globalThis.fetch = async () => Response.json({ error: "Analysis already running" }, { status: 409 });
  const conflict = await client.proxyAnalysis("/jobs");
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).error, "Analysis already running");
  globalThis.fetch = async () => { throw new Error("private connection details"); };
  assert.equal((await client.proxyAnalysis("/health")).status, 503);
  const unexpected = await client.guarded(async () => { throw new Error("private file path"); });
  assert.equal(unexpected.status, 500);
  assert.equal((await unexpected.json()).error, "The request could not be processed.");
});
