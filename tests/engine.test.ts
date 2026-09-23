import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BASELINE,
  canComplete,
  candidates,
  clip,
  finalResult,
  moveIssues,
  recommend,
  simulate,
  validate,
} from '../src/game/engine';
import { DISTRICTS, EXAMPLE, KEYS, MEASURES, WEIGHTS } from '../src/game/data';
const close = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
test('raw dataset reproduces all supplied district scores and exact baseline', () => {
  close(
    Object.values(WEIGHTS).reduce((a, b) => a + b, 0),
    1,
  );
  close(
    DISTRICTS.reduce((a, b) => a + b.pop, 0),
    1,
  );
  [62.99, 57.06, 54.65, 56.63, 49.18].forEach((s, i) =>
    close(BASELINE.districtScores[DISTRICTS[i].id], s),
  );
  close(BASELINE.average, 56.8624);
  close(BASELINE.score, 52.55768);
  assert.equal(BASELINE.critical.length, 2);
});
test('official five-policy example costs 95, resolves two critical metrics, adds synergy', () => {
  const { issues, result } = finalResult(EXAMPLE);
  assert.deepEqual(issues, []);
  assert.ok(result);
  assert.equal(result.cost, 95);
  close(result.score, 56.54307);
  assert.equal(result.critical.length, 0);
  assert.equal(result.synergies.length, 1);
  close(result.metrics.nura.B1, 67.5);
});
test('all policy lags and target scopes use exact eight-quarter horizon', () => {
  for (const m of MEASURES) {
    const r = simulate([
      { measureId: m.id, ...(m.scope === 'district' ? { districtId: 'nura' as const } : {}) },
    ]);
    for (const d of DISTRICTS)
      for (const k of KEYS)
        close(
          r.metrics[d.id][k],
          d.metrics[k] +
            (m.scope === 'city' || d.id === 'nura' ? ((m.effects[k] ?? 0) * (8 - m.lag)) / 8 : 0),
        );
  }
});
test('all three synergies are fixed +2 and apply only to first policy district', () => {
  for (const [a, b, k] of [
    ['M1', 'M2', 'T1'],
    ['M10', 'M12', 'B1'],
    ['M5', 'M6', 'E2'],
  ] as const) {
    const r = simulate([{ measureId: a, districtId: 'esil' }, { measureId: b }]);
    const one = simulate([{ measureId: a, districtId: 'esil' }]),
      two = simulate([{ measureId: b }]);
    close(
      r.metrics.esil[k],
      one.metrics.esil[k] + two.metrics.esil[k] - BASELINE.metrics.esil[k] + 2,
    );
    close(r.metrics.nura[k], two.metrics.nura[k]);
  }
});
test('score and clipping boundaries; critical threshold is strictly less than 40', () => {
  assert.equal(clip(-10), 0);
  assert.equal(clip(125), 100);
  assert.equal(clip(40), 40);
  assert.ok(!BASELINE.critical.some((c) => c.indicator === 'T1' && c.districtId === 'almaty'));
  assert.ok(!BASELINE.critical.some((c) => c.indicator === 'T2' && c.districtId === 'nura'));
  assert.equal(simulate([{ measureId: 'M11', districtId: 'almaty' }]).critical.length, 3);
});
test('every permutation of the five moves has exactly the same score', () => {
  const permute = <T>(a: readonly T[]): T[][] =>
    a.length
      ? a.flatMap((v, i) => permute(a.filter((_, j) => j !== i)).map((rest) => [v, ...rest]))
      : [[]];
  for (const moves of permute(EXAMPLE)) assert.deepEqual(simulate(moves), simulate(EXAMPLE));
});
test('incomplete and invalid sets never receive a final score', () => {
  for (const bad of [
    [],
    EXAMPLE.slice(0, 4),
    [...EXAMPLE, { measureId: 'M9', districtId: 'nura' as const }],
    [{ measureId: 'M99' }],
    [{ measureId: 'M1' }],
    [{ measureId: 'M2', districtId: 'esil' as const }],
  ])
    assert.equal(finalResult(bad).result, null);
  assert.ok(
    validate([{ measureId: 'M2' }, { measureId: 'M2' }], false).some((i) => i.code === 'duplicate'),
  );
  assert.ok(
    validate(
      [
        { measureId: 'M3', districtId: 'nura' },
        { measureId: 'M5', districtId: 'nura' },
        { measureId: 'M7', districtId: 'nura' },
        { measureId: 'M13', districtId: 'esil' },
      ],
      false,
    ).some((i) => i.code === 'budget'),
  );
  assert.ok(
    validate(
      [
        { measureId: 'M7', districtId: 'nura' },
        { measureId: 'M8', districtId: 'esil' },
        { measureId: 'M9', districtId: 'esil' },
      ],
      false,
    ).some((i) => i.code === 'category'),
  );
});
test('conflicts enforce global BRT/LRT and district-specific land and utility rules', () => {
  assert.ok(
    validate(
      [
        { measureId: 'M1', districtId: 'esil' },
        { measureId: 'M3', districtId: 'nura' },
      ],
      false,
    ).some((i) => i.code === 'transport-conflict'),
  );
  for (const [a, b] of [
    ['M4', 'M7'],
    ['M5', 'M13'],
  ]) {
    assert.equal(
      validate(
        [
          { measureId: a, districtId: 'nura' },
          { measureId: b, districtId: 'nura' },
        ],
        false,
      ).length,
      1,
    );
    assert.equal(
      validate(
        [
          { measureId: a, districtId: 'esil' },
          { measureId: b, districtId: 'nura' },
        ],
        false,
      ).length,
      0,
    );
  }
});
test('dead-end guard prevents otherwise legal expensive prefixes', () => {
  const partial = [
    { measureId: 'M3', districtId: 'nura' as const },
    { measureId: 'M13', districtId: 'esil' as const },
  ];
  assert.ok(
    moveIssues(partial, { measureId: 'M5', districtId: 'saryarka' }).some(
      (i) => i.code === 'dead-end',
    ),
  );
  assert.equal(canComplete(EXAMPLE.slice(0, 4)), true);
  assert.equal(canComplete(EXAMPLE), true);
  assert.equal(canComplete([...EXAMPLE, { measureId: 'M9', districtId: 'esil' }]), false);
});
test('deterministic advisor can guide a complete valid run', () => {
  let decisions: Parameters<typeof simulate>[0] = [];
  for (let i = 0; i < 5; i++) {
    const pick = recommend(decisions);
    assert.ok(pick);
    assert.equal(moveIssues(decisions, pick.decision).length, 0);
    decisions = [...decisions, pick.decision];
  }
  assert.equal(validate(decisions).length, 0);
  assert.ok(simulate(decisions).score > BASELINE.score);
});
test('seeded randomized legal playthroughs preserve budget, valid completion and input immutability', () => {
  const source = JSON.stringify(DISTRICTS);
  let seed = 708;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  for (let run = 0; run < 60; run++) {
    let decisions: Parameters<typeof simulate>[0] = [];
    for (let i = 0; i < 5; i++) {
      const options = candidates(decisions).filter((d) => canComplete([...decisions, d]));
      assert.ok(options.length);
      decisions = [...decisions, options[Math.floor(random() * options.length)]];
    }
    assert.equal(validate(decisions).length, 0);
    assert.ok(simulate(decisions).cost <= 100);
  }
  assert.equal(JSON.stringify(DISTRICTS), source);
});
