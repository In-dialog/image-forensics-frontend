import path from 'node:path';
import fs from 'node:fs';

export const NODE_MAJOR = 24;
export const MINIMUM_DISK_BYTES = 4 * 1024 ** 3;
export const LOCAL_URL = 'http://127.0.0.1:3100';

/** Installer-owned directories must never redirect writes to another location. */
export function assertPrivateRuntime(root) {
  const canonicalRoot = fs.realpathSync(root);
  for (const parts of [['.runtime'], ['.runtime', 'node'], ['.runtime', 'npm-cache']]) {
    const candidate = path.join(canonicalRoot, ...parts);
    let stat;
    try { stat = fs.lstatSync(candidate); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error(`Unsafe runtime location: ${parts.join('/')} must be an ordinary directory, not a link or file. Move the link yourself and retry; its contents were not changed.`);
    }
    const relative = path.relative(canonicalRoot, fs.realpathSync(candidate));
    if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error('Unsafe runtime location outside this project. No runtime files were changed.');
    }
  }
}

export function supportedPlatform(platform, arch) {
  if (!['win32', 'darwin'].includes(platform)) throw new Error('This installer supports Windows 10 or newer and macOS 13.5 or newer.');
  if (!['x64', 'arm64'].includes(arch)) throw new Error('A 64-bit Intel/AMD or ARM computer is required.');
  return platform === 'win32' ? `win-${arch}` : `darwin-${arch}`;
}

export function isNodeCompatible(version) {
  return /^v?24\.\d+\.\d+$/.test(version);
}

export function buildInstallPlan({ root, platform, arch, nodeVersion, freeBytes }) {
  const target = supportedPlatform(platform, arch);
  const steps = [];
  if (!isNodeCompatible(nodeVersion)) steps.push({ kind: 'runtime', label: `Download Node.js 24 LTS for ${target}; verify its SHA-256 checksum; keep it in .runtime/node.` });
  steps.push(
    { kind: 'dependencies', label: 'Install the exact website dependencies from package-lock.json with npm ci.' },
    { kind: 'configuration', label: 'Create local configuration only if absent; preserve existing saved datasets.' },
    { kind: 'build', label: 'Build the local website. Analysis models and the Python backend are separate.' },
  );
  return {
    target, root, steps,
    enoughDisk: freeBytes == null || freeBytes >= MINIMUM_DISK_BYTES,
    minimumDiskBytes: MINIMUM_DISK_BYTES,
    dataDirectory: path.join(root, 'data'),
    url: LOCAL_URL,
  };
}

export function parseOptions(args) {
  const allowed = new Set(['install', 'start', '--dry-run', '--preflight', '--no-browser']);
  const unknown = args.filter(arg => !allowed.has(arg));
  if (unknown.length) throw new Error(`Unknown option: ${unknown.join(', ')}`);
  const actions = args.filter(arg => arg === 'install' || arg === 'start');
  if (actions.length > 1) throw new Error('Choose one action: install or start.');
  return {
    action: actions[0] || 'install',
    dryRun: args.includes('--dry-run'),
    preflight: args.includes('--preflight'),
    noBrowser: args.includes('--no-browser'),
  };
}
