import assert from 'node:assert/strict';
import test from 'node:test';
import { installFixtures } from '../scripts/docs/fixtures.mjs';

test('documentation intercepts analysis mutations and unknown routes instead of forwarding them', async () => {
  const handlers = new Map();
  const state = await installFixtures({ route: async (pattern, handler) => handlers.set(pattern, handler) });
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
