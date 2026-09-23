# Model contract

Source: supplied HackAlem case PDF and [detailed synthetic dataset](supplied-dataset.ru.txt). The five district names are labels for the challenge data. Neither the visual placements nor the source values represent verified real-world geography or measurements.

## Inputs

- Budget: 100; five unique measures; at most two per category.
- Measures M1–M14 are implemented in `src/game/data.ts` with their exact cost, lag, scope and effects.
- All ten indicators point in the positive direction, including road flow and clean air. Higher is better.
- Population shares: Esil 0.27, Almaty 0.24, Saryarka 0.20, Baikonur 0.13, Nura 0.16.
- Weights, T1 through C2: 0.10, 0.10, 0.09, 0.11, 0.11, 0.11, 0.09, 0.09, 0.10, 0.10.

## Evaluation order

1. Validate identifiers, targets, duplicates, category counts, cost and conflicts.
2. Start with fresh copies of the raw district indicators.
3. Add full effects multiplied by `(8 - lag) / 8` to the appropriate district(s).
4. Add each active synergy once, in the district of the first measure in the pair.
5. Clamp the final indicator totals to `[0, 100]` (after all additions, not per action).
6. Compute district weighted sums, the population-weighted average, and the minimum district score.
7. Count district/indicator pairs strictly below 40; subtract one per pair.
8. Calculate `0.7 * average + 0.3 * minimum - criticalCount`. Round only for display.

Policy accumulation uses a canonical order to avoid floating-point differences between player permutations. Turns never move the evaluation horizon. There is no extra turn-based decay, delayed-event randomness, or budget bonus.

## Synergies and conflicts

| Pair      | Effect / restriction                            |
| --------- | ----------------------------------------------- |
| M1 + M2   | T1 +2 in M1's district                          |
| M10 + M12 | B1 +2 in M10's district                         |
| M5 + M6   | E2 +2 in M5's district                          |
| M1 + M3   | Forbidden globally, even in different districts |
| M4 + M7   | Forbidden in the same district                  |
| M5 + M13  | Forbidden in the same district                  |

## Reference outputs

| Quantity                | Baseline | Official example |
| ----------------------- | -------: | ---------------: |
| City average            |  56.8624 |          58.0776 |
| Weakest district (Nura) |    49.18 |          52.9625 |
| Critical pairs          |        2 |                0 |
| Final formula value     | 52.55768 |         56.54307 |
| Cost                    |        0 |               95 |

Baseline is a reference/forecast, not a valid submitted five-decision scenario. The raw-data calculations agree with the supplied rounded examples.

## Additional UX helpers

- A completion-existence search blocks partial choices from which no valid fifth decision is reachable. This only removes dead ends; it does not change legal final scenarios.
- Recommendations rank legal next actions by immediate score gain and check that the game can still finish. They do not guarantee a global optimum.
- District details expose all ten raw indicators (0–100 scores, not percentages of residents), before/after meters, the strict threshold 40 and the supplied population share. The problem chart shows the sum of deficits `max(0, 40 − indicator)` for each indicator across all districts; the actual penalty still counts critical pairs, not deficit size.
- The visible report uses exact Shapley attribution over all subsets of at most five decisions. These contributions sum to `score(all) − baseline.score` before rounding, sharing threshold and synergy interactions. The legacy v1 exported marginal contribution is `score(all) - score(all except policy)`. These values are explicitly non-additive because the score includes a minimum, thresholds and policy synergies.
- A partial scenario is only a forecast. `finalResult` returns `null` for any invalid complete set.

## Optional exploration

A cancellable, deterministic beam search retains up to 180 intermediate states per decision depth. It fixes already funded decisions, deduplicates canonical sets, and evaluates complete candidates with the official engine. A greedy completion is retained as a quality floor. This yields the best found plan, not a proof of global optimality. No search result is adopted automatically.

The separate scenario lab supports budget 1–1,000 and 1–10 decisions, plus up to 30 user measures. Each custom measure has an ID beginning `C-`, cost 1–1,000, integer lag 0–7, category, scope and finite effects between −100 and 100. All-zero effects are rejected. Official effects, synergies, conflicts, category limits and clipping remain the same. Defaults reproduce the official engine. Experimental records never enter official game storage, archives or AI requests.

If only the budget/count rules are violated, the lab still shows a forecast and explicit issues. Structural invalidity produces no calculation. A valid final sandbox result requires the chosen decision count and all constraints, and is labeled separately from the official score. Custom assumptions do not become authoritative dataset values.

## Explainability and AI

The deterministic local report states the city average, weakest district, critical pairs, lag effects, synergies and exact Shapley contributions in the visible report; exported v1 marginal values retain their original definition. It is available without network access and is labeled local analysis.

An optional LLM server uses the same engine to reconstruct all numbers from measure IDs and targets; user-supplied score fields are ignored. The response is presentation text only and cannot update game state. The provider is asked to quote supplied values, not compute new numbers. This is a grounding instruction, not a mathematical guarantee against generated text errors; the engine report remains authoritative.

## Not modeled

Real municipal costs, causally estimated health outcomes, construction uncertainty, public opinion, ongoing operating expense, exact geography, population migration, and unexpected events. Do not use this synthetic educational model to allocate a real city budget.
