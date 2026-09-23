# Verification record

Verified locally on September 23, 2026, using Node.js 26 and Playwright Chromium on macOS. CI targets Node.js 22 on Ubuntu.

## Passing local checks

- TypeScript strict compilation and production Vite single-file build.
- Fourteen unit/API-adapter tests: exact reference results, full effects and lags, all synergies and conflicts, 120 order permutations, critical threshold, invalid sets, completion guard, recommendation completion, 60 seeded legal playthroughs and mocked provider success/failure.
- Ten passing Chromium browser scenarios: complete five-turn official example, exact displayed score, persistence, saved archive, export, reset, conflicts and district retargeting, undo, budget dead ends, mobile/Kazakh layout, keyboard dialog dismissal, corrupted storage recovery Phaser Canvas fallback, onboarding, handbook navigation, map controls, sound opt-in, reduced motion, and returning to the city after a report.
- `file://` launch in an offline browser context, complete five-turn game, zero HTTP/HTTPS requests.
- Real browser screenshots inspected for desktop city, policy preview, final report and mobile layout.
- `npm install` reported zero known dependency vulnerabilities at installation time.

## External check limitation

The first GitHub Actions run [35842324004](https://github.com/BAITC-Hacks/hack-708a66ce-s-z/actions/runs/35842324004) was prevented from starting. The check annotation states: “The job was not started because your account is locked due to a billing issue.” It ran no steps. A repository/organization administrator must resolve that account issue before hosted CI can execute.

## Not verified

- A paid/live OpenAI API request. Provider behavior is tested with a mock; no key is bundled.
- Safari, Firefox, or mobile device hardware. Responsive layout was checked in Chromium.
- Native-speaker editorial review of Kazakh copy.
- Real-world policy outcomes, GIS accuracy or causal validity: these are intentionally outside the synthetic case model.
