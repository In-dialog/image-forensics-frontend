import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { installFixtures } from '../scripts/docs/fixtures.mjs';
import { dataset } from '../scripts/docs/guide.mjs';

test('documentation intercepts analysis mutations and unknown routes instead of forwarding them', async t => {
  const dataRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'image-forensics-docs-test-'));
  t.after(async () => {
    // Remove only the files and directories created by this test.
    await fs.unlink(path.join(dataRoot, dataset, 'metadata.json'));
    await fs.rmdir(path.join(dataRoot, dataset));
    await fs.rmdir(dataRoot);
  });
  await fs.mkdir(path.join(dataRoot, dataset));
  await fs.writeFile(path.join(dataRoot, dataset, 'metadata.json'), JSON.stringify({ extracts: [] }));
  const handlers = new Map();
  const state = await installFixtures({ route: async (pattern, handler) => handlers.set(pattern, handler) }, { dataRoot });
  const handler = handlers.get('**/api/analysis/**');
  async function request(method, pathname) {
    let response;
    await handler({ request: () => ({ method: () => method, url: () => `http://127.0.0.1:3100${pathname}` }),
      fulfill: async value => { response = value; }, continue: () => assert.fail('No request may reach a real backend') });
    return response;
  }
  assert.equal((await request('POST', '/api/analysis/jobs')).status, 405);
  assert.equal((await request('DELETE', '/api/analysis/jobs/private-run')).status, 405);
  assert.equal((await request('GET', '/api/analysis/secrets')).status, 404);
  assert.equal(state.blocked.length, 3);
  const configuration = await request('GET', '/api/analysis/config');
  assert.ok(configuration.json.stages.length > 0);
  assert.equal(configuration.json.active_job_id, null);
  state.mode = 'progress';
  const progress = await request('GET', '/api/analysis/jobs');
  assert.equal(progress.json.jobs[0].id, 'documentation-run');
  assert.ok(progress.json.jobs[0].stages.some(stage => stage.substeps?.length));
  state.mode = 'resume';
  assert.deepEqual((await request('GET', '/api/analysis/jobs')).json.jobs.map(job => job.status), ['interrupted', 'failed']);
  const forbiddenPreview = await request('GET', '/api/analysis/jobs/documentation-run/preview/../../.env');
  assert.equal(forbiddenPreview.status, 404);
});
