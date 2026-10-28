import "server-only";

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { RequestError, serviceUrl } from './client';

type ArtifactFile = {path: string; size: number; sha256: string};
type Artifact = {result_id: string; files: ArtifactFile[]; total_size: number};
const ALLOWED_EXTENSIONS = new Set(['.json', '.webp', '.png', '.jpg', '.jpeg', '.bmp', '.tif', '.tiff', '.gif', '.txt']);
const MAX_FILE_BYTES = 128 * 1024 * 1024;
const MAX_ARTIFACT_BYTES = 1024 * 1024 * 1024;
const pending = new Map<string, Promise<{result_id: string; url: string}>>();

function validId(id: unknown): id is string { return typeof id === 'string' && /^[a-zA-Z0-9_-]{1,160}$/.test(id); }

function validateManifest(payload: unknown): Artifact {
  if (!payload || typeof payload !== 'object') throw new RequestError('Invalid result manifest.', 502);
  const artifact = payload as Artifact;
  if (!validId(artifact.result_id) || !Array.isArray(artifact.files) || !artifact.files.length || artifact.files.length > 10000) {
    throw new RequestError('Invalid result manifest.', 502);
  }
  const seen = new Set<string>();
  let total = 0;
  for (const file of artifact.files) {
    const parts = typeof file?.path === 'string' ? file.path.split('/') : [];
    if (!parts.length || parts.some(part => !part || part.startsWith('.') || /[\\:\x00-\x1f<>"|?*]/.test(part) || /[. ]$/.test(part)
      || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))
      || !ALLOWED_EXTENSIONS.has(path.extname(file.path).toLowerCase())
      || !Number.isSafeInteger(file.size) || file.size < 0 || file.size > MAX_FILE_BYTES
      || !/^[a-f0-9]{64}$/i.test(file.sha256) || seen.has(file.path.toLowerCase())) {
      throw new RequestError('The result contains an invalid file entry.', 502);
    }
    seen.add(file.path.toLowerCase());
    total += file.size;
  }
  if (total !== artifact.total_size || total > MAX_ARTIFACT_BYTES || !artifact.files.some(file => file.path === 'metadata.json')) {
    throw new RequestError('The result manifest is incomplete or too large.', 502);
  }
  return artifact;
}

async function getArtifactResponse(url: URL) {
  let response: Response;
  try { response = await fetch(url, {cache: 'no-store', signal: AbortSignal.timeout(60000)}); }
  catch { throw new RequestError('Could not download results. Check the analysis service and retry.', 503); }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new RequestError(typeof body.error === 'string' ? body.error : 'The result is not available for download.', response.status);
  }
  return response;
}

async function downloadFile(jobId: string, entry: ArtifactFile, destination: string) {
  const encodedPath = entry.path.split('/').map(encodeURIComponent).join('/');
  const response = await getArtifactResponse(serviceUrl(`/jobs/${encodeURIComponent(jobId)}/files/${encodedPath}`));
  if (!response.body) throw new RequestError('An output file was empty.', 502);
  const target = path.join(destination, ...entry.path.split('/'));
  await fs.mkdir(path.dirname(target), {recursive: true});
  const output = await fs.open(target, 'wx');
  const reader = response.body.getReader();
  const hash = createHash('sha256');
  let size = 0;
  try {
    while (true) {
      const {value, done} = await reader.read().catch(() => {
        throw new RequestError('The result download was interrupted. Retry the download.', 503);
      });
      if (done) break;
      size += value.byteLength;
      if (size > entry.size) throw new RequestError('An output file did not match its manifest.', 502);
      hash.update(value);
      await output.writeFile(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
    await output.close();
  }
  if (size !== entry.size || hash.digest('hex') !== entry.sha256.toLowerCase()) {
    throw new RequestError('Result verification failed. Retry the download.', 502);
  }
}

async function performImport(jobId: string) {
  if (!validId(jobId)) throw new RequestError('Invalid analysis ID.');
  const response = await getArtifactResponse(serviceUrl(`/jobs/${encodeURIComponent(jobId)}/artifact`));
  const artifact = validateManifest(await response.json().catch(() => {
    throw new RequestError('Invalid result manifest.', 502);
  }));
  const root = path.resolve(process.env.ANALYSIS_DATA_DIR || path.join(process.cwd(), 'data'));
  await fs.mkdir(root, {recursive: true});
  const destination = path.join(root, artifact.result_id);
  const fingerprint = createHash('sha256').update(JSON.stringify(artifact.files)).digest('hex');
  const result = {result_id: artifact.result_id, url: `/results/${encodeURIComponent(artifact.result_id)}`};
  try {
    const existing = await fs.lstat(destination);
    if (existing.isSymbolicLink() || !existing.isDirectory()) throw new RequestError('The result destination is already in use.', 409);
    const markerText = await fs.readFile(path.join(destination, '.import.json'), 'utf8');
    let marker;
    try { marker = JSON.parse(markerText); }
    catch { throw new RequestError('The result destination is already in use.', 409); }
    if (marker?.job_id === jobId && marker?.fingerprint === fingerprint && Array.isArray(marker.files)) {
      return result;
    }
    throw new RequestError('A different result already exists at this destination.', 409);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    // A folder without our completion marker must never be overwritten.
    try { await fs.access(destination); throw new RequestError('The result destination is already in use.', 409); }
    catch (checkError) { if ((checkError as NodeJS.ErrnoException).code !== 'ENOENT') throw checkError; }
  }
  // A dot-prefixed staging directory is invisible to the results catalog.
  const staging = await fs.mkdtemp(path.join(root, '.import-'));
  try {
    let next = 0;
    const workers = Array.from({length: Math.min(4, artifact.files.length)}, async () => {
      while (next < artifact.files.length) {
        const entry = artifact.files[next++];
        await downloadFile(jobId, entry, staging);
      }
    });
    const outcomes = await Promise.allSettled(workers);
    const failed = outcomes.find(outcome => outcome.status === 'rejected');
    if (failed?.status === 'rejected') throw failed.reason;
    const metadataText = await fs.readFile(path.join(staging, 'metadata.json'), 'utf8');
    let metadata;
    try { metadata = JSON.parse(metadataText); }
    catch { throw new RequestError('The downloaded analysis has no valid image metadata.', 502); }
    if (!metadata || !Array.isArray(metadata.extracts) || !(metadata.image_width > 0) || !(metadata.image_height > 0)) {
      throw new RequestError('The downloaded analysis has no valid image metadata.', 502);
    }
    await fs.writeFile(path.join(staging, '.import.json'), JSON.stringify({job_id: jobId, fingerprint, imported_at: new Date().toISOString(), files: artifact.files.map(file => file.path)}));
    await fs.rename(staging, destination);
    return result;
  } finally {
    // staging is created above under the fixed data root; no user-provided path is removed.
    await fs.rm(staging, {recursive: true, force: true});
  }
}

/** Idempotent transfer from the independent Python service into this site's data. */
export function importResult(jobId: string) {
  const active = pending.get(jobId);
  if (active) return active;
  const promise = performImport(jobId).finally(() => pending.delete(jobId));
  pending.set(jobId, promise);
  return promise;
}
