# Repo Instructions

## Scope
- Build and maintain this as a static single-player/pass-and-play web game.
- Keep implementation small and compatible with Vercel static deploy.

## Testing
- Do not add automated test cases, test specs, or test-only frameworks for this source unless the user explicitly asks for them.
- Verify changes with `npm run build` and focused real-browser/manual smoke checks.

## Word Pair Generation
- Only add Undercover word pairs from narrow semantic groups, not broad categories.
- A valid pair must be close enough to be fair, but still distinguishable enough that the spy can be caught.
- Prefer same narrow category with clear differences: two dishes of the same style, two related tools with different use, two nearby professions with different duties, two similar actions with different details.
- Reject pairs that merely appear together, share a room/context, or belong to a broad category without close meaning.
- Reject pairs that are too close: synonyms, aliases, regional names, old/new names, spelling variants, abbreviation/full-name pairs, or one term that is just a generic/specific version of the other.
- Reject pairs where most players would naturally describe them with the same clues. Examples to avoid: `ly / cốc`, `dù / ô`, `bắp / ngô`, `đậu phụ / tàu hũ`, `nhà sách / tiệm sách`, `tiệm giặt ủi / hiệu giặt là`, `trả giá / mặc cả`.
- For every candidate pair, ask: "If a civilian says a truthful clue, can the spy's different word still create a detectable mismatch?" If not, remove the pair.
- Before adding a batch, review every pair manually, then validate JSON parsing, normalized duplicates, same-word pairs, and non-letter characters.
- Prefer small reviewed batches of 100-200 pairs over bulk generation.

## Local Development
- Use `npm run dev -- --port 5173` for local testing.
- The dev server binds to `0.0.0.0`, so devices on the same Wi-Fi can open `http://<computer-lan-ip>:5173`.
