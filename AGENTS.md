# Working on QALA

This is the operational guide for coding agents and human contributors. Product requirements and verification evidence live in the files below.

## Run the project

Use Node.js **22.18 or newer** and npm. No database, account or API key is needed.

```bash
npm ci
npm run demo
```

Open **http://localhost:8789**. `demo` builds the single-file app, then starts the local game/API server. It is a long-running process; keep it running while testing the browser. If 8789 is occupied, stop your own old QALA server or use `ADVISOR_PORT=8790 npm run demo` and open the printed URL. Do not kill unrelated processes.

For hot reload, run `npm run dev` and open Vite's printed URL. The optional API server (`npm start` in another terminal) uses 8789; Vite proxies `/api` there. For a different API port, update the development proxy together with the server configuration.

For an immediate offline demo, open **play/QALA.html** directly in a browser. Dependencies are needed to edit/build, not to play that file.

## Read before changing the model

- `docs/supplied-dataset.ru.txt`: organizer-provided synthetic data and rules.
- `docs/MODEL.md`: interpretation of the scoring contract.
- `docs/CASE-AUDIT.md`: implemented requirements and known gaps.
- `src/game/data.ts`, `src/game/engine.ts`: authoritative inputs and deterministic calculation.
- `docs/AI-CONTRACTS.md`: schema boundaries between the model, Jev and narration.
- `docs/ISOCITY.md`, `THIRD-PARTY-NOTICES.md`: pinned renderer provenance and MIT attribution.

The game has 100 budget, exactly five distinct policies, at most two per category, and an eight-quarter horizon. Decision order must not change the result. Ambient cars, people, visual district shapes and milestones must not alter score, population weights, policy costs or effects. Preserve the supplied five districts even though the contemporary city's administrative map differs.

Reference oracles, calculated from the dataset rather than hard-coded in implementation:

- Baseline: **52.55768**.
- `M7 Nura, M8 Nura, M10 Nura, M12 city, M5 Saryarka`: cost **95**, score **56.54307**, zero critical indicators.
- A preview spends nothing. Invalid or incomplete sets receive no final score.

## Make a change and verify it

```bash
npm run check
npx playwright install chromium  # once per environment
npm run test:e2e
npm run format:check
npm run package                 # refresh play/QALA.html before a release
```

`check` runs unit/API/layout tests, strict TypeScript and a production build. Browser tests use **127.0.0.1:4179**, play all five decisions, exercise undo/conflicts, verify localized phone layouts, and open the built HTML with networking disabled. They regenerate real screenshots in `docs/screenshots/`. Run them after the production build and review changed screenshots before publishing.

Keep source, screenshots, README claims and the packaged HTML consistent. Test changes at the model/API boundaries and add regression coverage for actual interaction bugs. Do not claim live AI, cross-browser or real-world policy validation unless it was actually performed. Record limitations in `docs/VERIFICATION.md`.

## Code boundaries

- `MayorExperience.tsx`: UI flow, preview/funding, visible advisor, panels and result.
- `MayorOnboarding.tsx`: optional introduction and first-turn guidance.
- `IsoCity.tsx`, `astanaMap.ts`: visual scene and deterministic city layout.
- `src/vendor/isocity/`: adapted upstream modules; retain MIT notices and local asset imports.
- `server/`: localhost-only optional AI integration. Model outputs are proposals, never authority for numeric scores or automatic policy adoption.
- `schemas/`: runtime-validated JSON Schema contracts.

Use existing React, TypeScript, native CSS and Lucide conventions. Keep RU/EN/KK labels aligned and accessible. The renderer must work without WebGL. Pause and reduced motion must remain functional. Do not introduce a required CDN, map-tile service or runtime network call into the offline game.

## Credentials and publishing

API keys are optional. Players can connect a key through the local app; session keys remain only in server memory. Developers may use the ignored `.env` file based on `.env.example`. Never put keys in `VITE_*`, browser storage, source, screenshots, exports, the offline HTML or logs. Never make paid provider calls as part of automated tests: use mocks.

Preserve unrelated and in-progress changes. Commit or push only when authorized by the user. The optional `npm run checkpoint` helper runs checks and pushes the current branch; review its scope before using it. Never force-push or create empty progress commits.
