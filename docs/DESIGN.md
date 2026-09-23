# QALA game experience redesign

Reading this as: an isometric city strategy game for first-time players, with a lived-in Astana and tactile controls embedded in the world.

## Audit of version one

- The olive-and-cream dashboard makes the city a chart, rather than the place the player inhabits.
- System fonts, repeated icon cards, many micro-labels and large vertical scrolling make play feel like administration.
- The scene has repeated boxes, sparse streets, no traffic and weak district identity.
- The player gets rules but no arrival, advisor character or guided first action.
- Preserve: verified engine, official rules, preview/commit/undo, three languages, accessible controls, final report, local storage, offline artifact and optional grounded AI.

## Direction

Overhaul approved by the user, inspired by their classic isometric strategy screenshot, without copying game art. Keep QALA and all simulation mechanics.

DESIGN_VARIANCE 7 / MOTION_INTENSITY 6 / VISUAL_DENSITY 7. This is a game cockpit, not a marketing page. World-space labels and policy cards convey actual game state. The Taste skill's marketing-only rules are applied to the introduction where appropriate; the redesign audit informs the rest.

## Foundations

- React owns accessible UI and the verified simulation; Phaser 3 owns the isometric world, layered sprites, camera, traffic and animation. The user explicitly selected Phaser after considering the original renderer.
- Unbounded display type + Manrope body, self-hosted with Cyrillic subsets. Tabular numbers.
- Petrol/navy cockpit surfaces, readable ivory text, amber action accent. Category colors only carry game meaning.
- Radius scale: 4px utility controls, 10px panels, 12px physical cards. Layer order: world, district markers, HUD, policy preview, onboarding, dialogs.
- Day and night world themes, high-contrast controls, reduced-motion support.

## Player journey

1. Arrive: cinematic Astana title, clear start/continue, language controls.
2. Meet the advisor: a fictional city planner explains 100 budget, five decisions and the needs of Nura.
3. Take office: an in-world prompt guides the first district inspection and policy preview, with a skip option.
4. Play: select a district, browse a compact policy hand, inspect consequences, commit. The city responds with new structures, camera focus, traffic and clear impact feedback.
5. Reflect: final report preserves exact arithmetic, scenario saving, comparison and JSON export.

## World craft

Distinct modern glass towers, older courtyard apartment blocks, suburban houses, civic buildings, Baiterek, a tent-shaped landmark, mosque domes, tree-lined avenues, marked roads, bridges and the river. Traffic animates on roads. Adoption places recognizable policy structures, not generic cubes. Camera movement helps orient the player; it never changes the score.

## Verification

Test introduction, skip and continue, first five-turn play, context menu/preview close, district selection, camera controls, day/night, sound opt-in, mobile bottom sheets, reduced motion, WebGL fallback, and offline first launch. Refresh all README screenshots only after the redesigned game is verified.

Skill used: [Taste frontend](https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md) and its [redesign audit](https://github.com/Leonxlnx/taste-skill/blob/main/skills/redesign-skill/SKILL.md), read from the user-requested repository. Existing code is retained wherever it carries tested behavior; no copied templates or additional hosted service.
