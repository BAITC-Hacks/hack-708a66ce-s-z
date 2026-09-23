import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchPlans, shapleyContributions } from '../src/game/planSearch';
import {
  BASELINE,
  simulate,
  validate,
  recommend,
  contributions,
  type Decision,
} from '../src/game/engine';
import { EXAMPLE } from '../src/game/data';

function greedyFrom(fixed: readonly Decision[]) {
  const plan = fixed.map((decision) => ({ ...decision }));
  while (plan.length < 5) {
    const next = recommend(plan);
    assert.ok(next);
    plan.push(next.decision);
  }
  return plan;
}
const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);

test('bounded plan search finds a legal completion at least as strong as greedy without changing inputs', async () => {
  const fixed = Object.freeze(
    [{ measureId: 'M7', districtId: 'nura' }].map((d) => Object.freeze(d)),
  ) as readonly Decision[];
  const original = structuredClone(fixed);
  const progress: number[] = [];
  const found = await searchPlans(fixed, { onProgress: (p) => progress.push(p.evaluatedStates) });
  assert.deepEqual(fixed, original);
  assert.deepEqual(found.decisions.slice(0, fixed.length), original);
  assert.equal(found.decisions.length, 5);
  assert.deepEqual(validate(found.decisions), []);
  assert.equal(found.fixedCount, 1);
  assert.equal(found.beamWidth, 180);
  assert.equal(found.optimal, false);
  const actual = simulate(found.decisions);
  close(found.score, actual.score);
  close(found.cost, actual.cost);
  close(found.gain, actual.score - BASELINE.score);
  close(found.gainOverCurrent, actual.score - simulate(fixed).score);
  assert.ok(found.score >= simulate(greedyFrom(fixed)).score - 1e-10);
  assert.ok(found.cost <= 100);
  assert.ok(found.evaluatedStates > found.completedPlans && found.completedPlans > 0);
  assert.ok(progress.every((count, index) => !index || count >= progress[index - 1]));
  assert.ok(progress.length > 3, 'work yields and publishes intermediate progress');
});

test('fresh search is deterministic and retains a greedy floor even with a narrow beam', async () => {
  const first = await searchPlans([], { beamWidth: 180 });
  const second = await searchPlans([], { beamWidth: 180 });
  assert.deepEqual(first, second);
  assert.deepEqual(validate(first.decisions), []);
  assert.ok(first.score > BASELINE.score);
  const narrow = await searchPlans([], { beamWidth: 1 });
  assert.ok(narrow.score >= narrow.greedyScore - 1e-10);
  assert.deepEqual(validate(narrow.decisions), []);
});

test('completed plans stay fixed; invalid and impossible prefixes are rejected', async () => {
  const complete = await searchPlans(EXAMPLE);
  assert.deepEqual(complete.decisions, EXAMPLE);
  close(complete.score, simulate(EXAMPLE).score);
  assert.equal(complete.gainOverCurrent, 0);
  assert.equal(complete.evaluatedStates, 0);
  await assert.rejects(searchPlans([{ measureId: 'unknown' }]), /Invalid fixed/);
  const deadEnd: Decision[] = [
    { measureId: 'M3', districtId: 'nura' },
    { measureId: 'M13', districtId: 'almaty' },
    { measureId: 'M5', districtId: 'saryarka' },
  ];
  assert.deepEqual(validate(deadEnd, false), []);
  await assert.rejects(searchPlans(deadEnd), /no legal five-choice completion/);
});

test('aborted searches reject promptly and never emit later progress or stale results', async () => {
  const before = new AbortController();
  before.abort();
  await assert.rejects(searchPlans([], { signal: before.signal }), { name: 'AbortError' });
  const running = new AbortController();
  let updates = 0;
  const pending = searchPlans([], {
    signal: running.signal,
    onProgress: (progress) => {
      updates++;
      if (progress.evaluatedStates >= 96) running.abort();
    },
  });
  await assert.rejects(pending, { name: 'AbortError' });
  const countAfterAbort = updates;
  const replacement = await searchPlans(EXAMPLE.slice(0, 4));
  assert.deepEqual(replacement.decisions.slice(0, 4), EXAMPLE.slice(0, 4));
  assert.equal(
    updates,
    countAfterAbort,
    'cancelled work never publishes into the replacement search',
  );
  assert.deepEqual(validate(replacement.decisions), []);
});

test('exact Shapley contributions add up to total gain and share nonlinear threshold effects', () => {
  assert.deepEqual(shapleyContributions([]), []);
  const plans: readonly (readonly Decision[])[] = [
    EXAMPLE,
    [{ measureId: 'M10', districtId: 'nura' }, { measureId: 'M12' }],
    [
      { measureId: 'M7', districtId: 'nura' },
      { measureId: 'M9', districtId: 'nura' },
    ],
  ];
  for (const plan of plans) {
    const frozen = Object.freeze(plan.map((d) => Object.freeze({ ...d })));
    const values = shapleyContributions(frozen);
    close(
      values.reduce((sum, row) => sum + row.gain, 0),
      simulate(plan).score - BASELINE.score,
    );
    assert.deepEqual(
      values.map((row) => row.decision),
      plan,
    );
    const reversed = shapleyContributions([...plan].reverse());
    for (const row of values)
      close(
        row.gain,
        reversed.find((entry) => entry.decision.measureId === row.decision.measureId)!.gain,
      );
  }
  const thresholdPlan = plans[2];
  const naive = contributions(thresholdPlan).reduce((sum, row) => sum + row.gain, 0);
  const exact = shapleyContributions(thresholdPlan).reduce((sum, row) => sum + row.gain, 0);
  assert.ok(
    Math.abs(exact - naive) > 0.9,
    'a shared critical-threshold benefit is allocated rather than lost',
  );
  assert.throws(() => shapleyContributions([{ measureId: 'unknown' }]), /Invalid contribution/);
});
