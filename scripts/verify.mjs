import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import worker, { CHAT_HTML } from '../src/index.js';

const root = new URL('../', import.meta.url);

function assertSecurityHeaders(response) {
  assert.match(response.headers.get('content-security-policy') ?? '', /^default-src 'self'/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
}

export async function runOffline() {
  const major = Number(process.versions.node.split('.')[0]);
  assert.ok(major >= 22, `Node >=22 required; found ${process.versions.node}`);

  const config = JSON.parse(await readFile(new URL('wrangler.jsonc', root), 'utf8'));
  assert.equal(config.name, 'demobot-soccer-cycling');
  assert.deepEqual(config.ai, { binding: 'AI' });
  assert.equal('routes' in config, false);
  assert.equal('route' in config, false);
  assert.equal('account_id' in config, false);

  const asset = await stat(new URL('public/assets/penguin.webp', root));
  assert.ok(asset.isFile());

  const response = await worker.fetch(new Request('https://offline.invalid/'), {});
  assert.equal(response.status, 200);
  assertSecurityHeaders(response);
  const html = await response.text();
  assert.equal(html, CHAT_HTML);
  const suggestions = (html.match(/class="suggest"/g) ?? []).length;
  assert.equal(suggestions, 7);

  return {
    mode: 'offline',
    worker: config.name,
    suggestions,
    assetBytes: asset.size,
  };
}

export async function runLive(input, fetchImpl = fetch) {
  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error('Live verification requires a valid HTTP(S) URL');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Live verification requires an HTTP(S) URL');
  }

  const baseUrl = parsed.origin + parsed.pathname.replace(/\/$/, '');
  const health = await fetchImpl(`${baseUrl}/healthz`);
  assert.equal(health.status, 200);
  assert.equal(await health.text(), 'ok');
  assertSecurityHeaders(health);

  const home = await fetchImpl(`${baseUrl}/`);
  assert.equal(home.status, 200);
  assertSecurityHeaders(home);
  const html = await home.text();
  assert.match(html, /<title>DemoBot · Soccer & Cycling<\/title>/);
  assert.equal((html.match(/class="suggest"/g) ?? []).length, 7);

  const asset = await fetchImpl(`${baseUrl}/assets/penguin.webp`);
  assert.equal(asset.status, 200);

  return { mode: 'live', baseUrl };
}

async function main() {
  const live = process.argv[2] === '--live';
  const result = live
    ? await runLive(process.argv[3] || process.env.DEMOBOT_URL)
    : await runOffline();
  process.stdout.write(`${result.mode} verification passed: ${JSON.stringify(result)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    process.stderr.write(`verification failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
