# AGENTS.md

This repository is a Next.js App Router application for evaluating S2S voice-model conversations. Agents should prefer the existing architecture and keep edits small and consistent.

## Project snapshot

- App entry: [src/app/page.tsx](src/app/page.tsx)
- Root layout and app metadata: [src/app/layout.tsx](src/app/layout.tsx)
- API routes:
  - [src/app/api/analyze/route.ts](src/app/api/analyze/route.ts)
  - [src/app/api/qa/route.ts](src/app/api/qa/route.ts)
- Shared OpenRouter integration and error helpers: [src/lib/openrouter.ts](src/lib/openrouter.ts)
- Evaluation reference docs:
  - [src/lib/instructions.md](src/lib/instructions.md)
  - [src/lib/guide.md](src/lib/guide.md)
- Reusable UI primitives: [src/components/ui](src/components/ui)

## Useful commands

Run from the repository root:

- `npm run dev` — start the local Next.js app on port 3000
- `npm run build` — production build
- `npm run lint` — ESLint validation
- `npm run start` — serve the built app

## Architecture conventions

- Use the App Router pattern in [src/app](src/app).
- Keep UI in client components under [src/components](src/components) and mark them with `"use client"` only when they need browser state.
- Keep server-side request handling in route handlers under [src/app/api](src/app/api).
- Reuse the shared OpenRouter wrapper in [src/lib/openrouter.ts](src/lib/openrouter.ts) rather than creating new API clients.
- Prefer the existing UI primitives under [src/components/ui](src/components/ui) before introducing new component libraries.
- Preserve the `@/` import alias from the TypeScript configuration.

## Prompt and reference-data conventions

- [src/lib/instructions.ts](src/lib/instructions.ts) and [src/lib/guide.ts](src/lib/guide.ts) are the runtime source content used by the API endpoints; update those when the evaluation logic changes.
- The analysis endpoint must continue returning strict JSON. Do not add prose or markdown fences to the output contract unless the route is intentionally changed.
- When editing guidance or QA behavior, keep the responses grounded in the reference docs instead of inventing new evaluation rules.

## Environment and deployment notes

- The OpenRouter integration requires `OPENROUTER_API_KEY` in the environment.
- The default model is configured in [src/lib/openrouter.ts](src/lib/openrouter.ts) via `OPENROUTER_MODEL` when present.
- A missing API key should surface as a clear server error, not as a silent fallback.

## Working style for agents

- Make the smallest change that solves the task.
- Prefer editing existing components and route handlers over introducing new abstractions.
- When adding or changing UI, keep the Spanish labels and product tone consistent with the current app.
- If documentation needs to be updated, link to the existing reference docs instead of duplicating them in new files.
