import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLE } from '../src/game/data';
import { explanationInput } from '../src/game/explanation';
import { BASELINE, contributions, type Decision } from '../src/game/engine';
import { generateAdvice } from '../server/advisor';
test('LLM receives only trusted engine-generated scores and labeled forecast/final context', () => {
  const context = explanationInput(EXAMPLE, 'kk');
  assert.equal(context.mode, 'final');
  assert.equal(context.result.cost, 95);
  assert.ok(Math.abs(context.result.score - 56.54307) < 1e-9);
  assert.equal(context.language, 'kk');
  assert.equal(explanationInput([], 'en').mode, 'forecast');
  assert.throws(() => explanationInput([{ measureId: 'fake' }], 'ru'));
});
test('report narration uses additive Shapley allocation for synergy and shared threshold benefits', () => {
  const plans: readonly (readonly Decision[])[] = [
    EXAMPLE,
    [{ measureId: 'M10', districtId: 'nura' }, { measureId: 'M12' }],
    [
      { measureId: 'M7', districtId: 'nura' },
      { measureId: 'M9', districtId: 'nura' },
    ],
  ];
  for (const decisions of plans) {
    const context = explanationInput(decisions, 'en');
    assert.equal(context.attribution.method, 'exact-shapley');
    assert.equal(context.attribution.additiveBeforeRounding, true);
    assert.equal(context.rules.contributionsAreNotAdditive, false);
    assert.equal(context.attribution.baselineScore, BASELINE.score);
    const sum = context.contributions.reduce((total, row) => total + row.gain, 0);
    assert.ok(Math.abs(sum - context.attribution.totalGain) < 1e-10);
    assert.equal(context.attribution.totalGain, context.result.score - BASELINE.score);
  }
  const sharedThreshold = plans[2];
  const oldMarginals = contributions(sharedThreshold).reduce((total, row) => total + row.gain, 0);
  assert.ok(
    Math.abs(oldMarginals - explanationInput(sharedThreshold, 'en').attribution.totalGain) > 0.9,
  );
});
test('Responses API adapter sends computed context without storing, extracts output_text', async () => {
  const input = explanationInput(EXAMPLE, 'en');
  let received: any;
  const fetcher = (async (url: unknown, init: RequestInit) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    received = JSON.parse(init.body as string);
    return new Response(
      JSON.stringify({
        output: [
          {
            type: 'message',
            content: [
              { type: 'output_text', text: 'Nura has better access to education and healthcare.' },
            ],
          },
        ],
      }),
      { status: 200 },
    );
  }) as typeof fetch;
  const result = await generateAdvice(input, { apiKey: 'test-only', fetcher });
  assert.match(result, /Nura/);
  assert.equal(received.store, false);
  assert.equal(JSON.parse(received.input).result.cost, 95);
  assert.match(received.instructions, /do not calculate/i);
  assert.equal(JSON.parse(received.input).attribution.method, 'exact-shapley');
  assert.match(received.instructions, /sum to attribution.totalGain before rounding/);
  assert.doesNotMatch(received.instructions, /contributions cannot be summed/);
});
test('provider errors and empty results produce controlled failures', async () => {
  const input = explanationInput([], 'en');
  await assert.rejects(
    () =>
      generateAdvice(input, {
        apiKey: 'test-only',
        fetcher: (async () => new Response('{}', { status: 401 })) as typeof fetch,
      }),
    /unavailable/,
  );
  await assert.rejects(
    () =>
      generateAdvice(input, {
        apiKey: 'test-only',
        fetcher: (async () => new Response('{}', { status: 200 })) as typeof fetch,
      }),
    /Empty/,
  );
});
