# Verification record

Verified locally on September 23, 2026, using Node.js 26 and Playwright Chromium on macOS. CI targets Node.js 22 on Ubuntu.

## Passing local checks

- TypeScript strict compilation and production Vite single-file build.
- Clean temporary source copy: `npm ci` followed by `ADVISOR_PORT=8791 npm run demo` installed the lockfile, rebuilt the game and started the localhost server without `.env`. The port override avoids disrupting the development session; the documented default remains 8789.
- Fifty-two unit/API/layout tests: exact reference results, full effects and lags, all synergies and conflicts, 120 order permutations, critical threshold, invalid sets, completion guard, recommendation completion, 60 seeded legal playthroughs, mocked Jev and OpenAI success/failure, schema semantics, client trust boundaries, milestone reversibility, deterministic Astana layout, every policy’s visual scope, and building footprints staying off roads and water, a connected 64×64 road network, landmark geography, neighborhood variety, and HTTP-level credential privacy/origin/CSRF/body-size/restart checks, overlapping streamed requests being limited before provider execution, exact Shapley attribution and grounded narration, cancellable/fixed-prefix beam search, custom measure bounds, sandbox arithmetic parity, invalid-limit forecasts and corrupt sandbox storage.
- Fifteen passing Chromium browser journeys: complete five-turn official example, exact displayed score, persistence, saved archive, export, reset, conflicts and district retargeting, undo, budget dead ends, mobile/Kazakh layout, keyboard dialog dismissal, corrupted storage recovery, native Canvas with WebGL unavailable, onboarding, handbook navigation, map controls, sound opt-in, reduced motion, returning from reports, typed advice remaining a proposal, malformed/stale AI replies, and explicit Preview/Funded map labels, scrolling/panning without district changes, visible free advice previews, optional key entry without browser storage or provider calls, editable sandbox limits, custom positive/negative effects, explicitly non-official JSON export, persistence and isolation from the official game, 50-cell analytics, Russian default/phone layout, full-plan proposals, and actual preview deltas after clipping and synergies.
- `file://` launch in an offline browser context, custom policy creation, matrix analysis, local plan search, and a complete five-turn game with zero HTTP/HTTPS requests, all city assets bundled, and the upstream MIT notice retained in the HTML.
- Real browser screenshots inspected for desktop city, policy preview, final report, scenario lab, Russian matrix/calculation model, plan search and phone analytics. Screenshots are captured from the implemented application, not mockups.
- `npm install` reported zero known dependency vulnerabilities at installation time.

## Active renderer

The current game adapts IsoCity’s native Canvas renderer and artwork. It does not need a Next.js server, an iframe, external map tiles or WebGL. Required WebP files are imported into the single-file build. The old Phaser prototype is preserved in source but is not the active scene.

The real local API was also checked without keys: `/api/status` reports both providers unconfigured; `/api/decision-support` returns HTTP 200 with a valid local recommendation. The real optional key form was tested with a dummy credential and immediately disconnected; no provider request was made. The Vite proxy was checked against the real guarded API, including same-origin credential validation and no-key local advice. Live provider verification still requires team keys.

## External check limitation

The first GitHub Actions run [35842324004](https://github.com/BAITC-Hacks/hack-708a66ce-s-z/actions/runs/35842324004) was prevented from starting. The check annotation states: “The job was not started because your account is locked due to a billing issue.” It ran no steps. A repository/organization administrator must resolve that account issue before hosted CI can execute.

## Not verified

- Paid/live Jev or OpenAI API requests. Provider behavior is tested with mocks; no key is bundled.
- Safari, Firefox, or mobile device hardware. Responsive layout was checked in Chromium.
- Native-speaker editorial review of Kazakh copy.
- Real-world policy outcomes, GIS accuracy or causal validity: these are intentionally outside the synthetic case model.

## Final teammate integration regression

The final source passes `npm run check` (52 tests, TypeScript and build). All 15 browser journeys pass in one full run, including the clipping/synergy regression and direct AI setup without changing saved decisions or making provider requests. `npm run format:check` passes. The packaged `play/QALA.html` is regenerated from the same tested `dist/index.html`.

The original `akim_5_hr` prototype and the earlier map experiment remain untouched in the original checkout. The published version integrates their compatible ideas into the isolated QALA game worktree. No new runtime dependencies, required services, or credentials were introduced.

The offline key panel now offers a user-clicked link to `http://localhost:8789/#ai`. The link opens the existing local app directly at the expanded key form; it makes no background request from file://. The real local server and visible key form were checked without submitting any key. Key storage remains server-memory-only.
