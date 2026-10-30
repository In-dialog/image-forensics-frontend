import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import { createRequire } from 'node:module';
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { dataset, sections, viewport } from './guide.mjs';
import { documentationDataRoot, installFixtures } from './fixtures.mjs';
import { renderGuide, root } from './render.mjs';

const args = process.argv.slice(2);
function option(name) { const at = args.indexOf(name); return at < 0 ? undefined : args[at + 1]; }
if (args.includes('--help')) {
  console.log('Capture the user guide. Options: --base-url URL (reuse a frontend), --only SCREEN_ID, --channel chrome|msedge|chromium.\nWithout --base-url, start and stop an isolated frontend on a free local port. No backend or model is started.\nPLAYWRIGHT_MODULE can point to an existing Playwright installation.');
  process.exit(0);
}
let owned, browser, logHandle;
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await browser?.close().catch(() => {});
  if (owned && owned.exitCode === null) {
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(owned.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    else { try { process.kill(-owned.pid, 'SIGTERM'); } catch { /* Already exited. */ } }
    await Promise.race([new Promise(resolve => owned.once('exit', resolve)), new Promise(resolve => setTimeout(resolve, 5000))]);
    if (process.platform !== 'win32') { try { process.kill(-owned.pid, 'SIGKILL'); } catch { /* No remaining children. */ } }
  }
  await logHandle?.close();
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void stop().finally(() => process.exit(130)); });

async function playwright() {
  try {
    if (process.env.PLAYWRIGHT_MODULE) return createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE);
    return await import('playwright');
  } catch {
    throw new Error('Playwright is needed only to refresh documentation. See docs/SCREENSHOTS.md. No dependency or browser was installed.');
  }
}
async function startFrontend() {
  if (option('--base-url')) {
    const supplied = new URL(option('--base-url'));
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(supplied.hostname)) throw new Error('Use a local frontend URL for documentation capture.');
    return supplied.origin;
  }
  const port = await new Promise((resolve, reject) => {
    const server = net.createServer(); server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); });
  });
  const cli = path.join(root, 'node_modules/next/dist/bin/next');
  await fs.access(cli);
  await fs.mkdir(path.join(root, 'test-results'), { recursive: true });
  logHandle = await fs.open(path.join(root, 'test-results/docs-server.log'), 'w');
  owned = spawn(process.execPath, [cli, 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: root, windowsHide: true, detached: process.platform !== 'win32',
    stdio: ['ignore', logHandle.fd, logHandle.fd],
    // A frontend accidentally reaching a backend must fail, not submit a real job.
    env: { ...process.env, ANALYSIS_DATA_DIR: documentationDataRoot, ANALYSIS_API_URL: 'http://127.0.0.1:1', NEXT_TELEMETRY_DISABLED: '1' },
  });
  let spawnError;
  owned.once('error', error => { spawnError = error; });
  const origin = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    if (spawnError) throw spawnError;
    if (owned.exitCode !== null) throw new Error('Documentation frontend stopped. See test-results/docs-server.log.');
    try { const response = await fetch(origin, { signal: AbortSignal.timeout(2000) }); await response.body?.cancel(); if (response.ok) return origin; } catch { /* Starting. */ }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  throw new Error('Documentation frontend did not become ready. See test-results/docs-server.log.');
}

async function prepare(page, section, state, origin) {
  state.mode = ['progress', 'resume'].includes(section.screen) ? section.screen : 'setup';
  const goto = route => page.goto(`${origin}${route}`, { waitUntil: 'domcontentloaded' });
  if (section.screen === 'home') return goto('/');
  if (section.screen === 'database') { await goto('/results'); return page.locator('.dataset-gallery__card').first().waitFor(); }
  if (['executor', 'detection', 'questions', 'rankings', 'progress', 'resume'].includes(section.screen)) {
    await goto('/analysis');
    if (section.screen === 'progress') return page.getByRole('region', { name: 'Current stage progress', exact: true }).waitFor();
    await page.getByRole('tab', { name: 'Executor', exact: true }).waitFor();
    if (section.screen === 'executor') {
      await page.getByLabel('Choose image', { exact: true }).setInputFiles(path.join(documentationDataRoot, dataset, 'original/original.webp'));
      await page.getByRole('button', { name: 'Start analysis', exact: false }).waitFor();
    } else if (section.screen === 'resume') {
      await page.getByRole('button', { name: /^Unfinished/ }).click();
      await page.getByRole('dialog', { name: 'Unfinished analyses' }).waitFor();
    } else {
      const tab = { detection: 'Extract Objects', questions: 'Image Description', rankings: 'Full Image Rankings' }[section.screen];
      await page.getByRole('tab', { name: tab, exact: true }).click();
      if (section.screen === 'questions') {
        await page.locator('label:has-text("What do you want to know?") textarea').scrollIntoViewIfNeeded();
      }
      if (section.screen === 'rankings') {
        await page.getByLabel('Highest score', { exact: true }).scrollIntoViewIfNeeded();
        await page.getByRole('tabpanel').evaluate(panel => {
          const heading = [...panel.querySelectorAll('h3')].find(el => el.textContent.startsWith('Criteria'));
          panel.scrollTop += heading.getBoundingClientRect().top - panel.getBoundingClientRect().top - 16;
        });
      }
    }
    return;
  }
  await goto(`/results/${dataset}`);
  await page.getByRole('group', { name: 'Image views' }).waitFor();
  if (section.screen === 'viewer') return;
  await page.getByRole('group', { name: 'Image views' }).getByRole('button', { name: 'Semantics', exact: true }).click();
  await page.getByRole('region', { name: 'Whole-image ratings', exact: true }).getByRole('region', { name: 'Rating gauges' }).waitFor();
  await page.waitForFunction(() => Math.abs(document.querySelector('section[aria-label="Semantics"]').getBoundingClientRect().x) < 2);
  if (section.screen === 'groups' || section.screen === 'item') {
    const clusters = page.getByRole('region', { name: 'Semantic clusters', exact: true });
    await clusters.scrollIntoViewIfNeeded();
    if (section.screen === 'item') {
      await clusters.getByRole('button').first().click();
      await page.getByRole('region', { name: 'Selected group items' }).getByRole('button').nth(1).click();
      await page.getByRole('dialog', { name: 'Item analysis' }).waitFor();
    }
  }
}

async function annotate(page, section) {
  const marks = [];
  for (const [index, mark] of section.marks.entries()) {
    const locator = page.locator(mark.selector).first();
    await locator.waitFor({ state: 'visible' });
    const box = await locator.boundingBox();
    if (!box || box.y >= viewport.height || box.y + box.height <= 0) throw new Error(`${section.id}: callout ${index + 1} is outside the screenshot: ${mark.selector}`);
    marks.push({ ...mark, box, number: index + 1 });
  }
  await page.evaluate(({ marks, demonstration }) => {
    document.getElementById('documentation-callouts')?.remove();
    const ns = 'http://www.w3.org/2000/svg';
    const host = document.createElement('div');
    host.id = 'documentation-callouts';
    const svg = document.createElementNS(ns, 'svg');
    Object.assign(svg.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', zIndex: '2147483647', pointerEvents: 'none' });
    const element = (tag, attributes) => { const el = document.createElementNS(ns, tag); for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, value); svg.append(el); return el; };
    for (const { box, number, placement } of marks) {
      const x = Math.max(4, box.x), y = Math.max(4, box.y), width = Math.min(box.width, innerWidth - x - 4), height = Math.min(box.height, innerHeight - y - 4);
      element('rect', { x: x - 3, y: y - 3, width: width + 6, height: height + 6, rx: 3, fill: 'none', stroke: '#eff5f0', 'stroke-width': 1.5, 'stroke-dasharray': '5 4' });
      let cx = placement === 'right' ? x + width + 20 : placement === 'left' ? x - 20 : x + Math.min(width / 2, 65);
      let cy = placement === 'top' ? y - 20 : placement === 'bottom' ? y + height + 20 : y + Math.min(height / 2, 28);
      cx = Math.max(20, Math.min(innerWidth - 20, cx)); cy = Math.max(20, Math.min(innerHeight - 20, cy));
      element('circle', { cx, cy, r: 15, fill: '#f5f8f5', stroke: '#101814', 'stroke-width': 2 });
      element('text', { x: cx, y: cy + 1, 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: '#101814', 'font-family': 'Arial,sans-serif', 'font-size': 17, 'font-weight': '700' }).textContent = number;
    }
    if (demonstration) {
      element('rect', { x: innerWidth - 238, y: innerHeight - 27, width: 230, height: 20, fill: '#0a100d' });
      element('text', { x: innerWidth - 18, y: innerHeight - 13, fill: '#eff5f0', 'text-anchor': 'end', 'font-family': 'monospace', 'font-size': 11 }).textContent = 'DOCUMENTATION / SAMPLE RUN';
    }
    // Dialogs occupy the browser top layer. Put the annotation SVG in that layer too.
    host.setAttribute('popover', 'manual'); host.append(svg); document.body.append(host); host.showPopover();
    Object.assign(host.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', margin: '0', padding: '0', border: '0', background: 'transparent', maxWidth: 'none', maxHeight: 'none', pointerEvents: 'none' });
  }, { marks, demonstration: section.demonstration });
}

try {
  const { chromium } = await playwright();
  const origin = await startFrontend();
  console.log('Capturing the released UI with offline analysis fixtures. No GPU jobs will run.');
  const channel = option('--channel') || process.env.DOCS_BROWSER_CHANNEL || 'chrome';
  browser = await chromium.launch({ headless: true, ...(channel === 'chromium' ? {} : { channel }) });
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, colorScheme: 'dark', reducedMotion: 'reduce', locale: 'en-GB', timezoneId: 'UTC' });
  const state = await installFixtures(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const images = path.join(root, 'docs/images/guide');
  await fs.mkdir(images, { recursive: true });
  const selected = option('--only') ? sections.filter(section => section.id === option('--only')) : sections;
  if (!selected.length) throw new Error('Unknown --only screen ID. See scripts/docs/guide.mjs.');
  for (const section of selected) {
    console.log(`Capture ${section.id}: ${section.title}`);
    await prepare(page, section, state, origin);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600); // Allow view transitions and image layout to settle.
    await page.waitForFunction(() => [...document.images].filter(img => { const r = img.getBoundingClientRect(); return r.width && r.height && r.top < innerHeight && r.bottom > 0; }).every(img => img.complete && img.naturalWidth > 0));
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
    await annotate(page, section);
    await page.mouse.move(0, 0);
    await page.screenshot({ path: path.join(images, `${section.id}.png`), animations: 'disabled' });
  }
  if (errors.length || state.blocked.length) throw new Error(JSON.stringify({ pageErrors: errors, blockedRequests: state.blocked }, null, 2));
  let revision = 'uncommitted';
  try { revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(); } catch { /* ZIP installs have no Git metadata. */ }
  const report = { sourceRevision: revision, capturedAt: new Date().toISOString(), viewport, dataset, screens: selected.map(section => section.id), analysisNetwork: 'fully intercepted; GET-only fixtures', pageErrors: errors, blockedRequests: state.blocked };
  await fs.writeFile(path.join(images, 'capture.json'), JSON.stringify(report, null, 2) + '\n');
  await renderGuide();
} finally {
  await stop();
}
