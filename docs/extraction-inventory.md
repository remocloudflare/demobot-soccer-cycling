# Standalone release inventory

## Production ownership

- Hostname: `demobot.itlinux.cc`
- Current Worker: `demobot-soccer-cycling`
- Environment: `production`

Do not add a `routes` list to `wrangler.jsonc`; custom-domain ownership is managed separately to avoid destructive trigger reconciliation.

## Verified production behavior

- Root returns the DemoBot page with seven suggestions.
- Desktop and mobile layouts render without horizontal overflow.
- Theme toggle and reset controls are present.
- Penguin asset is local and has SHA-256 `bd342e9e680d4b2fc41651ada1130ef576815142d7c202a1605b2b78affec376`.
- `/healthz` returns `200 ok`.
- Allowed Linux prompts return a Workers AI answer.
- Off-topic prompts return the exact topic-bound refusal.
