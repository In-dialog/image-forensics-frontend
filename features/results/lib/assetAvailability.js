/** Only files recorded in a completed dataset may be requested. */
export function makeAssetAvailability(basePath, files) {
  if (!Array.isArray(files)) throw new Error('A completed dataset file inventory is required.');
  const prefix = String(basePath).replace(/\/$/, '');
  const urls = new Set(files.map(file => `${prefix}/${file.split('/').map(encodeURIComponent).join('/')}`));
  return url => typeof url === 'string' && urls.has(url.split('?')[0].split('#')[0]);
}
