import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/index.js';

test('search uses browser Key first and falls back to the server Key', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async url => {
    requests.push(new URL(url));
    return Response.json({ status: '1', pois: [] });
  };
  try {
    for (const mode of ['text', 'around']) {
      const url = '/api/search?mode=' + mode + '&q=test&lat=22.5&lon=113.5';
      const local = await app.request(url, { headers: { 'X-AMap-Key': 'browser-test-key' } }, { AMAP_KEY: 'server-test-key' });
      assert.equal(local.status, 200);
      assert.equal(requests.at(-1).searchParams.get('key'), 'browser-test-key');
      const fallback = await app.request(url, {}, { AMAP_KEY: 'server-test-key' });
      assert.equal(fallback.status, 200);
      assert.equal(requests.at(-1).searchParams.get('key'), 'server-test-key');
      const browserOnly = await app.request(url, { headers: { 'X-AMap-Key': 'browser-test-key' } }, {});
      assert.equal(browserOnly.status, 200);
      assert.equal(requests.at(-1).searchParams.get('key'), 'browser-test-key');
      const count = requests.length;
      const missing = await app.request(url, {}, {});
      assert.equal(missing.status, 503);
      assert.equal(requests.length, count);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
