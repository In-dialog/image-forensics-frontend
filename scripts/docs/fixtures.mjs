import fs from 'node:fs/promises';
import path from 'node:path';
import { root } from './render.mjs';
import { dataset } from './guide.mjs';

export async function installFixtures(context) {
  const config = JSON.parse(await fs.readFile(path.join(root, 'scripts/docs/fixtures/config.json'), 'utf8'));
  const selected = config.stages.filter(stage => config.settings.selected_stages.includes(stage.key));
  const activeIndex = selected.findIndex(stage => stage.key === 'analyze_segments');
  const job = {
    id: 'documentation-run', status: 'running', original_filename: 'example-scene.webp',
    stage_key: selected[activeIndex].key, completed_stages: activeIndex, total_stages: selected.length,
    stages: selected.map((stage, index) => ({ ...stage, status: index < activeIndex ? 'succeeded' : index === activeIndex ? 'running' : 'pending' })),
    created_at: '2026-01-01T12:00:00Z', updated_at: '2026-01-01T12:01:00Z', error: null, result_id: null,
    logs: ['Analyze Segments: started', 'Finding visible parts in detected objects', 'Finding parts: item 6 of 16 — checking scene context'],
  };
  const step = (label, status, completed, total, extra = {}) => ({ label, status, completed, total, unit: 'items', current: null, activity: null, skipped: 0, failed: 0, ...extra });
  job.stages[activeIndex].current_substep = 2;
  job.stages[activeIndex].substeps = [step('Prepare items', 'succeeded', 16, 16), step('Find parts', 'running', 5, 16, { current: 'shirt graphic', activity: 'Checking the target against its scene context' }), step('Save results', 'pending', 0, null)];
  const unfinished = [
    { ...structuredClone(job), id: 'documentation-interrupted', original_filename: 'example-scene.webp', status: 'interrupted', error: 'The backend stopped before this run finished.' },
    { ...structuredClone(job), id: 'documentation-failed', original_filename: 'example-detail.webp', status: 'failed', created_at: '2026-01-01T13:00:00Z', error: 'The model service was unavailable.' },
  ];
  const state = { mode: 'setup', requests: [], blocked: [] };
  const folder = path.join(root, 'data', dataset);
  const metadata = JSON.parse(await fs.readFile(path.join(folder, 'metadata.json'), 'utf8'));
  const previews = [{ path: 'original/original.webp', label: 'Original scene', version: 'guide' }];
  for (const name of ['sam_results_overlay.png', 'vision_boxes_overlay.png']) {
    try { await fs.access(path.join(folder, name)); previews.unshift({ path: name, label: name.startsWith('sam') ? 'Extracted regions' : 'Detected regions', version: 'guide' }); } catch { /* Optional saved output. */ }
  }
  for (const item of metadata.extracts.slice(0, 3)) {
    const relative = item.image_path || `segments/${item.name}.webp`;
    try { await fs.access(path.join(folder, relative)); previews.push({ path: relative, label: item.name.replaceAll('_', ' '), version: 'guide' }); } catch { /* Optional crop. */ }
  }
  // Every analysis request is intercepted. Never forward a read or mutation to
  // a real backend. Unrecognized routes fail closed and fail the capture.
  await context.route('**/api/analysis/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    state.requests.push(`${request.method()} ${url.pathname}`);
    if (request.method() !== 'GET') {
      state.blocked.push(`${request.method()} ${url.pathname}`);
      return route.fulfill({ status: 405, json: { error: 'Documentation capture cannot modify analyses.' } });
    }
    if (url.pathname.endsWith('/config')) return route.fulfill({ json: { ...config, active_job_id: state.mode === 'progress' ? job.id : null } });
    const jobs = state.mode === 'progress' ? [job] : state.mode === 'resume' ? unfinished : [];
    if (url.pathname.endsWith('/jobs')) return route.fulfill({ json: { jobs } });
    if (url.pathname.endsWith('/previews')) return route.fulfill({ json: { previews } });
    if (url.pathname.includes('/preview/')) {
      const relative = decodeURIComponent(url.pathname.split('/preview/')[1]);
      const allowed = previews.find(item => item.path === relative);
      if (allowed) return route.fulfill({ path: path.join(folder, allowed.path) });
    }
    const found = jobs.find(item => url.pathname.endsWith(`/jobs/${item.id}`));
    if (found) return route.fulfill({ json: { job: found } });
    state.blocked.push(`Unexpected GET ${url.pathname}`);
    return route.fulfill({ status: 404, json: { error: 'Unknown documentation fixture.' } });
  });
  await context.route('**/api/datasets', route => route.fulfill({ json: { datasets: [{ id: dataset, name: 'Example scene analysis', basePath: `/api/datasets/${dataset}/files`, previewUrl: `/api/datasets/${dataset}/files/original/original.webp` }] } }));
  return state;
}
