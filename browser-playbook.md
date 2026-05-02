# Browser Playbook

Operational memory for browser work in this repo. Read this file before direct
browser testing or executable Playwright runs. Do not store secrets, raw logs,
screenshots, or one-off trace dumps here.

## Source of Truth

- Runtime and build scripts: `package.json`.
- Frontend entry: `src/main.ts`.
- Game UI flow: `src/ui/UndercoverApp.ts`.
- Game rules: `src/game/logic.ts`.
- Default local URL: `http://127.0.0.1:5173`.

## Runtime Defaults

- Start dev server: `npm run dev -- --port 5173`.
- Production check: `npm run build`.
- Automated tests are intentionally absent; use `npm run build` plus focused
  browser smoke checks unless the user explicitly asks for tests.
- Static output for deploy: `dist`.
- No backend, auth, database, or external provider flow.
- Verified local Chrome executable for one-off Playwright probes:
  `C:\Program Files\Google\Chrome\Application\chrome.exe`.
- If bundled browser automation needs a newer Node than system Node, the
  verified bundled Node is
  `C:\Users\empty\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`.

## Direct Browser Loop

- Reproduce on local URL first, patch second, rerun same flow third.
- Prefer stable `data-*` selectors already present in UI.
- Useful smoke flow: setup -> reveal all players -> discussion -> vote -> white
  guess -> result.
- Check mobile with a narrow viewport around `390x844`; verify no horizontal
  overflow and primary buttons remain reachable.

## Provider Risk Gate

- Local-only static web app. No provider-backed side effects in current MVP.
- Do not add deployment or third-party login browser flows here unless the user
  explicitly scopes them.

## Update Rules

- Add durable selectors, commands, and recurring failure patterns.
- Do not store temporary investigation notes or raw console output.
