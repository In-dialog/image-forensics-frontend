import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

// Run the actual server repository under Node without Next's compiler-only
// server-only sentinel. No browser/framework or additional test dependency needed.
const sourcePath = fileURLToPath(new URL("../features/results/server/dataset-repository.ts", import.meta.url));
const initialCwd = process.cwd();
const initialDataRoot = process.env.ANALYSIS_DATA_DIR;
let temporaryRoot;
let repository;

async function createDataset(root, id, name = id) {
  const directory = path.join(root, id);
  await fs.mkdir(path.join(directory, "original"), { recursive: true });
  await fs.writeFile(path.join(directory, "metadata.json"), JSON.stringify({
    source_image: name, image_width: 640, image_height: 480, extracts: [],
  }));
  await fs.writeFile(path.join(directory, "original", "original.webp"), "image fixture");
  await fs.writeFile(path.join(directory, ".import.json"), JSON.stringify({ files: ["metadata.json", "original/original.webp", "escape/metadata.json"] }));
  return directory;
}

before(async () => {
  temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "image-results-tests-"));
  process.chdir(temporaryRoot);
  process.env.ANALYSIS_DATA_DIR = path.join(temporaryRoot, "data");
  const source = (await fs.readFile(sourcePath, "utf8")).replace('import "server-only";', "");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  });
  const modulePath = path.join(temporaryRoot, "repository.mjs");
  await fs.writeFile(modulePath, outputText);
  repository = await import(pathToFileURL(modulePath).href);

  const current = await createDataset(process.env.ANALYSIS_DATA_DIR, "same-name", "Current output");
  await createDataset(path.join(temporaryRoot, "public", "data"), "same-name", "Existing output");
  await createDataset(process.env.ANALYSIS_DATA_DIR, ".jobs");
  const unpublished = await createDataset(process.env.ANALYSIS_DATA_DIR, "unpublished");
  await fs.unlink(path.join(unpublished, ".import.json"));
  await fs.mkdir(path.join(process.env.ANALYSIS_DATA_DIR, "incomplete"));
  await fs.writeFile(path.join(process.env.ANALYSIS_DATA_DIR, "incomplete", "metadata.json"), "{");
  await fs.mkdir(path.join(process.env.ANALYSIS_DATA_DIR, "null-metadata"));
  await fs.writeFile(path.join(process.env.ANALYSIS_DATA_DIR, "null-metadata", "metadata.json"), "null");
  await fs.mkdir(path.join(current, ".private"));
  await fs.writeFile(path.join(current, ".private", "hidden.json"), "{}");
  await fs.writeFile(path.join(current, "script.html"), "<script>fixture</script>");
  await fs.mkdir(path.join(current, "folder.json"));
  const external = await createDataset(temporaryRoot, "outside-data");
  await fs.symlink(external, path.join(current, "escape"), "junction");
  await fs.symlink(external, path.join(process.env.ANALYSIS_DATA_DIR, "escape"), "junction");
});

after(async () => {
  process.chdir(initialCwd);
  if (initialDataRoot === undefined) delete process.env.ANALYSIS_DATA_DIR;
  else process.env.ANALYSIS_DATA_DIR = initialDataRoot;
  // Only remove this test's unique directory beneath the OS temporary root.
  if (temporaryRoot && path.dirname(temporaryRoot) === os.tmpdir() && path.basename(temporaryRoot).startsWith("image-results-tests-")) {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("catalog lists only published datasets from its one configured data directory", async () => {
  const results = await repository.listDatasets();
  assert.deepEqual(results.map(({ id }) => id).sort(), ["same-name"]);
  assert.equal(results.find(({ id }) => id === "same-name").name, "Current output");
  for (const result of results) {
    assert.equal(result.basePath, `/api/datasets/${encodeURIComponent(result.id)}/files`);
    assert.equal(result.previewUrl, `${result.basePath}/original/original.webp`);
  }
});

test("reads only inventoried assets with explicit content types", async () => {
  for (const id of ["same-name"]) {
    const metadata = await repository.readDatasetFile(id, ["metadata.json"]);
    assert.equal(metadata.contentType, "application/json; charset=utf-8");
    assert.equal(JSON.parse(metadata.body).image_width, 640);
    const image = await repository.readDatasetFile(id, ["original", "original.webp"]);
    assert.equal(image.contentType, "image/webp");
    assert.equal(image.body.toString(), "image fixture");
  }
});

test("rejects traversal, hidden files, unsafe extensions, directories, and Windows alternate streams", async () => {
  for (const parts of [
    ["..", "metadata.json"], ["original/../metadata.json"], ["original\\..\\metadata.json"],
    [".private", "hidden.json"], ["metadata.json:stream.json"], ["script.html"], ["folder.json"],
    ["metadata.json "], ["original", "missing.webp"], [],
  ]) assert.equal(await repository.readDatasetFile("same-name", parts), null, parts.join("/"));
  for (const id of ["..", "../outside-data", "..\\outside-data", ".jobs", "unpublished"]) {
    assert.equal(await repository.getDataset(id), null, id);
  }
});

test("rejects dataset and asset junctions that escape the allowed root", async () => {
  assert.equal(await repository.getDataset("escape"), null);
  assert.equal(await repository.readDatasetFile("same-name", ["escape", "metadata.json"]), null);
});

test("a missing configured data directory produces an empty catalog", async () => {
  const prior = process.env.ANALYSIS_DATA_DIR;
  process.env.ANALYSIS_DATA_DIR = path.join(temporaryRoot, "not-created-yet");
  try {
    assert.deepEqual((await repository.listDatasets()).map(({ id }) => id), []);
  } finally { process.env.ANALYSIS_DATA_DIR = prior; }
});

test('missing, malformed, unsafe, or duplicate inventories cannot publish a dataset', async () => {
  const markerPath = path.join(process.env.ANALYSIS_DATA_DIR, 'same-name', '.import.json');
  await fs.writeFile(markerPath, JSON.stringify({ files: ['metadata.json', 'original/original.webp', 'internal.txt'] }));
  assert.deepEqual(await repository.getDatasetAvailableFiles('same-name'), ['metadata.json', 'original/original.webp']);
  assert.equal(await repository.readDatasetFile('same-name', ['.import.json']), null);
  await fs.writeFile(path.join(process.env.ANALYSIS_DATA_DIR, 'same-name', 'unlisted.json'), '{}');
  assert.equal(await repository.readDatasetFile('same-name', ['unlisted.json']), null);
  for (const files of [undefined, ['metadata.json', '../private.json'], ['metadata.json', '.private/hidden.json'], ['metadata.json', 'metadata.json'], ['original/original.webp']]) {
    await fs.writeFile(markerPath, JSON.stringify({ files }));
    assert.equal(await repository.getDatasetAvailableFiles('same-name'), null);
    assert.equal(await repository.getDataset('same-name'), null);
    assert.equal(await repository.readDatasetFile('same-name', ['metadata.json']), null);
  }
});
