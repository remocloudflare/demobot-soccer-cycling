import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8').catch(() => '');

test('README documents required standalone operations and safeguards', () => {
  for (const heading of [
    '## Architecture',
    '## Deployment',
    '## Current live and preview URLs',
    '## Security',
    '## Cost caveat',
    '## Verification',
  ]) {
    assert.match(readme, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  const legacyTerms = ['roll' + 'back', 'itlinux' + '-mesh', 'previous' + ' owner', 'demo' + '-coder-nginx'];
  for (const term of legacyTerms) assert.doesNotMatch(readme, new RegExp(term, 'i'));
  assert.match(readme, /https:\/\/demobot\.itlinux\.cc\//);
  assert.match(readme, /https:\/\/demobot-soccer-cycling\.rm-815\.workers\.dev\//);
  assert.match(readme, /Workers AI usage.*charges/i);
  assert.match(readme, /wrangler deploy --dry-run/);
  assert.match(readme, /npm run verify -- --live/);
});
