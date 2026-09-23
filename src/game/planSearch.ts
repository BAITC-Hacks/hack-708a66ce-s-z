import {
  BASELINE,
  candidates,
  canComplete,
  recommend,
  simulate,
  validate,
  type Decision,
} from './engine';

export interface PlanSearchProgress {
  /** Distinct legal partial/full states scored by the beam, not an exhaustive search count. */
  evaluatedStates: number;
  completedPlans: number;
  depth: number;
  bestScore: number;
}
export interface PlanSearchResult extends PlanSearchProgress {
  decisions: Decision[];
  score: number;
  cost: number;
  gain: number;
  gainOverCurrent: number;
  greedyScore: number;
  fixedCount: number;
  beamWidth: number;
  optimal: false;
}
export interface PlanSearchOptions {
  signal?: AbortSignal;
  beamWidth?: number;
  onProgress?: (progress: PlanSearchProgress) => void;
}
type SearchNode = { decisions: Decision[]; score: number; cost: number; key: string };
const clone = (decisions: readonly Decision[]): Decision[] => decisions.map((d) => ({ ...d }));
const keyFor = (decisions: readonly Decision[]) =>
  decisions
    .map((d) => `${d.measureId}:${d.districtId ?? 'city'}`)
    .sort()
    .join('|');
const compare = (a: SearchNode, b: SearchNode) =>
  b.score - a.score || a.cost - b.cost || a.key.localeCompare(b.key);
function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Plan search cancelled', 'AbortError');
}
async function yieldToBrowser(signal?: AbortSignal) {
  checkAbort(signal);
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  checkAbort(signal);
}
function nodeFor(decisions: Decision[]): SearchNode {
  const { score, cost } = simulate(decisions);
  return { decisions, score, cost, key: keyFor(decisions) };
}

/**
 * Bounded beam search using the official engine only. Existing choices remain fixed.
 * Equivalent permutations are deduplicated. A greedy complete plan is retained as
 * a floor, so pruning can never make the suggestion worse than that baseline.
 * This explores alternatives; it does not certify a global optimum.
 */
export async function searchPlans(
  current: readonly Decision[] = [],
  options: PlanSearchOptions = {},
): Promise<PlanSearchResult> {
  checkAbort(options.signal);
  const fixed = clone(current);
  if (validate(fixed, false).length) throw new Error('Invalid fixed decisions');
  if (!canComplete(fixed))
    throw new Error('The fixed decisions have no legal five-choice completion');
  const beamWidth = Math.max(
    1,
    Math.min(240, Number.isFinite(options.beamWidth) ? Math.floor(options.beamWidth!) : 180),
  );
  const initial = nodeFor(fixed);
  let evaluatedStates = 0,
    completedPlans = 0;
  const publish = (depth: number, bestScore: number) => {
    checkAbort(options.signal);
    options.onProgress?.({ evaluatedStates, completedPlans, depth, bestScore });
    checkAbort(options.signal);
  };
  // Yield before any search work so the running state and Cancel control can paint.
  await yieldToBrowser(options.signal);
  const greedy = clone(fixed);
  while (greedy.length < 5) {
    checkAbort(options.signal);
    const next = recommend(greedy);
    if (!next) throw new Error('The fixed decisions have no legal five-choice completion');
    greedy.push({ ...next.decision });
    await yieldToBrowser(options.signal);
  }
  let bestComplete = nodeFor(greedy);
  const greedyScore = bestComplete.score;
  let beam = [initial];
  publish(fixed.length, bestComplete.score);
  for (let depth = fixed.length + 1; depth <= 5; depth++) {
    const nextStates = new Map<string, SearchNode>();
    let workSinceYield = 0;
    for (const node of beam) {
      checkAbort(options.signal);
      for (const decision of candidates(node.decisions)) {
        checkAbort(options.signal);
        const next = [...node.decisions, { ...decision }];
        const key = keyFor(next);
        if (nextStates.has(key)) continue;
        const candidate = nodeFor(next);
        nextStates.set(key, candidate);
        evaluatedStates++;
        if (depth === 5) {
          completedPlans++;
          if (compare(candidate, bestComplete) < 0) bestComplete = candidate;
        }
        if (++workSinceYield >= 96) {
          publish(depth - 1, bestComplete.score);
          await yieldToBrowser(options.signal);
          workSinceYield = 0;
        }
      }
    }
    const ranked = [...nextStates.values()].sort(compare);
    beam = [];
    for (const candidate of ranked) {
      // Only surviving branches need an exact completion check. No rule is reimplemented here.
      if (canComplete(candidate.decisions)) beam.push(candidate);
      if (beam.length === beamWidth) break;
    }
    publish(depth, bestComplete.score);
    await yieldToBrowser(options.signal);
    if (!beam.length) break;
  }
  checkAbort(options.signal);
  const result = simulate(bestComplete.decisions);
  if (validate(bestComplete.decisions).length)
    throw new Error('Search did not produce a legal plan');
  return {
    decisions: clone(bestComplete.decisions),
    score: result.score,
    cost: result.cost,
    gain: result.score - BASELINE.score,
    gainOverCurrent: result.score - initial.score,
    greedyScore,
    fixedCount: fixed.length,
    beamWidth,
    evaluatedStates,
    completedPlans,
    depth: 5,
    bestScore: result.score,
    optimal: false,
  };
}

/** Exact subset Shapley allocation for the official maximum of five decisions. */
export function shapleyContributions(decisions: readonly Decision[]) {
  if (validate(decisions, false).length) throw new Error('Invalid contribution decisions');
  const choices = clone(decisions),
    n = choices.length;
  if (!n) return [] as { decision: Decision; gain: number }[];
  const factorial = [1];
  for (let i = 1; i <= n; i++) factorial[i] = factorial[i - 1] * i;
  const scores = Array.from(
    { length: 1 << n },
    (_, mask) => simulate(choices.filter((_, index) => mask & (1 << index))).score,
  );
  return choices.map((decision, index) => {
    let gain = 0;
    for (let mask = 0; mask < 1 << n; mask++) {
      if (mask & (1 << index)) continue;
      let size = 0;
      for (let bits = mask; bits; bits &= bits - 1) size++;
      const weight = (factorial[size] * factorial[n - size - 1]) / factorial[n];
      gain += weight * (scores[mask | (1 << index)] - scores[mask]);
    }
    return { decision, gain };
  });
}
