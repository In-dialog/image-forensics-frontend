import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { assertPrivateRuntime, buildInstallPlan, isNodeCompatible, MINIMUM_DISK_BYTES, parseOptions, supportedPlatform } from '../install/plan.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

test('plan selects every supported Windows/macOS architecture without dependencies', () => {
  for (const platform of ['win32', 'darwin']) for (const arch of ['x64', 'arm64']) {
    const plan = buildInstallPlan({ root, platform, arch, nodeVersion: 'v22.16.0', freeBytes: MINIMUM_DISK_BYTES });
    assert.equal(plan.steps[0].kind, 'runtime');
    assert.equal(plan.steps.at(-1).kind, 'build');
    assert.equal(plan.dataDirectory, path.join(root, 'data'));
    assert.equal(plan.enoughDisk, true);
  }
  assert.throws(() => supportedPlatform('win32', 'ia32'), /64-bit/);
  assert.throws(() => supportedPlatform('linux', 'x64'), /Windows/);
});

test('compatible Node skips runtime download; disk preflight prevents an undersized install', () => {
  assert.equal(isNodeCompatible('v24.22.1'), true);
  for (const version of ['v20.0.0', 'v22.16.0', 'v26.0.0', 'v24.0.0-nightly', 'garbage']) assert.equal(isNodeCompatible(version), false);
  const plan = buildInstallPlan({ root, platform: 'darwin', arch: 'arm64', nodeVersion: 'v24.1.0', freeBytes: 100 });
  assert.equal(plan.steps.some(step => step.kind === 'runtime'), false);
  assert.equal(plan.enoughDisk, false);
});

test('options distinguish preview from executing install or starting the server', () => {
  assert.deepEqual(parseOptions(['start', '--dry-run', '--no-browser']), { action: 'start', dryRun: true, preflight: false, noBrowser: true });
  assert.equal(parseOptions(['--preflight']).preflight, true);
  assert.throws(() => parseOptions(['--download']), /Unknown/);
  assert.throws(() => parseOptions(['install', 'start']), /one action/);
});

test('actual setup dry runs leave runtime, settings, and builds untouched', { skip: !['win32', 'darwin'].includes(process.platform) }, () => {
  const watched = ['.runtime', '.env.local', '.next', 'node_modules'];
  const before = watched.map(name => { const target = path.join(root, name); return fs.existsSync(target) ? fs.statSync(target).mtimeMs : null; });
  for (const action of ['install', 'start']) {
    const result = spawnSync(process.execPath, [path.join(root, 'install/setup.mjs'), action, '--dry-run'], { encoding: 'utf8', timeout: 10000 });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /no files changed, downloads, installation, or server start/);
  }
  const after = watched.map(name => { const target = path.join(root, name); return fs.existsSync(target) ? fs.statSync(target).mtimeMs : null; });
  assert.deepEqual(after, before);
});

test('Windows bootstrap preflight works without installing a missing Node24 runtime', { skip: process.platform !== 'win32' }, () => {
  const runtime = path.join(root, '.runtime');
  const existed = fs.existsSync(runtime);
  const result = spawnSync('powershell.exe', ['-NoProfile', '-File', path.join(root, 'install/windows.ps1'), '-DryRun', '-NoPause'], { encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /OFFLINE CHECK/);
  assert.equal(fs.existsSync(runtime), existed);
});

const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : '/bin/bash';
test('macOS bootstrap syntax and simulated Intel/Apple Silicon preflight stay offline', { skip: !fs.existsSync(bash) }, () => {
  const script = path.join(root, 'install/macos.sh');
  const syntax = spawnSync(bash, ['-n', script], { encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);
  const runtime = path.join(root, '.runtime');
  const existed = fs.existsSync(runtime);
  for (const architecture of ['x86_64', 'arm64']) {
    // Fake only OS probes. The real bootstrap still runs its actual offline branch.
    const command = `
      uname() { if [ "$1" = -s ]; then printf Darwin; else printf '%s' "$SIMULATED_ARCH"; fi; }
      sw_vers() { printf '13.5'; }
      sysctl() { return 1; }
      df() { printf 'Filesystem 1024-blocks Used Available Capacity Mounted\nmock 20000000 1000 10000000 1%% /\n'; }
      curl() { printf 'NETWORK MUST NOT RUN' >&2; return 90; }
      export -f uname sw_vers sysctl df curl
      /bin/bash "$1" install --preflight --no-pause
    `;
    const result = spawnSync(bash, ['-c', command, 'offline-test', script], {
      encoding: 'utf8', timeout: 10000, env: { ...process.env, SIMULATED_ARCH: architecture },
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /OFFLINE CHECK/);
    assert.doesNotMatch(result.stderr, /NETWORK MUST NOT RUN/);
  }
  assert.equal(fs.existsSync(runtime), existed);
});

test('every installer entry rejects redirected runtime directories without touching their target', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'forensics-runtime-links-'));
  try {
    for (const relative of ['.runtime', '.runtime/node', '.runtime/npm-cache']) {
      const fixture = path.join(temporary, relative.replaceAll('/', '-'));
      const outside = path.join(temporary, `outside-${relative.replaceAll('/', '-')}`);
      fs.mkdirSync(fixture);
      fs.mkdirSync(outside);
      fs.writeFileSync(path.join(outside, 'keep.txt'), 'Do not change this external directory.');
      fs.cpSync(path.join(root, 'install'), path.join(fixture, 'install'), { recursive: true });
      const link = path.join(fixture, relative);
      fs.mkdirSync(path.dirname(link), { recursive: true });
      fs.symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
      assert.throws(() => assertPrivateRuntime(fixture), /Unsafe runtime/);
      const nodeCheck = spawnSync(process.execPath, [path.join(fixture, 'install/setup.mjs'), '--preflight'], { encoding: 'utf8', timeout: 10000 });
      assert.equal(nodeCheck.status, 1);
      assert.match(nodeCheck.stderr, /Unsafe runtime/);
      if (process.platform === 'win32') {
        const windowsCheck = spawnSync('powershell.exe', ['-NoProfile', '-File', path.join(fixture, 'install/windows.ps1'), '-Preflight'], { encoding: 'utf8', timeout: 10000 });
        assert.equal(windowsCheck.status, 1, windowsCheck.stdout + windowsCheck.stderr);
        assert.match(windowsCheck.stdout, /Unsafe runtime/);
      }
      if (fs.existsSync(bash)) {
        const macCheck = spawnSync(bash, [path.join(fixture, 'install/macos.sh'), 'install', '--preflight', '--no-pause'], { encoding: 'utf8', timeout: 10000 });
        assert.equal(macCheck.status, 1, macCheck.stdout + macCheck.stderr);
        assert.match(macCheck.stderr, /Unsafe runtime/);
      }
      assert.equal(fs.readFileSync(path.join(outside, 'keep.txt'), 'utf8'), 'Do not change this external directory.');
      assert.deepEqual(fs.readdirSync(outside), ['keep.txt']);
      assert.equal(fs.lstatSync(link).isSymbolicLink(), true);
      // Unlink the fixture junction explicitly before removing temporary folders.
      fs.unlinkSync(link);
    }
  } finally {
    if (path.dirname(temporary) === os.tmpdir() && path.basename(temporary).startsWith('forensics-runtime-links-')) {
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  }
});
