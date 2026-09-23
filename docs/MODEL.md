# Model contract

Source: supplied HackAlem case PDF and [detailed synthetic dataset](supplied-dataset.ru.txt). The five district names are labels for the challenge data. Neither the Phaser placements nor the source values represent verified real-world geography or measurements.

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
- Category bars within the district panel use the corresponding indicator weights, normalized within each category.
- Marginal contribution is `score(all) - score(all except policy)`. These values are explicitly non-additive because the score includes a minimum, thresholds and policy synergies.
- A partial scenario is only a forecast. `finalResult` returns `null` for any invalid complete set.

## Explainability and AI

The deterministic local report states the city average, weakest district, critical pairs, lag effects, synergies and marginal contributions. It is available without network access and is labeled local analysis.

An optional LLM server uses the same engine to reconstruct all numbers from measure IDs and targets; user-supplied score fields are ignored. The response is presentation text only and cannot update game state. The provider is asked to quote supplied values, not compute new numbers. This is a grounding instruction, not a mathematical guarantee against generated text errors; the engine report remains authoritative.

## Not modeled

Real municipal costs, causally estimated health outcomes, construction uncertainty, public opinion, ongoing operating expense, exact geography, population migration, and unexpected events. Do not use this synthetic educational model to allocate a real city budget.
