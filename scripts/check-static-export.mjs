import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MAX_ASSET_BYTES } from './export-datasets.mjs';

export async function checkStaticExport(output) {
  let count = 0;
  let bytes = 0;
  async function walk(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Static output contains an unexpected filesystem link.');
      if (entry.isDirectory()) { await walk(filename); continue; }
      const stat = await fs.stat(filename);
      if (stat.size > MAX_ASSET_BYTES) throw new Error(`Static asset exceeds 25 MiB: ${path.relative(output, filename)}`);
      count += 1;
      bytes += stat.size;
      if (count > 20000) throw new Error('Static output exceeds the Cloudflare Pages free-plan file limit (20,000).');
      if (entry.name === '.import.json' || /vision_calls_debug|vision_details|vision_prompts/.test(entry.name)) {
        throw new Error('Static output contains a private analysis file.');
      }
    }
  }
  await walk(output);
  for (const route of ['index.html', 'results/index.html', 'analysis/index.html', 'setup/index.html', '404.html']) {
    await fs.access(path.join(output, ...route.split('/')));
  }
  try { await fs.access(path.join(output, 'api')); throw new Error('Static output must not include local API routes.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const analysis = await fs.readFile(path.join(output, 'analysis', 'index.html'), 'utf8');
  if (!analysis.includes('Hosted database viewer') || analysis.includes('Connecting to the analysis service')) {
    throw new Error('Hosted analysis must show setup instructions without running the local analysis client.');
  }
  return { count, bytes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const output = fileURLToPath(new URL('../cloudflare/out/', import.meta.url));
  checkStaticExport(output).then(({ count, bytes }) => {
    console.log(`Cloudflare export checked: ${count} files, ${(bytes / 1024 / 1024).toFixed(2)} MiB; saved results and setup pages only.`);
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
