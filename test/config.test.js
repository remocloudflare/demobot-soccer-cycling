import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8').catch(() => '{}'));
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

test('uses the standalone Worker identity and Workers AI binding', () => {
  assert.equal(config.name, 'demobot-soccer-cycling');
  assert.equal(config.main, 'src/index.js');
  assert.deepEqual(config.ai, { binding: 'AI' });
  assert.equal(config.vars?.MODEL, '@cf/meta/llama-3.3-70b-instruct-fp8-fast');
});

test('packages local static assets and runs the Worker first for security headers', () => {
  assert.deepEqual(config.assets, {
    directory: './public',
    binding: 'ASSETS',
    run_worker_first: true,
  });
});

test('omits routes, custom domains, and account-specific identifiers', () => {
  assert.equal('routes' in config, false);
  assert.equal('route' in config, false);
  assert.equal('account_id' in config, false);
  assert.doesNotMatch(JSON.stringify(config), /custom_domain/i);
});

test('requires Node 22 or newer and uses built-in Node tests', () => {
  assert.equal(pkg.engines.node, '>=22');
  assert.equal(pkg.scripts.test, 'node --test');
  assert.equal('vitest' in (pkg.devDependencies ?? {}), false);
});
