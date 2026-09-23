import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BASELINE, moveIssues, simulate, type Decision } from '../src/game/engine';
import { DISTRICTS, EXAMPLE } from '../src/game/data';
import { districtNeeds, milestones, policyHand } from '../src/game/experience';

test('milestones describe computed outcomes without changing the case score, and undo reverses them', () => {
  const before = structuredClone(BASELINE);
  assert.deepEqual(
    milestones(BASELINE).map((m) => m.earned),
    [false, false, false],
  );
  const school: Decision = { measureId: 'M7', districtId: 'nura' };
  const clinic: Decision = { measureId: 'M8', districtId: 'nura' };
  assert.equal(milestones(simulate([school, clinic]))[0].earned, true);
  assert.equal(milestones(simulate([school]))[0].earned, false);
  const result = simulate(EXAMPLE),
    snapshot = structuredClone(result);
  assert.deepEqual(
    milestones(result).map((m) => m.earned),
    [true, true, true],
  );
  assert.deepEqual(result, snapshot);
  assert.ok(Math.abs(result.score - 56.54307) < 1e-9);
  assert.deepEqual(BASELINE, before);
});

test('policy hands offer distinct legal choices and refresh as budget/category constraints change', () => {
  for (const district of DISTRICTS) {
    for (let i = 0; i <= EXAMPLE.length; i++) {
      const decisions = EXAMPLE.slice(0, i),
        hand = policyHand(decisions, district.id, 'en');
      assert.ok(hand.length <= 3);
      assert.equal(new Set(hand.map((c) => c.id)).size, hand.length);
      for (const card of hand) {
        assert.deepEqual(moveIssues(decisions, card.decision), []);
        assert.ok(!card.decision.districtId || card.decision.districtId === district.id);
      }
    }
  }
  assert.ok(new Set(policyHand([], 'nura', 'en').map((c) => c.category)).size >= 2);
  assert.deepEqual(districtNeeds(BASELINE, 'nura'), ['S2', 'S1']);
});
