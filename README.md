<div align="center">

# QALA

### One city. Five decisions. A better everyday life.

**An offline-first, turn-based Astana city simulator by Sauce Code.**

[English](README.md) · [Русский](README.ru.md) · [Қазақша](README.kk.md)

[Play offline](#play-in-30-seconds) · [The rules](#a-fair-start-a-transparent-result) · [How it works](#built-for-trust) · [Demo walkthrough](docs/DEMO.md)

**100 budget · 5 decisions · 5 districts · 14 policies · 3 languages**

![QALA city simulator](docs/screenshots/city-en.png)

_HackAlem AI 2026 · “Virtual Mayor for 5 Hours” · Case owner: Astana Innovations_

</div>

## A city is its people

A new park feels like an easy choice. Until you discover that the same land could hold a school, the growing district needs a clinic, and your budget must cover five decisions.

QALA turns a policy spreadsheet into a small, understandable strategy game. Explore a miniature Astana, preview a policy, choose its district, and see who benefits. Finish with an **Astana Quality of Life Score** you can inspect down to every indicator.

The game borrows district exploration from Civilization, card synergies from Balatro, and readable consequences from Plague Inc. The scoring follows the supplied case dataset exactly.

## Play in 30 seconds

**No account. No API key. No server. No internet required to play the downloaded game.**

1. Download [play/QALA.html](play/QALA.html) using GitHub’s **Download raw file** button. Alternatively, download the repository ZIP.
2. Open `QALA.html` in a modern desktop browser.
3. Choose RU, EN, or ҚАЗ. Inspect Nura, explore a school or clinic card, and make your first decision.

All JavaScript, fonts, styles, data, and artwork are inside the HTML. Opening a local file works on the first launch, without a prior online visit. Browser storage preserves your current game when permitted; JSON export works independently. The city uses native Canvas and does not require WebGL.

For development, use Node.js **22 or newer**:

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. Installing dependencies requires internet; the built game does not.

```bash
npm run check       # Engine/API adapter tests + TypeScript + production build
npm run test:e2e    # Full browser games, offline, mobile, validation and fallback
npm run package    # Build the downloadable play/QALA.html
```

Install the browser once if needed: `npx playwright install chromium`.

## Make a choice. Understand its cost.

| Feature                   | Why it matters                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| Living IsoCity scene      | Six recognizable Astana landmarks, moving cars and pedestrians, districts, pan/zoom, day/night |
| Mayor onboarding          | Meet fictional advisor Aida, then learn through your actual first choice, preview and result   |
| Mayor’s handbook          | Eight original, contextual urban-planning tips linked to playable policies                     |
| Fourteen policy cards     | Cost, implementation delay, target, and actual two-year effects before committing              |
| Five-decision game        | Budget and conflict checks, undo, and a guard against impossible-to-finish plans               |
| Policy synergies          | Bus lanes + signals, lighting + digital requests, cleaner fuel + green belt                    |
| Transparent results       | Population-weighted score, weakest district, critical penalties, all 50 indicators             |
| Local advisor             | Deterministic, explainable advice works offline; legal next moves are ranked by immediate gain |
| Optional Jev + LLM advice | Typed selection among legal moves, schema-checked alternatives and grounded explanations       |
| Meaningful milestones     | Resolve critical needs, activate a synergy, improve every district; no hidden score bonuses    |
| Replay and compare        | Save up to ten scenarios in your browser; export the complete calculation as JSON              |
| RU / EN / ҚАЗ             | Localized game controls, policy descriptions, help and results                                 |

![Policy preview with consequences](docs/screenshots/policy-preview.png)

## One clear next move

Start with a short welcome and a district need. Three relevant cards offer manageable choices; all fourteen measures remain one click away. A preview shows the target, cost, delay and calculated consequences before a single budget point is spent. Funding a policy changes the city and opens a short, undoable consequence report. Five decisions end with a term summary and the complete numerical report.

The **Mayor’s desk** holds the advisor, handbook, journal, language and city preferences. The main screen keeps attention on the city and your next decision. Guidance can be skipped or replayed, and movement can be paused. Sound starts only when enabled.

## Take office in a city that feels alive

Baiterek’s gold sphere, Aq Orda’s blue dome, Khan Shatyr, Hazret Sultan Mosque, the Palace of Peace and Reconciliation and Nur Alem give this Astana its identity. The city adapts the actual building artwork, roads, cars and pedestrians from **[IsoCity](https://github.com/amilich/isometric-city)**, with Astana’s landmarks arranged around the Ishim and the Khan Shatyr–Baiterek–Aq Orda civic axis. Native Canvas renders connected streets, sidewalks, neighbourhood courts and bridges. Required assets are bundled locally; the upstream MIT license is retained in the source and offline HTML. New schools, clinics and parks occupy neighbourhood lots; undo restores the original city. Pan, zoom, pause the city or switch to evening light. Animation is illustrative; it does not introduce random score changes.

![Your advisor welcomes you](docs/screenshots/briefing-en.png)

The mayor’s handbook connects everyday urban questions to the exact game mechanics: access versus traffic flow, safer crossings versus speed, parks versus schools, and protecting the weakest district. Its eight tips are original writing inspired by the **topics** in the supplied excerpt of Ilya Varlamov and Maxim Katz’s _100 Tips for a Mayor_ (2020). The excerpt contains the introduction and contents, not the full chapters. The book PDF is not redistributed.

![Contextual mayor’s handbook](docs/screenshots/handbook-en.png)

## A fair start. A transparent result.

Everyone starts with the same **100 budget** and the same synthetic district data. Adopt **exactly five unique policies**, with **at most two per category**. City policies affect every district; local policies require one district. All supplied incompatibilities are enforced. Unspent budget earns no bonus.

Each turn is a decision, not another elapsed quarter. Policies share an eight-quarter simulation horizon, so **decision order never changes the final result**.

```text
indicator' = clip(base + Σ fullEffect × (8 − delay) / 8 + synergies, 0, 100)
district   = Σ indicatorWeight × indicator'
city       = Σ populationShare × district
Score      = 0.70 × city + 0.30 × weakestDistrict − criticalCount
```

A critical indicator is **strictly below 40**. Fixed synergy bonuses are not reduced by delay. The weakest-district term rewards inclusive improvement rather than concentrating all investment in the strongest neighborhood. Invalid final scenarios receive **no score**; partial results are labeled forecasts.

The supplied baseline reproduces as **52.55768**. The official example (`M7 Nura, M8 Nura, M10 Nura, M12 city, M5 Saryarka`) costs **95** and scores **56.54307**. No sample totals are hard-coded into the engine.

![Final report and district comparison](docs/screenshots/report-en.png)

## Built for trust

```text
Policy cards → validator → deterministic simulation → result + explanation context
                              ↓                         ↓
                    IsoCity scene + report       local advisor (offline)
                                                Jev selection + LLM explanation (server only)
```

**React + TypeScript + Vite + IsoCity Canvas.** No database or runtime CDN. IsoCity building packs, original generated Astana landmarks and welcome art, Lucide icons, Manrope and Unbounded fonts are bundled locally. Vite’s single-file build makes the game portable.

| Location                             | Responsibility                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| `src/game/data.ts`                   | Supplied district values, weights, policies, translations and synergies              |
| `src/game/engine.ts`                 | Validation, simulation, completion search, recommendations and contributions         |
| `src/game/explanation.ts`            | Verified explanation context; no model-owned numbers                                 |
| `src/game/astanaMap.ts`              | Deterministic Astana layout and policy-linked visible changes                        |
| `src/components/IsoCity.tsx`         | Cached Canvas layers, camera, accessible districts, traffic and pedestrians          |
| `src/vendor/isocity/`                | Attributed upstream rendering and animation modules                                  |
| `src/components/MayorExperience.tsx` | Turn flow, policy hand, preview, consequence report, desk and finale                 |
| `src/components/MayorOnboarding.tsx` | Contextual introduction, first-decision guidance, skip and replay                    |
| `src/game/decisionSupport.ts`        | Trusted candidates, goal-based local advice and replayable decision events           |
| `schemas/`                           | JSON Schema contracts for decisions, Jev, advice and scenario exports                |
| `src/game/handbook.ts`               | Original contextual advice in RU, EN and Kazakh                                      |
| `src/App.tsx`                        | Card game, previews, reports, language selection and local scenario archive          |
| `server/advisor.ts`                  | Local API, provider keys and server-side recalculation                               |
| `server/decisionSupport.ts`          | Jev typed selection, grounded OpenAI narration and safe fallback                     |
| `tests/`                             | Scoring invariants, official example, permutations, seeded runs and browser journeys |

### Optional Jev + OpenAI advice

The offline advisor is **rule-based, not an LLM**. It evaluates legal next moves against your selected goal. To connect the optional providers:

```bash
cp .env.example .env
# Set TYPESAFE_API_KEY for Jev and/or OPENAI_API_KEY for explanations.
# Keys belong only in .env; never use a VITE_ prefix.
npm run build
npm start
```

Open `http://localhost:8789`, then **Mayor’s desk → AI advisor → Get advice**. In development, Vite forwards `/api` to the same local server. `GET /api/status` reports which providers are configured without revealing keys.

[Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev) selects a typed candidate from engine-verified legal options. A Noul question flags ambiguous requests. OpenAI Responses explains computed outcomes using a strict JSON narration schema. Defaults are `jev-1.13.0` and `gpt-4.1-mini`, configurable in `.env`. Either provider can operate independently. With neither key, the local analysis remains available.

The browser checks the response schema and rebuilds candidate numbers from the deterministic engine. Suggestions require your explicit review and funding. Changing context invalidates pending advice; provider errors fall back visibly. Jev confidence describes model selection, not the likelihood of a real city outcome. See [all eight contracts and validation boundaries](docs/AI-CONTRACTS.md).

Adapters are tested with mocked responses. Live paid calls **have not been verified without your keys**. Keys stay on the localhost server; the single-file offline game contains none. The server is a local demo integration, not an authenticated public service.

## Reproducibility is part of the product

Tests verify the reference result, all policy scopes/delays, all three synergies, strict critical thresholds, all 120 permutations of the sample scenario, invalid sets, budget dead ends, and 60 seeded legal playthroughs. Browser tests play all five turns, reload saved state, export JSON, check mobile/Kazakh UI, exercise conflicts, and play from `file://` with networking disabled.

Run `npm run checkpoint` for a checked commit and push on the current branch. The helper refuses conflicts, unexpected remotes and likely credential files; it never creates empty commits or force-pushes. The scheduled desktop task additionally reviews changes and ends after the hackathon window.

- [Current experience plan](docs/EXPERIENCE-V3.md)
- [AI and Jev schema contracts](docs/AI-CONTRACTS.md)
- [IsoCity source, license and adaptations](docs/ISOCITY.md)
- [Astana layout and geographic references](docs/ASTANA-MAP.md)
- [Case requirements and remaining gaps](docs/CASE-AUDIT.md)
- [Design direction and Taste skill audit](docs/DESIGN.md)
- [Five-hour implementation plan](docs/PLAN.md)
- [Model specification and assumptions](docs/MODEL.md)
- [Two-minute judge walkthrough](docs/DEMO.md)
- [Original supplied dataset](docs/supplied-dataset.ru.txt)
- [Artwork provenance and generation prompt](docs/ASSETS.md)

## Scope and next steps

This is an educational simulation with **synthetic data and an illustrative map**, not real district geometry or a forecast of municipal outcomes. Visual markers communicate adopted policies; policy benefits follow the supplied fixed effects. The local recommendation is a greedy next-step suggestion, not a proven globally optimal plan.

The first version deliberately keeps random events out of the judged scenario so every comparison is fair. Next: a separate event sandbox, stronger scenario optimization, real GIS layers, scenario import, and a shared leaderboard.

Built by **Sauce Code** with Codex for [HackAlem AI](https://hackalem.ai/).
