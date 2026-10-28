import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checkStaticExport } from './check-static-export.mjs';

/** Next 16's Windows exporter can retain native separators in segment names.
 * The browser requests dotted names on every OS. Publish those exact aliases;
 * Linux/macOS exports already use them, so this is a no-op for those builds.
 */
export async function normalizeSegmentFiles(output) {
  let copied = 0;
  async function walk(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Static output contains an unexpected filesystem link.');
      if (entry.isDirectory()) { await walk(filename); continue; }
      if (!entry.name.endsWith('.txt')) continue;
      const parts = path.relative(output, filename).split(path.sep);
      const segment = parts.findIndex(part => part.startsWith('__next.'));
      if (segment < 0 || segment === parts.length - 1) continue;
      const destination = path.join(output, ...parts.slice(0, segment), parts.slice(segment).join('.'));
      try {
        const existing = await fs.readFile(destination);
        if (!existing.equals(await fs.readFile(filename))) throw new Error('Conflicting static segment payloads.');
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        await fs.copyFile(filename, destination);
        copied += 1;
      }
    }
  }
  await walk(output);
  return copied;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const output = fileURLToPath(new URL('../cloudflare/out/', import.meta.url));
  normalizeSegmentFiles(output).then(() => checkStaticExport(output)).then(({ count, bytes }) => {
    console.log(`Cloudflare export ready: ${count} files, ${(bytes / 1024 / 1024).toFixed(2)} MiB; saved results and setup pages only.`);
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
