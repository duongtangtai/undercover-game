# Repo Instructions

## Scope
- Build and maintain this as a static single-player/pass-and-play web game.
- Keep implementation small and compatible with Vercel static deploy.

## Testing
- Do not add automated test cases, test specs, or test-only frameworks for this source unless the user explicitly asks for them.
- Verify changes with `npm run build` and focused real-browser/manual smoke checks.

## Word Pair Generation
- Only add Undercover word pairs from narrow semantic groups, not broad categories.
- A valid pair must be near-synonymous, same object/role/action type, or two close variants of one concept.
- Reject pairs that merely appear together, share a room/context, or belong to a broad category without close meaning.
- Before adding a batch, review every pair manually, then validate JSON parsing, normalized duplicates, same-word pairs, and non-letter characters.
- Prefer small reviewed batches of 100-200 pairs over bulk generation.

## Local Development
- Use `npm run dev -- --port 5173` for local testing.
- The dev server binds to `0.0.0.0`, so devices on the same Wi-Fi can open `http://<computer-lan-ip>:5173`.
