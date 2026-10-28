import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import type { Dataset } from "../types";

const IMAGE_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};
const FILE_TYPES: Record<string, string> = {
  ...IMAGE_TYPES,
  ".json": "application/json; charset=utf-8",
};

function dataRoot() {
  return path.resolve(process.env.ANALYSIS_DATA_DIR || path.join(process.cwd(), "data"));
}

function validPart(value: string) {
  return Boolean(value) && !value.startsWith(".") && !/[\\/:\x00-\x1f]/.test(value)
    && !/[. ]$/.test(value);
}

function inside(root: string, candidate: string) {
  const relative = path.relative(root, candidate);
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative);
}

/** Check real paths too: a junction or symlink must not escape its dataset. */
async function containedPath(root: string, parts: string[]) {
  if (!parts.length || !parts.every(validPart)) return null;
  try {
    const realRoot = await fs.realpath(root);
    const realTarget = await fs.realpath(path.join(realRoot, ...parts));
    return inside(realRoot, realTarget) ? realTarget : null;
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}

function isMissing(error: unknown) {
  return ["ENOENT", "ENOTDIR", "ELOOP"].includes((error as NodeJS.ErrnoException).code || "");
}

async function datasetDirectory(id: string) {
  const directory = await containedPath(dataRoot(), [id]);
  if (!directory || !(await fs.stat(directory)).isDirectory()) return null;
  return { directory, folder: id };
}

async function previewPath(directory: string) {
  const original = await containedPath(directory, ["original"]);
  if (!original) return null;
  const entries = await fs.readdir(original, { withFileTypes: true });
  const names = entries.filter((entry) => entry.isFile() && IMAGE_TYPES[path.extname(entry.name).toLowerCase()])
    .map((entry) => entry.name);
  const filename = ["original.webp", "original.png", "original.jpg", "original.jpeg"].find((name) => names.includes(name))
    || names.sort()[0];
  if (!filename || !await containedPath(directory, ["original", filename])) return null;
  return `original/${encodeURIComponent(filename)}`;
}

export async function getDataset(id: string): Promise<Dataset | null> {
  const resolved = await datasetDirectory(id);
  if (!resolved || !await getDatasetAvailableFiles(id)) return null;
  const metadataPath = await containedPath(resolved.directory, ["metadata.json"]);
  if (!metadataPath) return null;
  try {
    const metadata = JSON.parse(await fs.readFile(metadataPath, "utf8"));
    if (!metadata || !Array.isArray(metadata.extracts) || !(metadata.image_width > 0) || !(metadata.image_height > 0)) return null;
    const basePath = `/api/datasets/${encodeURIComponent(id)}/files`;
    const preview = await previewPath(resolved.directory);
    const stat = await fs.stat(metadataPath);
    return {
      id,
      name: typeof metadata.source_image === "string" ? metadata.source_image : resolved.folder,
      basePath,
      previewUrl: preview ? `${basePath}/${preview}` : "",
      updatedAt: stat.mtime.toISOString(),
    };
  } catch (error) {
    // An interrupted import may leave incomplete metadata; do not offer it to the viewer.
    if (error instanceof SyntaxError || isMissing(error)) return null;
    throw error;
  }
}

export async function listDatasets(): Promise<Dataset[]> {
  let entries;
  try { entries = await fs.readdir(dataRoot(), { withFileTypes: true }); }
  catch (error) { if (isMissing(error)) return []; throw error; }
  const datasets: Dataset[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !validPart(entry.name)) continue;
    const dataset = await getDataset(entry.name);
    if (dataset) datasets.push(dataset);
  }
  return datasets.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name));
}

/** Every published dataset has a private inventory written at import or migration. */
export async function getDatasetAvailableFiles(id: string): Promise<string[] | null> {
  const dataset = await datasetDirectory(id);
  if (!dataset) return null;
  try {
    const filename = await fs.realpath(path.join(dataset.directory, '.import.json'));
    if (!inside(await fs.realpath(dataset.directory), filename)) return null;
    const marker = JSON.parse(await fs.readFile(filename, 'utf8'));
    if (!Array.isArray(marker?.files) || marker.files.length > 10000 || !marker.files.includes('metadata.json') ||
      marker.files.some((file: unknown) => typeof file !== 'string' || !file.split('/').every(validPart)) ||
      new Set(marker.files).size !== marker.files.length) return null;
    return marker.files.filter((file: string) => FILE_TYPES[path.extname(file).toLowerCase()]);
  } catch (error) {
    if (isMissing(error) || error instanceof SyntaxError) return null;
    throw error;
  }
}

export async function readDatasetFile(id: string, parts: string[]) {
  if (!parts.length || !parts.every(validPart)) return null;
  const contentType = FILE_TYPES[path.extname(parts[parts.length - 1]).toLowerCase()];
  if (!contentType) return null;
  const dataset = await datasetDirectory(id);
  if (!dataset || !(await getDatasetAvailableFiles(id))?.includes(parts.join("/"))) return null;
  const filename = await containedPath(dataset.directory, parts);
  if (!filename) return null;
  try {
    const stat = await fs.stat(filename);
    if (!stat.isFile()) return null;
    return { body: await fs.readFile(filename), contentType };
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}
