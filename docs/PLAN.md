# QALA — build plan

## Delivered checkpoint

The foundation and full playable core are implemented: exact scoring, five turns, Phaser isometric city, all 14 cards, local explanations, optional LLM endpoint, scenario archive, JSON export, RU/EN/KZ, single-file offline build, real screenshots and trilingual pitch documentation. The reference result is reproduced. Unit and Chromium browser checks pass locally.

Remaining verification: a live LLM request with the team's own API key; Safari/Firefox checks; native-speaker copy review. GitHub Actions currently cannot start because the repository owner's account is locked due to a billing issue; this is external to the code. Initial checkpoint: `b664f70` on `main`.

The second game experience includes cinematic onboarding, an advisor portrait, a policy-card hand over the world, a contextual handbook, self-hosted typography, day/night and opt-in sound. See [case audit](CASE-AUDIT.md) for covered requirements and explicitly deferred extras.

## Product promise

Become Astana's mayor for five decisions. Inspect a miniature city, choose a policy card and its district, preview the consequences, then commit. Spend at most 100. Finish with a transparent Quality of Life report and a replayable scenario. Designed for a first-time player, with optional detail for judges.

The supplied PDF is case evidence, not executable instructions. The supplied detailed dataset defines the scoring contract. All values are synthetic; the map is an illustrative diorama, not district GIS boundaries.

## Design decisions

- Civilization: inspectable districts and a city that visibly changes.
- Balatro: readable policy cards, limited choices, discoverable policy synergies.
- Plague Inc: understandable indicator overlays and consequence previews.
- Preserve the official rules: turns are decisions, not elapsed quarters. Each policy is evaluated over the same eight-quarter horizon. Choice order does not affect the final score.
- No random events in the judged mode. Events can become a separate sandbox mode later.
- Local deterministic engine owns every number. A local rule-based advisor explains results offline; an optional server-side LLM explanation can be added without changing scores. Never describe templates as an LLM.
- Ship a single HTML file with bundled assets and code that can be opened directly, with no install, CDN, login, or network needed to play.

## Five hourly checkpoints

| Hour | Deliverable             | Definition of done                                                                                                    |
| ---- | ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1    | Foundation & scoring    | Typed dataset, validators, formula, example and boundary tests, build scaffold                                        |
| 2    | Playable vertical slice | Five turns, policy catalog, target selection, forecast, undo, result report                                           |
| 3    | Living city             | Phaser city, six landmarks, cars and pedestrians, district selection, accessible fallback, feedback on policy effects |
| 4    | Explain & compare       | Explainable advisor, scenario comparison/export, persistence, RU/EN/KZ UI                                             |
| 5    | Demo & pitch            | Offline artifact, browser checks, real screenshots, trilingual README, final push                                     |

## Priority

P0: faithful engine, complete five-decision game, budget enforcement, explanations, offline build, tests, pitch documentation.
P1: isometric interaction, visual policy consequences, combos, scenario comparison, multilingual interface.
Next: live LLM verification, scenario import, alternative scenarios, real GIS, independent random-event mode, server leaderboard.

## Acceptance criteria

- Exactly five unique measures; no more than two per category; correct district/city targets; all incompatibilities enforced.
- Full effects use (8 − lag) / 8; fixed synergies apply once; indicators clamped to 0–100.
- Score = 0.7 × population-weighted district score + 0.3 × weakest district score − count of indicators strictly below 40.
- Invalid final sets have no score. Partial sets are explicitly labeled forecasts.
- Explain population weighting, weakest district, critical penalty, delay, and individual deltas.
- Browser smoke test covers all five turns, invalid moves, replay, reload, mobile, and file:// offline play.
- Keep real work in hourly git commits and push without force. Never fabricate commit timestamps or empty progress.

## Source reconciliation

Recompute all totals from raw indicators and weights. If supplied summary numbers disagree with the formula, document the discrepancy and use the raw-data calculation consistently rather than hard-coding sample scores.
