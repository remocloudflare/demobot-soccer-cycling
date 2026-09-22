// demo-bot: Cloudflare Worker chat bot with a hard topic guardrail.
// Only answers questions about soccer (football) and cycling.
// Off-topic → polite refusal.

export const SYSTEM_PROMPT = `You are DemoBot, a focused assistant.

YOU CAN ONLY DISCUSS THREE TOPICS:
1. Soccer (a.k.a. association football) — clubs, players, leagues, tournaments, tactics, history, stats.
2. Cycling — road, track, MTB, cyclocross, gravel; pro racing (Tour de France, Giro, Vuelta, Classics), teams, riders, gear, training.
3. Linux — distributions, the kernel, the shell, systemd, package managers, networking, containers, sysadmin, troubleshooting, history, FOSS culture.

RULES (strict):
- Scope is determined by the subject, not the form of the question. Winning margins, dates, statistics, comparisons, and arithmetic are allowed when they concern soccer, cycling, or Linux.
- Tour de France questions are cycling questions. Questions about its winners, stages, standings, time gaps, and winning margins must be answered.
- Verified cycling fact for the built-in demo prompt: Tadej Pogačar won the 2024 Tour de France by 6 minutes 17 seconds over Jonas Vingegaard.
- Refuse only when the primary subject is outside all three allowed topics. Do not refuse an allowed-topic question merely because answering requires a date, number, calculation, statistic, or historical fact.
- If the user asks about anything else (other sports, other operating systems, news unrelated to the allowed topics, recipes, politics, jokes, general knowledge, weather, etc.), refuse politely with exactly this template:
  "I can only discuss soccer, cycling, and Linux. Ask me about a match, a race, a rider, a distro, or a shell command — happy to help."
- Do NOT speculate about banned topics, do NOT answer "just this once," do NOT roleplay around the rule.
- Greetings and small talk are OK only as a brief lead-in to one of the three topics.
- If a question is ambiguous (e.g. "Messi"), answer in the soccer context. If ambiguous between Linux and a sport, ask which the user means.
- Keep answers concise (under 150 words) unless asked for depth.
- For shell commands and config snippets, use fenced-style formatting (triple backticks) so they're easy to copy.
- If asked about more than one of the three topics in one message, answer each briefly.

Stay on-topic. Always.`;

export const CHAT_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>DemoBot · Soccer & Cycling</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
  :root {
    --bg-0: #06060a;
    --bg-1: #0e0e14;
    --bg-2: #161620;
    --fg: #f5f5fa;
    --fg-mute: #9999b0;
    --accent-1: #ff7a18;   /* orange - primary highlight */
    --accent-1b: #ffb347;  /* lighter orange for gradient stops */
    --accent-2: #06b6d4;   /* cyan - cycling */
    --accent-3: #facc15;   /* amber - soccer accent */
    --accent-4: #22c55e;   /* green - linux (Tux-ish) */
    --border: rgba(255,255,255,0.08);
    --glass: rgba(255,255,255,0.04);
    --glass-strong: rgba(255,255,255,0.07);
    --shadow: 0 20px 60px -20px rgba(0,0,0,0.6);
  }
  [data-theme="light"] {
    --bg-0: #f7f7fb;
    --bg-1: #ffffff;
    --bg-2: #f0f0f5;
    --fg: #15151c;
    --fg-mute: #5a5a72;
    --border: rgba(0,0,0,0.08);
    --glass: rgba(255,255,255,0.7);
    --glass-strong: rgba(255,255,255,0.9);
    --shadow: 0 20px 50px -20px rgba(0,0,0,0.15);
  }

  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; height: 100%; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: var(--fg);
    background: var(--bg-0);
    overflow: hidden;
    position: relative;
    -webkit-font-smoothing: antialiased;
  }

  /* Shared itlinux.cc penguin background — Factory treatment */
  .bg-image {
    position: fixed; inset: 0; z-index: 0; pointer-events: none;
    background-image:
      linear-gradient(180deg, rgba(5,5,5,.55) 0%, rgba(5,5,5,.66) 36%, rgba(5,5,5,.96) 100%),
      url('/assets/penguin.webp');
    background-size: cover;
    background-position: center top;
    background-repeat: no-repeat;
  }
  [data-theme="light"] .bg-image {
    background-image:
      linear-gradient(180deg, rgba(247,247,251,.72) 0%, rgba(247,247,251,.82) 48%, rgba(247,247,251,.96) 100%),
      url('/assets/penguin.webp');
  }

  /* Factory-style warm center glow */
  .bg-mesh {
    position: fixed; inset: 0; z-index: 0; pointer-events: none;
    background: radial-gradient(at 50% 15%, rgba(249,115,22,.18) 0%, transparent 58%);
  }

  /* Grain overlay */
  .grain {
    position: fixed; inset: 0; z-index: 1; pointer-events: none; opacity: 0.08;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
  }

  .app {
    position: relative; z-index: 2;
    display: flex; flex-direction: column;
    height: 100vh; max-width: 920px; margin: 0 auto;
    padding: 16px;
  }

  /* Header */
  header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px;
    background: var(--glass);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid var(--border);
    border-radius: 18px;
    box-shadow: var(--shadow);
  }
  .brand { display: flex; align-items: center; gap: 12px; }
  .logo {
    width: 40px; height: 40px; border-radius: 12px;
    background: linear-gradient(135deg, var(--accent-1), var(--accent-1b));
    display: grid; place-items: center; color: #fff;
    font-weight: 800; font-size: 18px;
    box-shadow: 0 6px 20px -4px var(--accent-1);
    position: relative;
  }
  .logo::after {
    content: ''; position: absolute; inset: -2px; border-radius: 14px;
    background: linear-gradient(135deg, var(--accent-1), var(--accent-1b), var(--accent-3));
    z-index: -1; opacity: 0.6; filter: blur(10px);
  }
  .title { font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }
  .subtitle { font-size: 12px; color: var(--fg-mute); margin-top: 2px; }
  .pills { display: flex; gap: 6px; margin-top: 4px; }
  .pill {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
    padding: 3px 8px; border-radius: 999px;
    background: var(--glass-strong); border: 1px solid var(--border);
    color: var(--fg-mute);
  }
  .pill.soccer { color: var(--accent-3); border-color: color-mix(in srgb, var(--accent-3) 30%, transparent); }
  .pill.cycling { color: var(--accent-2); border-color: color-mix(in srgb, var(--accent-2) 30%, transparent); }
  .pill.linux { color: var(--accent-4); border-color: color-mix(in srgb, var(--accent-4) 30%, transparent); }
  .pill .dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }

  .controls { display: flex; gap: 8px; align-items: center; }
  .navlink {
    font-size: 13px; font-weight: 600; color: var(--fg-mute);
    padding: 8px 12px; border-radius: 10px; white-space: nowrap;
    border: 1px solid transparent; transition: color .18s, background .2s, border-color .2s;
  }
  .navlink:hover { color: var(--fg); background: var(--glass-strong); border-color: var(--border); }
  .iconbtn {
    width: 38px; height: 38px; border-radius: 10px;
    background: var(--glass-strong); border: 1px solid var(--border);
    display: grid; place-items: center; cursor: pointer; color: var(--fg);
    transition: transform 0.15s, background 0.2s;
  }
  .iconbtn:hover { transform: translateY(-1px); background: color-mix(in srgb, var(--accent-1) 18%, var(--glass-strong)); }
  .iconbtn svg { width: 18px; height: 18px; }

  /* Hero (collapses after first message) */
  .hero {
    text-align: center; padding: 40px 20px 32px;
    transition: all 0.4s ease;
  }
  .hero.collapsed { padding: 16px 20px 0; }
  .hero h2 {
    font-size: clamp(28px, 4.5vw, 44px); margin: 0 0 8px;
    font-weight: 800; letter-spacing: -0.03em; line-height: 1.05;
    background: linear-gradient(135deg, var(--fg) 0%, var(--accent-1b) 60%, var(--accent-1) 100%);
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  .hero p { color: var(--fg-mute); margin: 0; font-size: 15px; }
  .hero.collapsed h2 { font-size: 0; opacity: 0; height: 0; margin: 0; }
  .hero.collapsed p { font-size: 0; opacity: 0; height: 0; margin: 0; }

  .suggestions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 20px; }
  .suggest {
    padding: 10px 14px; border-radius: 12px; cursor: pointer;
    background: var(--glass); border: 1px solid var(--border);
    color: var(--fg); font: inherit; font-size: 13px;
    transition: all 0.18s;
    backdrop-filter: blur(10px);
  }
  .suggest:hover {
    transform: translateY(-2px);
    background: var(--glass-strong);
    border-color: color-mix(in srgb, var(--accent-1) 45%, var(--border));
    box-shadow: 0 8px 20px -8px var(--accent-1);
  }
  .suggest .emoji { margin-right: 6px; }
  .hero.collapsed .suggestions { display: none; }

  /* Chat */
  #chat {
    flex: 1; overflow-y: auto; padding: 12px 4px 16px;
    display: flex; flex-direction: column; gap: 12px;
    scroll-behavior: smooth;
  }
  #chat::-webkit-scrollbar { width: 8px; }
  #chat::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

  .msg {
    max-width: 78%; padding: 12px 16px; border-radius: 16px;
    white-space: pre-wrap; word-wrap: break-word;
    animation: pop 0.25s cubic-bezier(.2,.9,.3,1.2);
    line-height: 1.5; font-size: 14.5px;
  }
  @keyframes pop {
    0% { opacity: 0; transform: translateY(8px) scale(0.98); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  .msg.bot {
    align-self: flex-start;
    background: var(--glass-strong); border: 1px solid var(--border);
    backdrop-filter: blur(12px);
    border-bottom-left-radius: 4px;
  }
  .msg.user {
    align-self: flex-end; color: #fff;
    background: linear-gradient(135deg, var(--accent-1) 0%, var(--accent-1b) 100%);
    border-bottom-right-radius: 4px;
    box-shadow: 0 8px 20px -10px var(--accent-1);
  }
  .msg .who {
    display: block; font-size: 11px; font-weight: 600; opacity: 0.65;
    margin-bottom: 4px; letter-spacing: 0.04em; text-transform: uppercase;
  }
  .msg.user .who { color: rgba(255,255,255,0.85); }

  /* Typing dots */
  .typing { display: inline-flex; gap: 4px; align-items: center; height: 18px; }
  .typing span {
    width: 7px; height: 7px; border-radius: 50%; background: var(--fg-mute);
    animation: blink 1.2s infinite;
  }
  .typing span:nth-child(2) { animation-delay: 0.2s; }
  .typing span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes blink {
    0%, 60%, 100% { opacity: 0.25; transform: scale(0.85); }
    30% { opacity: 1; transform: scale(1); }
  }

  /* Composer */
  .composer {
    background: var(--glass-strong);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 8px 8px 8px 16px;
    display: flex; gap: 8px; align-items: center;
    backdrop-filter: blur(20px) saturate(180%);
    box-shadow: var(--shadow);
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .composer:focus-within {
    border-color: color-mix(in srgb, var(--accent-1) 55%, var(--border));
    box-shadow: var(--shadow), 0 0 0 4px color-mix(in srgb, var(--accent-1) 18%, transparent);
  }
  #i {
    flex: 1; background: transparent; border: 0; outline: none;
    color: var(--fg); font: inherit; font-size: 15px; padding: 10px 0;
  }
  #i::placeholder { color: var(--fg-mute); }
  #b {
    width: 44px; height: 44px; border-radius: 12px; border: 0; cursor: pointer;
    background: linear-gradient(135deg, var(--accent-1), var(--accent-1b));
    color: #fff; display: grid; place-items: center;
    transition: transform 0.15s, opacity 0.2s, box-shadow 0.2s;
    box-shadow: 0 6px 16px -6px var(--accent-1);
  }
  #b:hover:not(:disabled) { transform: translateY(-1px) scale(1.03); box-shadow: 0 10px 22px -6px var(--accent-1); }
  #b:disabled { opacity: 0.5; cursor: wait; }
  #b svg { width: 18px; height: 18px; }

  /* Footer note */
  .foot {
    text-align: center; color: var(--fg-mute); font-size: 11px;
    margin-top: 10px; letter-spacing: 0.02em;
  }
  .credit { margin-top: 5px; font-size: 11px; font-weight: 600; }
  .credit strong { color: var(--accent-1b); font-weight: 700; }
  .foot kbd {
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
    padding: 2px 5px; border-radius: 4px; border: 1px solid var(--border);
    background: var(--glass); margin: 0 2px;
  }

  @media (max-width: 600px) {
    .app { padding: 8px; }
    header { padding: 12px 14px; border-radius: 14px; }
    .title { font-size: 15px; }
    .subtitle { display: none; }
    .pills { display: none; }
    .hero { padding: 24px 12px 16px; }
    .msg { max-width: 92%; font-size: 14px; }
    .navlink.hidemobile { display: none; }
    .navlink { padding: 7px 9px; font-size: 12px; }
  }
</style>
</head>
<body data-theme="dark">
<div class="bg-image"></div>
<div class="bg-mesh"></div>
<div class="grain"></div>

<div class="app">
  <header>
    <div class="brand">
      <div class="logo">DB</div>
      <div>
        <div class="title">DemoBot</div>
        <div class="subtitle">Topic-bounded assistant · powered by Cloudflare Workers AI</div>
        <div class="pills">
          <span class="pill soccer"><span class="dot"></span>SOCCER</span>
          <span class="pill cycling"><span class="dot"></span>CYCLING</span>
          <span class="pill linux"><span class="dot"></span>LINUX</span>
        </div>
      </div>
    </div>
    <div class="controls">
      <a class="navlink" href="https://itlinux.cc/">Home</a>
      <a class="navlink" href="https://aigw.itlinux.cc/">AI Gateway</a>
      <a class="navlink hidemobile" href="https://github.com/itlinux" target="_blank" rel="noopener">GitHub</a>
      <button class="iconbtn" id="themeBtn" title="Toggle theme" aria-label="Toggle theme">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
      </button>
      <button class="iconbtn" id="resetBtn" title="New chat" aria-label="New chat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>
      </button>
    </div>
  </header>

  <div class="hero" id="hero">
    <h2>Three topics.<br/>Infinite questions.</h2>
    <p>Ask me anything about soccer, cycling, or Linux. Anything else, I'll politely decline.</p>
    <div class="suggestions" id="suggestions">
      <button class="suggest" data-q="Who won the 2024 Tour de France and by how much?"><span class="emoji">🚴</span>Tour de France 2024 winner</button>
      <button class="suggest" data-q="Best Real Madrid starting XI of all time?"><span class="emoji">⚽</span>Real Madrid all-time XI</button>
      <button class="suggest" data-q="Explain Pogačar's climbing style vs Vingegaard's."><span class="emoji">⛰️</span>Pogačar vs Vingegaard</button>
      <button class="suggest" data-q="What is gegenpressing and who pioneered it?"><span class="emoji">🧠</span>Gegenpressing 101</button>
      <button class="suggest" data-q="Explain systemd targets vs runlevels."><span class="emoji">🐧</span>systemd targets vs runlevels</button>
      <button class="suggest" data-q="How do I find which process is using port 8080 on Linux?"><span class="emoji">🔍</span>Who's on port 8080?</button>
      <button class="suggest" data-q="What's the difference between apt, dnf, and pacman?"><span class="emoji">📦</span>apt vs dnf vs pacman</button>
    </div>
  </div>

  <div id="chat" aria-live="polite"></div>

  <form class="composer" id="f" autocomplete="off">
    <input id="i" placeholder="Ask about a club, a race, a rider, a distro, a shell command…" aria-label="Message" />
    <button id="b" aria-label="Send">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
    </button>
  </form>
  <div class="foot">Press <kbd>Enter</kbd> to send · <kbd>Shift</kbd>+<kbd>Enter</kbd> for newline · Off-topic prompts will be declined</div>
  <footer class="foot credit">Built by <strong>Remo Mattei</strong> · Sr. Cloudflare One Specialist Solutions Engineer</footer>
</div>

<script>
  const chat = document.getElementById('chat');
  const form = document.getElementById('f');
  const input = document.getElementById('i');
  const btn = document.getElementById('b');
  const hero = document.getElementById('hero');
  const themeBtn = document.getElementById('themeBtn');
  const resetBtn = document.getElementById('resetBtn');
  const suggestions = document.getElementById('suggestions');
  let history = [];

  function add(role, text) {
    const d = document.createElement('div');
    d.className = 'msg ' + (role === 'user' ? 'user' : 'bot');
    const who = document.createElement('span');
    who.className = 'who';
    who.textContent = role === 'user' ? 'You' : 'DemoBot';
    const body = document.createElement('span');
    body.textContent = text;
    d.appendChild(who);
    d.appendChild(body);
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
    return body;
  }

  function addTyping() {
    const d = document.createElement('div');
    d.className = 'msg bot';
    d.innerHTML = '<span class="who">DemoBot</span><span class="typing"><span></span><span></span><span></span></span>';
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
    return d;
  }

  async function send(q) {
    if (!q.trim()) return;
    hero.classList.add('collapsed');
    add('user', q);
    history.push({ role: 'user', content: q });
    input.value = '';
    btn.disabled = true;
    const typing = addTyping();
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      const data = await r.json();
      const reply = data.reply || data.error || '(no reply)';
      typing.remove();
      add('bot', reply);
      history.push({ role: 'assistant', content: reply });
    } catch (err) {
      typing.remove();
      add('bot', 'Error: ' + err.message);
    } finally {
      btn.disabled = false;
      input.focus();
    }
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); send(input.value); });

  suggestions.addEventListener('click', (e) => {
    const t = e.target.closest('.suggest');
    if (!t) return;
    send(t.dataset.q);
  });

  resetBtn.addEventListener('click', () => {
    history = [];
    chat.innerHTML = '';
    hero.classList.remove('collapsed');
    input.focus();
  });

  themeBtn.addEventListener('click', () => {
    const cur = document.body.dataset.theme;
    const next = cur === 'dark' ? 'light' : 'dark';
    document.body.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch {}
  });

  // Restore theme
  try {
    const saved = localStorage.getItem('theme');
    if (saved) document.body.dataset.theme = saved;
  } catch {}

  input.focus();
</script>
</body>
</html>`;

export const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

const MAX_BODY_BYTES = 32 * 1024;
const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_MESSAGES = 12;
const MAX_REPLY_CHARS = 6000;
const DEFAULT_AI_TIMEOUT_MS = 25_000;

const SECURITY_HEADERS = {
  'content-security-policy': "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; upgrade-insecure-requests",
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
};

class RequestError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

class TimeoutError extends Error {}

function withSecurity(response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function json(value, status = 200, extraHeaders = {}) {
  return withSecurity(new Response(JSON.stringify(value), {
    status,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  }));
}

async function readBoundedJson(request) {
  const declaredLength = request.headers.get('content-length');
  if (declaredLength !== null && Number(declaredLength) > MAX_BODY_BYTES) {
    throw new RequestError('request body too large', 413);
  }
  if (!request.body) throw new RequestError('invalid json', 400);

  const reader = request.body.getReader();
  const chunks = [];
  let bytesRead = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new RequestError('request body too large', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(bytesRead);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(body));
  } catch {
    throw new RequestError('invalid json', 400);
  }
}

function validateMessages(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Array.isArray(body.messages) || body.messages.length === 0) {
    throw new RequestError('invalid messages', 400);
  }

  const messages = body.messages.map((message) => {
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      throw new RequestError('invalid messages', 400);
    }
    if (message.role !== 'user' && message.role !== 'assistant') {
      throw new RequestError('invalid messages', 400);
    }
    if (typeof message.content !== 'string' || message.content.trim().length === 0 || message.content.length > MAX_MESSAGE_CHARS) {
      throw new RequestError('invalid messages', 400);
    }
    return { role: message.role, content: message.content };
  });

  if (messages.at(-1).role !== 'user') throw new RequestError('invalid messages', 400);
  return messages.slice(-MAX_HISTORY_MESSAGES);
}

function withTimeout(promise, timeoutMs) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError()), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function extractReply(result) {
  const candidate = result?.response ?? result?.result?.response ?? '(empty response)';
  return (typeof candidate === 'string' ? candidate : '(empty response)').slice(0, MAX_REPLY_CHARS);
}

export function createWorker({ aiTimeoutMs = DEFAULT_AI_TIMEOUT_MS } = {}) {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      const cfVisitor = request.headers.get('cf-visitor') || '';
      const isHttp = url.protocol === 'http:' || cfVisitor.includes('"scheme":"http"');

      if (isHttp) {
        url.protocol = 'https:';
        return withSecurity(new Response(null, {
          status: 301,
          headers: { location: url.toString() },
        }));
      }

      if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
        return withSecurity(new Response(CHAT_HTML, {
          headers: {
            'cache-control': 'public, max-age=60',
            'content-type': 'text/html; charset=utf-8',
          },
        }));
      }

      if (request.method === 'GET' && url.pathname.startsWith('/assets/')) {
        if (!env?.ASSETS?.fetch) return withSecurity(new Response('Not found', { status: 404 }));
        try {
          return withSecurity(await env.ASSETS.fetch(request));
        } catch {
          return withSecurity(new Response('Not found', { status: 404 }));
        }
      }

      if (url.pathname === '/healthz') {
        return withSecurity(new Response('ok', {
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        }));
      }

      if (url.pathname === '/api/chat' && request.method !== 'POST') {
        return json({ error: 'method not allowed' }, 405, { allow: 'POST' });
      }

      if (url.pathname === '/api/chat') {
        const contentType = request.headers.get('content-type') || '';
        if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
          return json({ error: 'content type must be application/json' }, 415);
        }

        let trimmed;
        try {
          trimmed = validateMessages(await readBoundedJson(request));
        } catch (error) {
          if (error instanceof RequestError) return json({ error: error.message }, error.status);
          return json({ error: 'invalid request' }, 400);
        }

        const messages = [{ role: 'system', content: SYSTEM_PROMPT }, ...trimmed];
        try {
          const result = await withTimeout(env.AI.run(env.MODEL || MODEL, {
            messages,
            max_tokens: 512,
            temperature: 0.4,
          }), aiTimeoutMs);
          return json({ reply: extractReply(result) });
        } catch (error) {
          if (error instanceof TimeoutError) return json({ error: 'AI request timed out' }, 504);
          return json({ error: 'AI service unavailable' }, 502);
        }
      }

      return withSecurity(new Response('Not found', { status: 404 }));
    },
  };
}

export default createWorker();
