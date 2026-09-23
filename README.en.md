<div align="center">

# QALA

### A city game that shows its work.

**Become Astana’s mayor. Make five decisions. See who benefits.**

[Русский](README.md) · [English](README.en.md) · [Қазақша](README.kk.md)

[**Play offline**](play/QALA.html) · [**Run locally**](#run-from-source) · [**Agent guide**](AGENTS.md) · [**Two-minute demo**](docs/DEMO.md)

**100 budget · 5 decisions · 14 policies · 3 languages · One portable HTML**

![QALA — a living Astana and your next decision](docs/screenshots/city-en.png)

_Sauce Code · HackAlem AI 2026 · “Virtual Mayor for 5 Hours” · Astana Innovations_

</div>

A park sounds like an easy win. Until the same site is needed for a school, the growing district needs a clinic, and your budget has to cover five decisions.

QALA makes that tradeoff playable. Explore an illustrative Astana, read a district’s needs, preview a policy and decide where it belongs. Your city changes; the report explains every point of its **Astana Quality of Life Score**.

## Play now

1. Download [**play/QALA.html**](play/QALA.html) with GitHub’s **Download raw file** button, or download the repository ZIP.
2. Open the HTML in a modern desktop browser.
3. Choose RU, EN or ҚАЗ and meet Aida, your mayoral advisor.

**No account, installation, server or API key is needed.** JavaScript, fonts, artwork and data are embedded in the file. It works on its first launch without internet, even without WebGL. Your browser can save the current term; JSON export gives you a portable record.

## Run from source

Use **Node.js 22.18+** and npm, in the repository root:

```bash
npm ci
npm run demo
```

Open **http://localhost:8789**. This command builds the game and starts the local server, including optional AI support. No `.env` is required. Keep the terminal running; stop with Ctrl+C.

For hot reload: `npm run dev`, then open the URL Vite prints. Run `npm start` separately on port 8789 if you also want AI during development.

**Working with a coding agent?** Give it [AGENTS.md](AGENTS.md). It contains exact commands, file boundaries, test oracles, credential handling and verification steps. The [runbook](docs/RUNBOOK.md) includes a ready-to-paste agent prompt and troubleshooting.

## Your first term

| Step        | What you do                                                     | What you learn                                               |
| ----------- | --------------------------------------------------------------- | ------------------------------------------------------------ |
| **Explore** | Read a district need and Aida’s visible suggestion              | Where the city starts and who is underserved                 |
| **Preview** | Compare a policy’s cost, delay, location and calculated effects | What changes before spending anything                        |
| **Fund**    | Commit deliberately; watch the project appear in the city       | What the budget bought and which indicators improved         |
| **Reflect** | Undo if needed, finish five choices and inspect the report      | How the plan affects the weakest district and the whole city |

![An unfunded school preview and its computed consequences](docs/screenshots/policy-preview.png)

Three relevant cards keep each turn manageable; all fourteen policies remain available. The main screen offers a compact advisor, budget, progress and your next decision. The Mayor’s desk holds the handbook, journal, saved scenarios and preferences. Guidance can be skipped or replayed.

## From a playable city to a decision lab

District details retain population shares and all ten before/after indicators. The report adds district comparisons, a critical-deficit chart, the full 5×10 indicator matrix and the live calculation model. Exact Shapley contributions distribute the total score change across your policies, including interacting effects.

**Find a better plan** in the advisor explores legal completions with a beam of 180 candidates per depth. It keeps your funded decisions as a fixed prefix, displays the number of plans evaluated, and lets you preview a proposed move. It never spends your budget or claims a proven global optimum.

**Mayor’s desk → Scenario lab** opens a separately saved experiment. Change the budget (1–1,000) and number of decisions (1–10), describe a new problem and define a custom response with cost, delay, scope and positive or negative indicator effects. All district analytics remain visible. An over-budget experiment keeps its forecast and explains why it is invalid.

Official play always remains **100 / 5**. Lab records are explicitly marked as sandbox, cannot enter the official archive or AI contract, and never overwrite your game. Custom effects are the author’s assumptions, not measured municipal evidence. This extension incorporates ideas from our teammate’s `akim_5_hr` prototype. [Integration decisions](docs/TEAM-INTEGRATION.md).

## A more recognizable Astana

The Ishim, broad boulevards and the **Khan Shatyr → Baiterek → Aq Orda** civic axis organize the scene. The Palace of Peace and Reconciliation and Hazret Sultan Mosque sit across the river; Nur Alem anchors the EXPO area. Different neighborhoods use different building mixes, heights, courts, gardens and open spaces.

QALA adapts the actual building artwork, road renderer, cars and pedestrians from **[IsoCity](https://github.com/amilich/isometric-city)**. Local assets, cached Canvas layers, map gestures, daylight/evening, pause and reduced motion keep the city portable. New projects occupy neighborhood lots; undo restores the previous scene.

This is an artistic layout with geographic reference points. The five playable districts and every numeric effect come from the supplied synthetic dataset. [Geographic references](docs/ASTANA-MAP.md) · [Upstream source and MIT attribution](docs/ISOCITY.md)

## Meet your advisor

![Aida introduces your first term](docs/screenshots/briefing-en.png)

Aida’s suggestion is visible on the city screen. Open it to preview a legal move, compare alternatives or request a fuller explanation. Nothing is funded automatically.

| Mode               | Available when              | Responsibility                                                 |
| ------------------ | --------------------------- | -------------------------------------------------------------- |
| **Local analysis** | Always, including offline   | Ranks legal, finishable next moves against your goal           |
| **Jev selection**  | A Typesafe key is connected | Chooses a typed candidate from engine-calculated legal options |
| **AI explanation** | An OpenAI key is connected  | Explains computed benefits, tradeoffs and uncertainty          |

In the localhost app, onboarding offers an **optional API-key connection**. You can also connect from the advisor later. Session keys stay in local server memory and are cleared on disconnect or restart. Connecting does not call a paid model; asking for AI advice does. The offline HTML continues with clearly labeled local analysis.

Developers can instead use an ignored `.env`:

```bash
cp .env.example .env
# Set OPENAI_API_KEY and/or TYPESAFE_API_KEY. Never use a VITE_ prefix.
npm run demo
```

The engine owns the numbers. Server and browser validate JSON Schema; the browser reconstructs candidate effects independently. Changing context invalidates pending advice. Provider errors fall back visibly. Jev confidence concerns its selection, not the likelihood of a real-world outcome. [Eight contracts and trust boundaries](docs/AI-CONTRACTS.md)

**Provider adapters are tested with mocks. Live paid calls require your keys and have not been verified here.** The local advisor is rule-based and greedy; it is not an LLM or a proven global optimizer.

## Same start. Inspectable result.

Everyone receives **100 budget**, the same five districts and the same fifty indicators. Choose **exactly five distinct policies**, at most two per category. Local measures require a district; city measures apply everywhere. All specified conflicts are enforced. Unspent money earns no bonus.

A turn is a decision, not another elapsed quarter. Every policy uses the same eight-quarter horizon, so changing the order cannot change the final score.

```text
indicator = clip(base + Σ fullEffect × (8 − delay) / 8 + synergies, 0, 100)
district  = Σ indicatorWeight × indicator
city      = Σ populationShare × district
Score     = 0.70 × city + 0.30 × weakestDistrict − criticalCount
```

Critical means **strictly below 40**. Synergy bonuses are fixed and not reduced by delay. A partial game shows a forecast; an invalid set receives no final score. Milestones reward care, synergy and citywide improvement without adding hidden points.

| Reproducible check                                      | Expected result                                       |
| ------------------------------------------------------- | ----------------------------------------------------- |
| Supplied initial state                                  | **52.55768**                                          |
| `M7 Nura · M8 Nura · M10 Nura · M12 city · M5 Saryarka` | **95 spent · 56.54307 score · 0 critical indicators** |
| All 120 orderings of that plan                          | Identical final result                                |

These values are calculated from the dataset; the implementation does not substitute reference totals.

![Full report with district comparisons and policy contributions](docs/screenshots/report-en.png)

## Built to inspect

**React · TypeScript · Vite · IsoCity Canvas · AJV · Playwright**

```text
Player choice → rule validation → deterministic calculation → city + report
                                        ↓
                              verified legal candidates
                                        ↓
                            local advice / Jev selection
                                        ↓
                            optional grounded explanation
```

| Location                                                                   | What to inspect                                                |
| -------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [`src/game/engine.ts`](src/game/engine.ts)                                 | Budget, effects, delays, synergies, conflicts and Score        |
| [`src/game/data.ts`](src/game/data.ts)                                     | Organizer values and RU/EN/KK policy copy                      |
| [`src/game/astanaMap.ts`](src/game/astanaMap.ts)                           | Deterministic city structure and visual policy effects         |
| [`src/components/MayorExperience.tsx`](src/components/MayorExperience.tsx) | Preview → fund → consequences, advisor and term summary        |
| [`schemas/`](schemas/) · [`server/`](server/)                              | Validated AI contracts and local provider integration          |
| [`tests/`](tests/)                                                         | Model invariants, API boundaries and complete browser journeys |

No database or runtime CDN. Original generated Astana landmarks and welcome artwork, IsoCity assets, Lucide icons, Manrope and Unbounded fonts are bundled locally. The upstream MIT license is preserved in source and the offline HTML.

## Verify it yourself

```bash
npm run check                    # Unit/API/layout tests, TypeScript, production build
npx playwright install chromium  # Once per environment
npm run test:e2e                  # Five turns, offline, mobile, onboarding, AI boundaries
npm run format:check
npm run package                  # Rebuild the portable play/QALA.html
```

The suite checks the official example, conflicts, all scopes/delays/synergies, strict thresholds, permutation invariance and seeded legal games. Browser journeys verify previews spend nothing, undo and persistence work, phone/Kazakh layouts fit, and a complete `file://` game sends **zero HTTP requests**. See the [verification record](docs/VERIFICATION.md) for actual results and limits, including the repository account issue that prevented hosted CI from running.

## Beyond the score

The mayor’s handbook offers eight original tips connected to playable measures: access versus traffic flow, parks versus schools, safer streets, and protecting underserved districts. Topics were inspired by the supplied introduction/contents excerpt of Ilya Varlamov and Maxim Katz’s _100 Tips for a Mayor_; the book itself is not redistributed.

Save up to ten scenarios locally, compare them and export a replayable JSON decision record. Random events, a shared leaderboard and real GIS layers remain future work. The game is an educational simulation, not a calibrated municipal forecast.

[Case coverage](docs/CASE-AUDIT.md) · [Model specification](docs/MODEL.md) · [Source dataset](docs/supplied-dataset.ru.txt) · [Artwork provenance](docs/ASSETS.md) · [Final experience plan](docs/FINAL-HOUR.md) · [Third-party notices](THIRD-PARTY-NOTICES.md)

Built by **Sauce Code** for [HackAlem AI](https://hackalem.ai/).
