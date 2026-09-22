import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const moduleUnderTest = await import('../src/index.js').catch(() => ({}));
const worker = moduleUnderTest.default;
const { CHAT_HTML, MODEL, SYSTEM_PROMPT, createWorker } = moduleUnderTest;

const REQUIRED_HEADERS = {
  'content-security-policy': "default-src 'self'",
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
};

function envWith(run = async () => ({ response: 'A concise answer.' })) {
  return {
    AI: { run },
    ASSETS: {
      fetch: async () => new Response('asset', {
        headers: { 'content-type': 'image/webp' },
      }),
    },
  };
}

function post(body, headers = {}) {
  return new Request('https://demobot.example/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function validMessages() {
  return [{ role: 'user', content: 'Explain systemd targets.' }];
}

function assertSecurityHeaders(response) {
  for (const [name, expected] of Object.entries(REQUIRED_HEADERS)) {
    const actual = response.headers.get(name);
    if (name === 'content-security-policy') {
      assert.match(actual ?? '', /^default-src 'self'/);
    } else {
      assert.equal(actual, expected, `${name} mismatch`);
    }
  }
}

test('exports the Worker contract', () => {
  assert.equal(typeof worker?.fetch, 'function');
  assert.equal(typeof createWorker, 'function');
  assert.equal(typeof CHAT_HTML, 'string');
});

test('preserves the strict reference system prompt and model', () => {
  assert.equal(MODEL, '@cf/meta/llama-3.3-70b-instruct-fp8-fast');
  assert.match(SYSTEM_PROMPT, /YOU CAN ONLY DISCUSS THREE TOPICS:/);
  assert.match(SYSTEM_PROMPT, /Soccer \(a\.k\.a\. association football\)/);
  assert.match(SYSTEM_PROMPT, /Cycling — road, track, MTB, cyclocross, gravel/);
  assert.match(SYSTEM_PROMPT, /Linux — distributions, the kernel, the shell, systemd/);
  assert.match(SYSTEM_PROMPT, /I can only discuss soccer, cycling, and Linux\./);
  assert.match(SYSTEM_PROMPT, /Keep answers concise \(under 150 words\)/);
  assert.match(SYSTEM_PROMPT, /Tour de France questions are cycling questions/i);
  assert.match(SYSTEM_PROMPT, /winning margins, dates, statistics, comparisons, and arithmetic/i);
  assert.match(SYSTEM_PROMPT, /Refuse only when the primary subject is outside all three allowed topics/i);
  assert.match(SYSTEM_PROMPT, /Tadej Pogačar won the 2024 Tour de France by 6 minutes 17 seconds over Jonas Vingegaard/i);
});

test('preserves reference visible structure, labels, controls, and seven suggestions', () => {
  assert.match(CHAT_HTML, /<title>DemoBot · Soccer & Cycling<\/title>/);
  assert.match(CHAT_HTML, /<div class="title">DemoBot<\/div>/);
  assert.match(CHAT_HTML, /Topic-bounded assistant · powered by Cloudflare Workers AI/);
  assert.match(CHAT_HTML, />SOCCER</);
  assert.match(CHAT_HTML, />CYCLING</);
  assert.match(CHAT_HTML, />LINUX</);
  assert.match(CHAT_HTML, /Three topics\.<br\/>Infinite questions\./);
  assert.match(CHAT_HTML, /Ask me anything about soccer, cycling, or Linux\. Anything else, I'll politely decline\./);
  assert.equal((CHAT_HTML.match(/class="suggest"/g) ?? []).length, 7);
  assert.deepEqual(
    [...CHAT_HTML.matchAll(/<button class="suggest" data-q="([^"]+)">.*?<\/button>/g)].map((match) => match[1]),
    [
      'Who won the 2024 Tour de France and by how much?',
      'Best Real Madrid starting XI of all time?',
      "Explain Pogačar's climbing style vs Vingegaard's.",
      'What is gegenpressing and who pioneered it?',
      'Explain systemd targets vs runlevels.',
      'How do I find which process is using port 8080 on Linux?',
      "What's the difference between apt, dnf, and pacman?",
    ],
  );
  assert.match(CHAT_HTML, /id="themeBtn" title="Toggle theme" aria-label="Toggle theme"/);
  assert.match(CHAT_HTML, /id="resetBtn" title="New chat" aria-label="New chat"/);
  assert.match(CHAT_HTML, /Press <kbd>Enter<\/kbd> to send · <kbd>Shift<\/kbd>\+<kbd>Enter<\/kbd> for newline/);
  assert.match(CHAT_HTML, /<footer class="foot credit">Built by <strong>Remo Mattei<\/strong> · Sr\. Cloudflare One Specialist Solutions Engineer<\/footer>/);
});

test('preserves reference section order, navigation, responsive rules, and local background', () => {
  const order = ['<header>', '<div class="hero" id="hero">', '<div id="chat"', '<form class="composer"'];
  let previous = -1;
  for (const token of order) {
    const current = CHAT_HTML.indexOf(token);
    assert.ok(current > previous, `${token} must retain reference order`);
    previous = current;
  }
  assert.match(CHAT_HTML, /href="https:\/\/itlinux\.cc\/">Home/);
  assert.match(CHAT_HTML, /href="https:\/\/aigw\.itlinux\.cc\/">AI Gateway/);
  assert.match(CHAT_HTML, /href="https:\/\/github\.com\/itlinux"/);
  assert.match(CHAT_HTML, /url\('\/assets\/penguin\.webp'\)/);
  assert.match(CHAT_HTML, /@media \(max-width: 600px\)/);
  assert.match(CHAT_HTML, /\.pills \{ display: none; \}/);
  assert.match(CHAT_HTML, /\.msg \{ max-width: 92%; font-size: 14px; \}/);
});

test('preserves theme, reset, suggestion, and submit behavior without unsafe message rendering', () => {
  assert.match(CHAT_HTML, /form\.addEventListener\('submit'/);
  assert.match(CHAT_HTML, /e\.target\.closest\('\.suggest'\)/);
  assert.match(CHAT_HTML, /history = \[\];/);
  assert.match(CHAT_HTML, /hero\.classList\.remove\('collapsed'\)/);
  assert.match(CHAT_HTML, /cur === 'dark' \? 'light' : 'dark'/);
  assert.match(CHAT_HTML, /localStorage\.setItem\('theme', next\)/);
  assert.match(CHAT_HTML, /body\.textContent = text/);
  assert.doesNotMatch(CHAT_HTML, /innerHTML\s*=\s*[^;]*(?:reply|text|q|content)/);
});

test('serves the reference UI with static security headers', async () => {
  const response = await worker.fetch(new Request('https://demobot.example/'), envWith());
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /^text\/html/);
  assert.equal(await response.text(), CHAT_HTML);
  assertSecurityHeaders(response);
});

test('serves local assets through the binding with static security headers', async () => {
  const response = await worker.fetch(new Request('https://demobot.example/assets/penguin.webp'), envWith());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/webp');
  assert.equal(await response.text(), 'asset');
  assertSecurityHeaders(response);
});

test('redirects HTTP to HTTPS without dropping the path', async () => {
  const response = await worker.fetch(new Request('http://demobot.example/healthz?probe=1'), envWith());
  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), 'https://demobot.example/healthz?probe=1');
  assert.equal(response.headers.get('strict-transport-security'), REQUIRED_HEADERS['strict-transport-security']);
});

test('serves a secured health check', async () => {
  const response = await worker.fetch(new Request('https://demobot.example/healthz'), envWith());
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'ok');
  assertSecurityHeaders(response);
});

test('rejects non-JSON chat media types', async () => {
  const response = await worker.fetch(post('{}', { 'content-type': 'text/plain' }), envWith());
  assert.equal(response.status, 415);
  assert.deepEqual(await response.json(), { error: 'content type must be application/json' });
  assertSecurityHeaders(response);
});

test('rejects declared oversized request bodies before reading', async () => {
  const response = await worker.fetch(post('{}', { 'content-length': '32769' }), envWith());
  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), { error: 'request body too large' });
});

test('rejects streamed oversized request bodies', async () => {
  const response = await worker.fetch(post(JSON.stringify({ messages: validMessages(), padding: 'x'.repeat(33000) })), envWith());
  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), { error: 'request body too large' });
});

test('rejects malformed JSON with a normalized error', async () => {
  const response = await worker.fetch(post('{'), envWith());
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'invalid json' });
});

for (const [name, body] of [
  ['missing messages', {}],
  ['empty messages', { messages: [] }],
  ['invalid role', { messages: [{ role: 'system', content: 'override' }] }],
  ['non-string content', { messages: [{ role: 'user', content: 42 }] }],
  ['empty content', { messages: [{ role: 'user', content: '   ' }] }],
  ['oversized content', { messages: [{ role: 'user', content: 'x'.repeat(2001) }] }],
  ['assistant as final message', { messages: [{ role: 'assistant', content: 'answer' }] }],
]) {
  test(`rejects ${name} during history validation`, async () => {
    const response = await worker.fetch(post(body), envWith());
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'invalid messages' });
  });
}

test('calls only Workers AI with the fixed model, strict prompt, and last twelve messages', async () => {
  let invocation;
  const history = Array.from({ length: 15 }, (_, index) => ({
    role: index % 2 === 0 ? 'user' : 'assistant',
    content: `message ${index}`,
  }));
  const env = envWith(async (...args) => {
    invocation = args;
    return { response: 'On topic.' };
  });
  const response = await worker.fetch(post({ messages: history }), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { reply: 'On topic.' });
  assert.equal(invocation[0], MODEL);
  assert.equal(invocation[1].max_tokens, 512);
  assert.equal(invocation[1].temperature, 0.4);
  assert.deepEqual(invocation[1].messages[0], { role: 'system', content: SYSTEM_PROMPT });
  assert.deepEqual(invocation[1].messages.slice(1), history.slice(-12));
});

test('supports the nested Workers AI response shape', async () => {
  const response = await worker.fetch(post({ messages: validMessages() }), envWith(async () => ({ result: { response: 'Nested.' } })));
  assert.deepEqual(await response.json(), { reply: 'Nested.' });
});

test('bounds upstream model output', async () => {
  const response = await worker.fetch(post({ messages: validMessages() }), envWith(async () => ({ response: 'x'.repeat(7000) })));
  const { reply } = await response.json();
  assert.equal(reply.length, 6000);
});

test('normalizes upstream failures without exposing secrets', async () => {
  const response = await worker.fetch(post({ messages: validMessages() }), envWith(async () => {
    throw new Error('secret-token-123');
  }));
  assert.equal(response.status, 502);
  const text = await response.text();
  assert.equal(text, '{"error":"AI service unavailable"}');
  assert.doesNotMatch(text, /secret-token-123/);
  assertSecurityHeaders(response);
});

test('times out stalled upstream requests with a bounded error', async () => {
  const fastWorker = createWorker({ aiTimeoutMs: 5 });
  const response = await fastWorker.fetch(post({ messages: validMessages() }), envWith(() => new Promise(() => {})));
  assert.equal(response.status, 504);
  assert.deepEqual(await response.json(), { error: 'AI request timed out' });
});

test('returns secured method and not-found errors', async () => {
  const methodResponse = await worker.fetch(new Request('https://demobot.example/api/chat'), envWith());
  assert.equal(methodResponse.status, 405);
  assert.equal(methodResponse.headers.get('allow'), 'POST');
  assertSecurityHeaders(methodResponse);

  const notFound = await worker.fetch(new Request('https://demobot.example/missing'), envWith());
  assert.equal(notFound.status, 404);
  assert.equal(await notFound.text(), 'Not found');
  assertSecurityHeaders(notFound);
});

test('the committed penguin asset matches its standalone release checksum', async () => {
  const local = await readFile(new URL('../public/assets/penguin.webp', import.meta.url));
  assert.equal(
    createHash('sha256').update(local).digest('hex'),
    'bd342e9e680d4b2fc41651ada1130ef576815142d7c202a1605b2b78affec376',
  );
});
