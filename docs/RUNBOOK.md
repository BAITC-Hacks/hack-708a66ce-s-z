# Run QALA

## Play immediately

Download `play/QALA.html` using GitHub's **Download raw file** action, then open it in a modern desktop browser. Everything needed for the game is inside the file. No installation, login, network or API key is required. Choose RU, EN or ҚАЗ on the welcome screen; the same controls are available in the Mayor's desk.

## Run from source with a coding agent

Use Node.js 22.18+ and npm in the repository root:

```bash
npm ci
npm run demo
```

Visit **http://localhost:8789**. This builds the app and serves it alongside the optional AI API. The terminal stays running. Stop it with Ctrl+C when finished. Internet is needed to install dependencies and to request live AI; the game itself runs locally.

A ready-to-paste agent request:

> Read AGENTS.md, then install dependencies and run QALA with npm run demo. Open the local URL, inspect a policy preview, and verify that it spends no budget. Run npm run check and the browser journeys. Report the observed results and any blockers. Keep the supplied scoring rules unchanged.

For development with hot reload, run `npm run dev`. If you need AI, keep `npm start` running in a second terminal; Vite forwards `/api` to localhost:8789. Use the exact Vite URL printed in the terminal rather than assuming a port.

## Optional AI explanations

If QALA is already running, open **http://localhost:8789/#ai** to go straight to the key form. Do not run a second server. The offline HTML provides an **Open AI version** button for this address; it opens a separate tab only when clicked. The offline file and localhost have separate browser saves.

In the local app, use the optional AI connection in onboarding or open the advisor from the city. Enter an OpenAI API key to enable generated explanations. Jev's Typesafe key is optional for typed recommendation selection. Connecting a key does not make a paid model call; requesting AI advice does. Session keys stay in local server memory and are cleared on disconnect or server restart.

Alternatively:

```bash
cp .env.example .env
# Fill OPENAI_API_KEY and/or TYPESAFE_API_KEY in this ignored local file.
npm run demo
```

Do not prefix keys with `VITE_`. Environment keys are loaded at server startup. Restart after changing `.env`; remove a key from `.env` to remove its persistent developer configuration. `GET /api/status` reports configuration without returning credentials.

The standalone `file://` game uses clearly labeled local analysis. To use live providers, open the localhost app. Both modes calculate scores through the same deterministic engine. See [AI contracts](AI-CONTRACTS.md).

## Verify a change

```bash
npm run check
npx playwright install chromium
npm run test:e2e
npm run format:check
npm run package
```

Install Chromium once. Browser tests use port **4179** and write screenshots to `docs/screenshots/`. `npm run package` rebuilds `play/QALA.html` so it matches the source.

## Common setup issues

| Symptom                                     | Action                                                                                                                                                      |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm` or Node is missing/too old            | Install Node.js 22.18+ and reopen the terminal.                                                                                                             |
| Port 8789 is occupied                       | First open http://localhost:8789: QALA may already be running. If another app uses the port, run `ADVISOR_PORT=8790 npm run demo` and open its printed URL. |
| `Missing script: "demo"`                    | You are in an old or different checkout. Use the latest repository main in a fresh folder; check that package.json includes the demo script.                |
| Local app says “Build the game first”       | Use `npm run demo`, which builds before starting.                                                                                                           |
| Dev game works but AI server is unavailable | Run `npm start` in a second terminal on 8789; the dev proxy targets that port.                                                                              |
| Download opens as GitHub source text        | Use **Download raw file** for `play/QALA.html`, not “Save page” on the GitHub preview.                                                                      |
| Playwright cannot find a browser            | Run `npx playwright install chromium`; on Linux CI add `--with-deps`.                                                                                       |
| Provider is unavailable or key is rejected  | Inspect the visible status; local analysis remains usable. Verify the key/account separately. No automated test needs a real key.                           |
| Browser blocks persistent storage           | Continue playing and export the scenario JSON before closing.                                                                                               |

For implementation boundaries, test oracles and contribution instructions, read [AGENTS.md](../AGENTS.md). For what has actually been verified, read [VERIFICATION.md](VERIFICATION.md).

## Team analytics and custom scenarios

Russian is the default UI and repository README. English and Kazakh remain selectable. From the Mayor’s desk, open **Scenario laboratory** (Лаборатория сценариев) to edit custom limits or add a policy. The official game remains fixed at 100 budget and five choices. The lab uses independent browser storage and labels its JSON `qala-sandbox-v1`; never submit it as an official five-decision result.

Use the advisor’s **Find a strong plan** to compare a complete legal continuation. It keeps funded choices, runs locally and only opens a preview. The report and lab share district population shares, all ten indicators, deficit charts, a 5×10 matrix and the formula. The visible report and report AI narration use additive Shapley allocation; v1 official JSON retains its previously defined marginal diagnostics.
