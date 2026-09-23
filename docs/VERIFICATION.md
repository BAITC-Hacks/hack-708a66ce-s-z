# Verification record

Verified locally on September 23, 2026, using Node.js 26 and Playwright Chromium on macOS. CI targets Node.js 22 on Ubuntu.

## Passing local checks

- TypeScript strict compilation and production Vite single-file build.
- Twenty-six unit/API/layout tests: exact reference results, full effects and lags, all synergies and conflicts, 120 order permutations, critical threshold, invalid sets, completion guard, recommendation completion, 60 seeded legal playthroughs, mocked Jev and OpenAI success/failure, schema semantics, client trust boundaries, milestone reversibility, deterministic Astana layout, every policy’s visual scope, and building footprints staying off roads and water.
- Eight passing Chromium browser journeys: complete five-turn official example, exact displayed score, persistence, saved archive, export, reset, conflicts and district retargeting, undo, budget dead ends, mobile/Kazakh layout, keyboard dialog dismissal, corrupted storage recovery, native Canvas with WebGL unavailable, onboarding, handbook navigation, map controls, sound opt-in, reduced motion, returning from reports, typed advice remaining a proposal, malformed/stale AI replies, and explicit Preview/Funded map labels.
- `file://` launch in an offline browser context, complete five-turn game, zero HTTP/HTTPS requests, all city assets bundled, and the upstream MIT notice retained in the HTML.
- Real browser screenshots inspected for desktop city, policy preview, final report and mobile layout.
- `npm install` reported zero known dependency vulnerabilities at installation time.

## Active renderer

The current game adapts IsoCity’s native Canvas renderer and artwork. It does not need a Next.js server, an iframe, external map tiles or WebGL. Required WebP files are imported into the single-file build. The old Phaser prototype is preserved in source but is not the active scene.

The real local API was also checked without keys: `/api/status` reports both providers unconfigured; `/api/decision-support` returns HTTP 200 with a valid local recommendation. Live provider verification still requires team keys.

## External check limitation

The first GitHub Actions run [35842324004](https://github.com/BAITC-Hacks/hack-708a66ce-s-z/actions/runs/35842324004) was prevented from starting. The check annotation states: “The job was not started because your account is locked due to a billing issue.” It ran no steps. A repository/organization administrator must resolve that account issue before hosted CI can execute.

## Not verified

- Paid/live Jev or OpenAI API requests. Provider behavior is tested with mocks; no key is bundled.
- Safari, Firefox, or mobile device hardware. Responsive layout was checked in Chromium.
- Native-speaker editorial review of Kazakh copy.
- Real-world policy outcomes, GIS accuracy or causal validity: these are intentionally outside the synthetic case model.
