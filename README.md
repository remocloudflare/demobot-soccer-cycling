# DemoBot — Soccer, Cycling, and Linux

A standalone Cloudflare Worker that preserves the existing DemoBot interface and topic-bounded chat behavior. The Worker is named `demobot-soccer-cycling` and uses only the Cloudflare Workers AI binding.

## Architecture

- `src/index.js` serves the exact DemoBot HTML/CSS/client JavaScript, `/healthz`, static assets, and `POST /api/chat`.
- `public/assets/penguin.webp` is the local Factory-style penguin background; no remote image dependency is required.
- The `AI` binding runs `@cf/meta/llama-3.3-70b-instruct-fp8-fast` with the strict soccer, cycling, and Linux system prompt.
- The browser keeps chat history in memory and sends it to the Worker. The Worker validates it and forwards only the latest 12 messages.
- `wrangler.jsonc` intentionally contains no route, custom-domain, or account-specific configuration.

## Deployment

No deployment is performed by this repository setup. Review and verify first:

```sh
npm ci
npm test
npm run verify
npm run dry-run
```

When an operator explicitly approves deployment, publish the standalone workers.dev preview with:

```sh
npx wrangler deploy
```

Custom-domain cutover is a separate, deliberate operation and is not encoded in `wrangler.jsonc`.

## Current live and preview URLs

- Production: `https://demobot.itlinux.cc/`
- Standalone Worker: `https://demobot-soccer-cycling.rm-815.workers.dev/`
- Source: `https://github.com/remocloudflare/demobot-soccer-cycling` (private)

Production is served by the standalone `demobot-soccer-cycling` Worker. Desktop/mobile rendering, `/healthz`, the local penguin asset, an allowed Linux prompt, and the exact off-topic refusal have been verified.

## Security

Every Worker-served response receives CSP, HSTS, frame denial, MIME sniffing protection, a restrictive Permissions Policy, and Referrer Policy. Chat requests must be JSON and are read with a 32 KiB limit. Message roles, content type, non-empty content, per-message length, and final user role are validated. AI calls time out; model output and public error output are bounded. Upstream exception details are never returned to clients.

User and model content is assigned with `textContent`, never `innerHTML`. The static typing indicator uses fixed markup only; it never contains user or model data. No credentials or third-party AI keys are needed or stored.

## Cost caveat

Workers AI usage can incur charges and consume account allocation. Local/offline verification does not invoke Workers AI. The live verifier checks the health endpoint, UI, headers, and static penguin asset but deliberately does not send a chat prompt. A manual or automated live chat test will invoke the configured model and may incur Workers AI usage charges.

## Verification

Offline verification:

```sh
npm test
npm run verify
npx wrangler deploy --dry-run
```

Live preview verification, after a separately approved deployment:

```sh
npm run verify -- --live https://<preview-worker>.<subdomain>.workers.dev
```

The live mode checks `/healthz`, the seven-suggestion UI, required security headers, and the local penguin asset. It does not call `/api/chat`.
