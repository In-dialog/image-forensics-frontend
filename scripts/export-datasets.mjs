import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isPublishedAsset } from '../features/results/config/publishedAssets.mjs';

export const MAX_ASSET_BYTES = 25 * 1024 * 1024;
// Leave room for Next's HTML, JavaScript, CSS, and navigation payloads.
export const MAX_DATA_FILES = 18000;
const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const RUNTIME_PATH_FIELDS = new Set(['source_image_path', 'source_image', 'output_folder']);

/** Redact machine paths only in runtime provenance; retain original bytes otherwise. */
export function redactRuntimeProvenance(text, datasetId) {
  const document = JSON.parse(text);
  let changed = false;
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (RUNTIME_PATH_FIELDS.has(key) && typeof child === 'string'
        && (path.win32.isAbsolute(child) || path.posix.isAbsolute(child))) {
        value[key] = key === 'output_folder' ? datasetId : path.posix.basename(child.replaceAll('\\', '/')) || datasetId;
        changed = true;
      } else if (child && typeof child === 'object') visit(child);
    }
  }
  visit(document);
  return changed ? JSON.stringify(document) : text;
}

function safePart(value) {
  return typeof value === 'string' && Boolean(value) && !value.startsWith('.')
    && !/[\\/:\x00-\x1f<>"|?*]/.test(value) && !/[. ]$/.test(value)
    && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value);
}

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

async function containedFile(root, relative) {
  const filename = await fs.realpath(path.join(root, ...relative.split('/')));
  if (!inside(root, filename) || !(await fs.stat(filename)).isFile()) {
    throw new Error(`Dataset asset escapes its folder or is not a file: ${relative}`);
  }
  return filename;
}

async function viewerFiles(directory, files) {
  const selected = new Set(files.filter(isPublishedAsset));
  const pending = [...selected].filter(file => file.endsWith('.json'));
  const visited = new Set();
  // Structured results may explicitly reference custom asset paths. Preserve
  // those references rather than guessing from labels or hardcoding folders.
  while (pending.length) {
    const file = pending.pop();
    if (visited.has(file)) continue;
    visited.add(file);
    const document = JSON.parse(await fs.readFile(await containedFile(directory, file), 'utf8'));
    function visit(value) {
      if (!value || typeof value !== 'object') return;
      for (const [key, child] of Object.entries(value)) {
        if (typeof child === 'string' && ['image_path', 'parts_metadata_path'].includes(key)) {
          const extensionAllowed = key === 'image_path' ? /\.(webp|png|jpe?g)$/i.test(child) : /\.json$/i.test(child);
          if (extensionAllowed && child.split('/').every(safePart) && files.includes(child)) {
            selected.add(child);
            if (key === 'parts_metadata_path' && !visited.has(child)) pending.push(child);
          }
        } else if (child && typeof child === 'object') visit(child);
      }
    }
    visit(document);
  }
  return [...selected].sort();
}

/** Read-only preflight; no downloads, file writes, or service requests. */
export async function createExportPlan(dataDirectory, { maxAssetBytes = MAX_ASSET_BYTES, maxFiles = MAX_DATA_FILES } = {}) {
  const root = await fs.realpath(dataDirectory);
  const datasets = [];
  const assets = [];
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!safePart(entry.name)) continue;
    if (entry.isSymbolicLink()) throw new Error(`Dataset links are not publishable: ${entry.name}`);
    if (!entry.isDirectory()) continue;
    const directory = await fs.realpath(path.join(root, entry.name));
    if (!inside(root, directory)) throw new Error(`Dataset escapes the data folder: ${entry.name}`);
    let marker;
    try {
      marker = JSON.parse(await fs.readFile(await containedFile(directory, '.import.json'), 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') continue; // An unfinished import is not a dataset.
      throw new Error(`Invalid import inventory for ${entry.name}: ${error.message}`);
    }
    const files = marker?.files;
    if (!Array.isArray(files) || !files.includes('metadata.json') || files.length > 10000
      || files.some(file => typeof file !== 'string' || !file.split('/').every(safePart))
      || new Set(files.map(file => file.toLowerCase())).size !== files.length) {
      throw new Error(`Invalid import inventory for ${entry.name}.`);
    }
    const metadataFile = await containedFile(directory, 'metadata.json');
    const metadata = JSON.parse(await fs.readFile(metadataFile, 'utf8'));
    if (!Array.isArray(metadata?.extracts) || !(metadata.image_width > 0) || !(metadata.image_height > 0)) {
      throw new Error(`Invalid image metadata for ${entry.name}.`);
    }
    const availableFiles = await viewerFiles(directory, files);
    for (const file of availableFiles) {
      const source = await containedFile(directory, file);
      const { size } = await fs.stat(source);
      if (size > maxAssetBytes) throw new Error(`Cloudflare's asset size limit is exceeded: ${entry.name}/${file}`);
      assets.push({ source, relative: `${entry.name}/${file}`, size });
      if (assets.length > maxFiles) throw new Error('Too many dataset files for the Cloudflare Pages free plan.');
    }
    const basePath = `/data/${encodeURIComponent(entry.name)}`;
    const preview = ['original/original.webp', 'original/original.png', 'original/original.jpg', 'original/original.jpeg']
      .find(file => availableFiles.includes(file));
    datasets.push({
      id: entry.name,
      name: typeof metadata.source_image === 'string' ? path.win32.basename(path.posix.basename(metadata.source_image)) : entry.name,
      basePath,
      previewUrl: preview ? `${basePath}/${preview}` : '',
      updatedAt: (await fs.stat(metadataFile)).mtime.toISOString(),
      availableFiles,
    });
  }
  datasets.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name));
  return { datasets, assets, bytes: assets.reduce((total, asset) => total + asset.size, 0) };
}

/** Only replace the generated directories inside this repository's static target. */
export async function writeExport(plan, root = repositoryRoot) {
  const target = path.resolve(root, 'cloudflare');
  const publicData = path.resolve(target, 'public', 'data');
  const generated = path.resolve(target, 'generated');
  if (!inside(path.resolve(root), target) || !inside(target, publicData) || !inside(target, generated)) {
    throw new Error('Invalid static export destination.');
  }
  await fs.mkdir(target, { recursive: true });
  // Refuse junctions before removing any generated tree.
  for (const directory of [target, path.dirname(publicData), publicData, generated]) {
    try { if ((await fs.lstat(directory)).isSymbolicLink()) throw new Error(`Refusing linked output directory: ${directory}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  await fs.rm(publicData, { recursive: true, force: true });
  await fs.mkdir(publicData, { recursive: true });
  await fs.mkdir(generated, { recursive: true });
  for (const asset of plan.assets) {
    const destination = path.join(publicData, ...asset.relative.split('/'));
    if (!inside(publicData, destination)) throw new Error('Invalid generated asset path.');
    await fs.mkdir(path.dirname(destination), { recursive: true });
    if (/\.json$/i.test(asset.relative)) {
      const original = await fs.readFile(asset.source, 'utf8');
      const published = redactRuntimeProvenance(original, asset.relative.split('/')[0]);
      if (published !== original) {
        await fs.writeFile(destination, published);
        continue;
      }
    }
    await fs.copyFile(asset.source, destination);
  }
  await fs.writeFile(path.join(generated, 'catalog.json'), JSON.stringify(plan.datasets));
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--check')) throw new Error('Usage: node scripts/export-datasets.mjs [--check]');
  const plan = await createExportPlan(process.env.ANALYSIS_DATA_DIR || path.join(repositoryRoot, 'data'));
  if (!args.includes('--check')) await writeExport(plan);
  console.log(`${args.includes('--check') ? 'Checked' : 'Prepared'} ${plan.datasets.length} datasets, ${plan.assets.length} viewer assets, ${(plan.bytes / 1024 / 1024).toFixed(2)} MiB. No backend connection is required.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
