import assert from 'node:assert/strict';
import test from 'node:test';

const verifyModule = await import('../scripts/verify.mjs').catch(() => ({}));
const { runOffline, runLive } = verifyModule;

test('offline verifier checks the packaged Worker without network access', async () => {
  assert.equal(typeof runOffline, 'function');
  const result = await runOffline();
  assert.equal(result.mode, 'offline');
  assert.equal(result.worker, 'demobot-soccer-cycling');
  assert.equal(result.suggestions, 7);
  assert.equal(result.assetBytes, 70996);
});

test('live verifier checks a supplied preview base URL without invoking paid AI', async () => {
  assert.equal(typeof runLive, 'function');
  const seen = [];
  const fakeFetch = async (url) => {
    seen.push(url);
    if (url.endsWith('/healthz')) {
      return new Response('ok', {
        headers: {
          'content-security-policy': "default-src 'self'",
          'x-content-type-options': 'nosniff',
        },
      });
    }
    return new Response('<title>DemoBot · Soccer & Cycling</title><button class="suggest"></button>'.repeat(7), {
      headers: {
        'content-security-policy': "default-src 'self'",
        'x-content-type-options': 'nosniff',
      },
    });
  };
  const result = await runLive('https://preview.example/', fakeFetch);
  assert.equal(result.mode, 'live');
  assert.equal(result.baseUrl, 'https://preview.example');
  assert.deepEqual(seen, [
    'https://preview.example/healthz',
    'https://preview.example/',
    'https://preview.example/assets/penguin.webp',
  ]);
});

test('live verifier requires an HTTP(S) URL', async () => {
  await assert.rejects(() => runLive('file:///tmp/demo'), /HTTP\(S\) URL/);
});
