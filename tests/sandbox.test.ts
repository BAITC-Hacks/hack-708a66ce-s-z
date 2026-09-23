import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLE, MEASURES, DISTRICTS, type DistrictId } from '../src/game/data';
import { simulate, validate, type Decision } from '../src/game/engine';
import {
  DEFAULT_SANDBOX_RULES,
  newSandbox,
  parseSandbox,
  sandboxDocument,
  sandboxEvaluate,
  sandboxIssues,
  validCustomMeasure,
  validSandboxRules,
  type CustomMeasure,
  type SandboxState,
} from '../src/game/sandbox';
const custom: CustomMeasure = {
  id: 'C-cycling',
  name: 'Cycling links',
  description: 'Hypothetical cycle routes with a road-flow tradeoff.',
  category: 'transport',
  scope: 'district',
  cost: 12,
  lag: 2,
  effects: { T2: 10, T1: -4 },
};
const state = (decisions: readonly Decision[] = []): SandboxState => ({
  ...newSandbox(),
  decisions: decisions.map((decision) => ({ ...decision })),
});

test('sandbox defaults reproduce the official arithmetic exactly, including every published synergy', () => {
  const scenarios: (readonly Decision[])[] = [
    [],
    EXAMPLE,
    [{ measureId: 'M1', districtId: 'esil' }, { measureId: 'M2' }],
    [{ measureId: 'M5', districtId: 'saryarka' }, { measureId: 'M6' }],
    [{ measureId: 'M10', districtId: 'baikonur' }, { measureId: 'M12' }],
  ];
  for (const measure of MEASURES)
    scenarios.push([
      {
        measureId: measure.id,
        ...(measure.scope === 'district' ? { districtId: 'nura' as DistrictId } : {}),
      },
    ]);
  for (const decisions of scenarios) {
    assert.deepEqual(sandboxEvaluate(state(decisions)).result, simulate(decisions));
    assert.deepEqual(sandboxIssues(state(decisions)), validate(decisions, false));
  }
  assert.equal(sandboxEvaluate(state(EXAMPLE), true).final, true);
  assert.deepEqual(sandboxEvaluate(state([...EXAMPLE].reverse())).result, simulate(EXAMPLE));
});

test('changing budget/count preserves the calculated forecast but marks completion invalid', () => {
  const before = state(EXAMPLE),
    result = sandboxEvaluate(before).result;
  const changed = { ...before, rules: { budget: 80, decisionCount: 3 } };
  const evaluation = sandboxEvaluate(changed, true);
  assert.deepEqual(evaluation.result, result);
  assert.equal(evaluation.valid, false);
  assert.equal(evaluation.final, false);
  assert.deepEqual(
    evaluation.issues.map((issue) => issue.code),
    ['count', 'budget'],
  );
  assert.deepEqual(parseSandbox(JSON.stringify(changed)), changed);
  const expanded = { ...before, rules: { budget: 1000, decisionCount: 10 } };
  assert.deepEqual(sandboxEvaluate(expanded).result, result);
  assert.equal(sandboxEvaluate(expanded).valid, true);
  assert.equal(sandboxEvaluate(expanded, true).final, false);
});

test('custom district/city effects apply delay, negatives and clipping using the same horizon', () => {
  const local: SandboxState = {
    ...newSandbox(),
    rules: { budget: 1000, decisionCount: 1 },
    customMeasures: [custom],
    decisions: [{ measureId: custom.id, districtId: 'nura' }],
  };
  const result = sandboxEvaluate(local, true).result!;
  assert.equal(result.metrics.nura.T2, 47.5);
  assert.equal(result.metrics.nura.T1, 52);
  assert.equal(result.cost, 12);
  assert.equal(result.metrics.esil.T2, 62);
  const city: SandboxState = {
    ...local,
    customMeasures: [
      { ...custom, scope: 'city', lag: 0, cost: 500, effects: { T1: -100, B1: 100 } },
    ],
    decisions: [{ measureId: custom.id }],
  };
  const evaluated = sandboxEvaluate(city, true);
  assert.equal(evaluated.final, true);
  for (const district of DISTRICTS) {
    assert.equal(evaluated.result!.metrics[district.id].T1, 0);
    assert.equal(evaluated.result!.metrics[district.id].B1, 100);
  }
  assert.equal(evaluated.result!.cost, 500);
});

test('custom policy validation bounds every user-controlled field and rejects spoofed dataset IDs', () => {
  assert.equal(validCustomMeasure(custom), true);
  for (const change of [
    { id: 'M1' },
    { id: 'C-' },
    { id: 'C-' + 'a'.repeat(65) },
    { name: '' },
    { name: 'x'.repeat(101) },
    { description: 'x'.repeat(501) },
    { category: 'money' },
    { scope: 'world' },
    { cost: 0 },
    { cost: 1001 },
    { cost: 1.2 },
    { lag: -1 },
    { lag: 8 },
    { effects: {} },
    { effects: { T1: 0 } },
    { effects: { T1: Infinity } },
    { effects: { T1: NaN } },
    { effects: { T1: '10' } },
    { effects: { T1: 101 } },
    { effects: { T1: -101 } },
    { effects: { fake: 12 } },
    { effects: [] },
  ])
    assert.equal(validCustomMeasure({ ...custom, ...change }), false);
  for (const rules of [
    { budget: 0, decisionCount: 5 },
    { budget: 1001, decisionCount: 5 },
    { budget: 100, decisionCount: 11 },
    { budget: 100, decisionCount: 0 },
    { budget: 1.5, decisionCount: 5 },
    { budget: '100', decisionCount: 5 },
  ])
    assert.equal(validSandboxRules(rules), false);
  assert.equal(validSandboxRules({ budget: 1, decisionCount: 1 }), true);
  assert.equal(validSandboxRules({ budget: 1000, decisionCount: 10 }), true);
});

test('sandbox keeps uniqueness, target, category and official conflict guards', () => {
  const base = {
    ...newSandbox(),
    rules: { budget: 1000, decisionCount: 10 },
    customMeasures: [custom],
  };
  assert.ok(
    sandboxIssues({
      ...base,
      decisions: [
        { measureId: 'M1', districtId: 'nura' },
        { measureId: 'M3', districtId: 'esil' },
      ],
    }).some((issue) => issue.code === 'transport-conflict'),
  );
  assert.ok(
    sandboxIssues({
      ...base,
      decisions: [
        { measureId: 'M4', districtId: 'nura' },
        { measureId: 'M7', districtId: 'nura' },
      ],
    }).some((issue) => issue.code === 'land-conflict'),
  );
  assert.ok(
    sandboxIssues({
      ...base,
      decisions: [
        { measureId: 'M5', districtId: 'nura' },
        { measureId: 'M13', districtId: 'nura' },
      ],
    }).some((issue) => issue.code === 'utility-conflict'),
  );
  assert.ok(
    sandboxIssues({
      ...base,
      decisions: [
        { measureId: 'M1', districtId: 'nura' },
        { measureId: 'M2' },
        { measureId: custom.id, districtId: 'nura' },
      ],
    }).some((issue) => issue.code === 'category'),
  );
  assert.equal(sandboxEvaluate({ ...base, decisions: [{ measureId: custom.id }] }).result, null);
  assert.equal(
    sandboxEvaluate({
      ...base,
      decisions: [
        { measureId: custom.id, districtId: 'nura' },
        { measureId: custom.id, districtId: 'esil' },
      ],
    }).result,
    null,
  );
  assert.equal(sandboxEvaluate({ ...base, decisions: [{ measureId: 'M999' }] }).result, null);
  assert.equal(sandboxEvaluate({ ...base, decisions: [null] }).result, null);
});

test('malformed storage is safely rejected, custom catalogue capped, and unknown saved fields discarded', () => {
  for (const raw of [
    null,
    '',
    '{',
    'null',
    '{}',
    '[]',
    JSON.stringify({ ...newSandbox(), decisions: [{ measureId: 'M1', districtId: 'fake' }] }),
    JSON.stringify({ ...newSandbox(), customMeasures: [custom, custom] }),
    JSON.stringify({
      ...newSandbox(),
      customMeasures: Array.from({ length: 31 }, (_, i) => ({ ...custom, id: `C-${i}` })),
    }),
    'x'.repeat(100001),
  ])
    assert.equal(parseSandbox(raw), null);
  const valid = { ...newSandbox(), customMeasures: [custom], unusedSecret: 'not-to-be-retained' };
  const parsed = parseSandbox(JSON.stringify(valid));
  assert.ok(parsed);
  assert.equal(JSON.stringify(parsed).includes('not-to-be-retained'), false);
  assert.deepEqual(parsed!.rules, DEFAULT_SANDBOX_RULES);
});

test('the lab clones initial choices and exports only explicitly non-official custom scenarios', () => {
  const initial: Decision[] = EXAMPLE.map((d) => ({ ...d }));
  const copy = newSandbox(initial);
  copy.decisions[0].districtId = 'esil';
  copy.rules.budget = 500;
  assert.equal(initial[0].districtId, 'nura');
  assert.equal(DEFAULT_SANDBOX_RULES.budget, 100);
  const complete = sandboxDocument(state(EXAMPLE));
  assert.equal(complete.officialSubmission, false);
  assert.equal(complete.mode, 'sandbox');
  assert.equal(complete.status, 'complete-custom-scenario');
  assert.equal(complete.horizonQuarters, 8);
  const invalid = sandboxDocument({ ...state(EXAMPLE), rules: { budget: 1, decisionCount: 1 } });
  assert.equal(invalid.status, 'invalid-or-incomplete-custom-scenario');
  assert.equal(invalid.officialSubmission, false);
  assert.ok(invalid.result);
});
