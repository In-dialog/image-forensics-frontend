import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertPrivateRuntime, buildInstallPlan, isNodeCompatible, LOCAL_URL, parseOptions } from './plan.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nextCli = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');

function npmPath() {
  const nodeDirectory = path.dirname(process.execPath);
  const candidates = [
    path.join(nodeDirectory, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.join(nodeDirectory, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ];
  return candidates.find(candidate => fs.existsSync(candidate));
}

function run(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, env, stdio: 'inherit', windowsHide: true });
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`The command stopped (${signal || `exit ${code}`}). Read the message above, fix it, then run Install again.`)));
  });
}

function portOccupied() {
  return new Promise(resolve => {
    const socket = net.createConnection({ host: '127.0.0.1', port: 3100 });
    socket.setTimeout(800);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => { socket.destroy(); resolve(false); });
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
  });
}

function openBrowser() {
  const command = process.platform === 'win32' ? 'rundll32.exe' : 'open';
  const args = process.platform === 'win32' ? ['url.dll,FileProtocolHandler', LOCAL_URL] : [LOCAL_URL];
  const child = spawn(command, args, { stdio: 'ignore', detached: true, windowsHide: true });
  child.once('error', () => console.log(`Open ${LOCAL_URL} in your browser.`));
  child.unref();
}

async function start(env, noBrowser) {
  if (!fs.existsSync(nextCli) || !fs.existsSync(path.join(root, '.next', 'BUILD_ID'))) {
    throw new Error('The website is not installed or its build is incomplete. Close this window and open Install first.');
  }
  if (await portOccupied()) throw new Error(`Port 3100 is already in use. If the website is already open, use ${LOCAL_URL}; otherwise close the program using this port and try again.`);
  console.log(`\nStarting Image Forensics Analysis at ${LOCAL_URL}`);
  console.log('Keep this window open. Press Ctrl+C to stop the website. The backend is started separately.\n');
  const child = spawn(process.execPath, [nextCli, 'start', '--hostname', '127.0.0.1', '--port', '3100'], {
    cwd: root, env, stdio: 'inherit', windowsHide: true,
  });
  let ended = false;
  const stop = () => { if (!ended) child.kill('SIGTERM'); };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  const completion = new Promise((resolve, reject) => {
    child.once('error', error => { ended = true; reject(error); });
    child.once('exit', (code, signal) => {
      ended = true;
      process.removeListener('SIGINT', stop);
      process.removeListener('SIGTERM', stop);
      if (code === 0 || signal === 'SIGTERM' || signal === 'SIGINT') resolve();
      else reject(new Error(`The website stopped (exit ${code}).`));
    });
  });
  if (!noBrowser) {
    void (async () => {
      for (let attempt = 0; attempt < 120 && !ended; attempt += 1) {
        try {
          const response = await fetch(LOCAL_URL, { signal: AbortSignal.timeout(1000) });
          await response.body?.cancel();
          if (response.ok && !ended) { openBrowser(); return; }
        } catch { /* The local server is still starting. */ }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    })();
  }
  await completion;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  assertPrivateRuntime(root);
  let freeBytes;
  try { const disk = fs.statfsSync(root); freeBytes = disk.bavail * disk.bsize; } catch { /* Some network volumes do not expose free space. */ }
  const plan = buildInstallPlan({ root, platform: process.platform, arch: process.arch, nodeVersion: process.version, freeBytes });
  console.log('\nIMAGE FORENSICS ANALYSIS - WEBSITE');
  console.log(`Computer: ${plan.target} | Node: ${process.version} | RAM: ${(os.totalmem() / 1024 ** 3).toFixed(1)} GB`);
  console.log(`Folder: ${root}\nSaved datasets: ${plan.dataDirectory}`);
  console.log(`Free disk: ${freeBytes == null ? 'unknown' : `${(freeBytes / 1024 ** 3).toFixed(1)} GB`} (allow at least 4 GB for installation)`);
  if (options.preflight || options.dryRun) {
    console.log(`\n${options.preflight ? 'PREFLIGHT' : 'DRY RUN'} - no files changed, downloads, installation, or server start.`);
    if (options.action === 'start') console.log(`Would start the installed website at ${LOCAL_URL}.`);
    else plan.steps.forEach((step, index) => console.log(`${index + 1}. ${step.label}`));
    if (!plan.enoughDisk) console.log('Not enough free space. Move this extracted folder to a drive with at least 4 GB available.');
    return;
  }
  if (!isNodeCompatible(process.version) || !npmPath()) throw new Error('Use the Install launcher to prepare Node.js 24 and npm automatically.');
  const env = {
    ...process.env,
    PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH || ''}`,
    NEXT_TELEMETRY_DISABLED: '1',
    npm_config_cache: path.join(root, '.runtime', 'npm-cache'),
  };
  if (options.action === 'start') { await start(env, options.noBrowser); return; }
  if (!plan.enoughDisk) throw new Error('At least 4 GB of free space is needed. Move this folder to another drive, then run Install again.');
  console.log('\n[1/3] Installing website dependencies. This may take several minutes.');
  await run([npmPath(), 'ci', '--include=dev', '--no-audit', '--no-fund'], env);
  console.log('\n[2/3] Preparing local settings and saved datasets.');
  fs.mkdirSync(path.join(root, 'data'), { recursive: true });
  const localEnv = path.join(root, '.env.local');
  if (!fs.existsSync(localEnv) && fs.existsSync(path.join(root, '.env.example'))) {
    fs.copyFileSync(path.join(root, '.env.example'), localEnv, fs.constants.COPYFILE_EXCL);
  }
  console.log('\n[3/3] Building the website.');
  await run([npmPath(), 'run', 'build:local'], env);
  console.log('\nREADY. Open Start to launch the website. You can browse the saved database without the backend.');
  console.log('To run a new analysis, install and start the separate backend; the website Setup page guides you.');
}

main().catch(error => { console.error(`\nSETUP STOPPED: ${error.message}`); process.exitCode = 1; });
