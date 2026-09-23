import { test } from 'node:test';
import assert from 'node:assert/strict';
import Ajv from 'ajv';
import scenarioSchema from '../schemas/scenario.schema.json';
import { EXAMPLE } from '../src/game/data';
import { simulate, moveIssues } from '../src/game/engine';
import {
  localSupport,
  legalCandidates,
  scenarioDocument,
  type SupportRequest,
} from '../src/game/decisionSupport';
import { acceptAdvice } from '../src/game/adviceContract';
import { checkSupportRequest, jevPayload, provideDecisionSupport } from '../server/decisionSupport';
const request: SupportRequest = { decisions: [], lang: 'en', goal: 'balanced', question: '' };
function jevAnswer(body: any, chosen?: string) {
  const ids = Object.keys(body.questions.recommended_action.criteria);
  const id = chosen ?? ids.at(-1)!;
  return {
    model: 'jev-1.13.0',
    answers: {
      recommended_action: {
        type: 'choice',
        choice: id,
        confidence: 0.43,
        probabilities: Object.fromEntries(ids.map((i) => [i, i === id ? 1 : 0])),
      },
      needs_clarification: { type: 'noul', noul: 0.8 },
    },
  };
}
const json = (v: unknown) => new Response(JSON.stringify(v), { status: 200 });
test('schema and business rules reject malformed, illegal, excessive and dead-end requests', () => {
  assert.equal(checkSupportRequest(request), true);
  for (const bad of [
    { ...request, goal: 'invent' },
    { ...request, question: 'x'.repeat(801) },
    { ...request, decisions: [{ measureId: 'M7' }] },
    { ...request, decisions: [{ measureId: 'M12', districtId: 'nura' }] },
    { ...request, extra: true },
    {
      ...request,
      decisions: [
        { measureId: 'M1', districtId: 'nura' },
        { measureId: 'M3', districtId: 'esil' },
      ],
    },
    { ...request, draft: { measureId: 'M999' } },
    {
      ...request,
      decisions: [
        { measureId: 'M3', districtId: 'nura' },
        { measureId: 'M13', districtId: 'esil' },
        { measureId: 'M5', districtId: 'saryarka' },
      ],
    },
  ])
    assert.equal(checkSupportRequest(bad), false);
});
test('all recommendations are finishable and schema-valid; local mode never calls a provider', async () => {
  const result = await provideDecisionSupport(request, {
    fetcher: (async () => {
      throw new Error('must not fetch');
    }) as typeof fetch,
  });
  assert.equal(result.mode, 'local');
  assert.equal(result.reviewRequired, true);
  assert.equal(result.confidence, null);
  for (const c of legalCandidates([], 'en')) {
    assert.deepEqual(moveIssues([], c.decision), []);
    assert.equal(c.score, simulate([c.decision]).score);
  }
  assert.deepEqual(acceptAdvice(result, request), result);
  assert.equal(
    (await provideDecisionSupport({ ...request, decisions: [...EXAMPLE] }, {})).recommendation,
    null,
  );
});
test('Jev selects only an engine candidate; low confidence and ambiguity remain visible', async () => {
  let sent: any;
  const result = await provideDecisionSupport(request, {
    typesafeKey: 'test-only',
    fetcher: (async (url, init) => {
      assert.equal(url, 'https://api.typesafe.ai/v1/systemone');
      sent = JSON.parse(init!.body as string);
      return json(jevAnswer(sent));
    }) as typeof fetch,
  });
  assert.equal(result.mode, 'jev');
  assert.equal(result.confidence, 0.43);
  assert.equal(result.needsClarification, true);
  assert.equal(result.reviewRequired, true);
  assert.equal(sent.model, 'jev-1.13.0');
  assert.equal(sent.questions.recommended_action.type, 'choice');
  assert.equal(sent.questions.needs_clarification.type, 'noul');
  assert.equal(result.recommendation!.id, legalCandidates([], 'en').at(-1)!.id);
  assert.equal(result.recommendation!.score, simulate([result.recommendation!.decision]).score);
  assert.match(result.narration.summary, /Jev suggests/);
});
test('unknown, inconsistent and malformed Jev results fall back without corrupting scores', async () => {
  for (const mutate of [
    (d: any) => {
      d.answers.recommended_action.choice = 'M999:nura';
    },
    (d: any) => {
      d.answers.recommended_action.probabilities = {};
    },
    (d: any) => {
      d.answers.recommended_action.confidence = 2;
    },
    (d: any) => {
      d.answers.recommended_action.probabilities[
        Object.keys(d.answers.recommended_action.probabilities)[0]
      ] = 2;
    },
    (d: any) => {
      delete d.answers.needs_clarification;
    },
  ]) {
    const result = await provideDecisionSupport(request, {
      typesafeKey: 'test-only',
      fetcher: (async (_url, init) => {
        const d = jevAnswer(JSON.parse(init!.body as string));
        mutate(d);
        return json(d);
      }) as typeof fetch,
    });
    assert.equal(result.mode, 'local');
    assert.equal(result.notice, 'jev_unavailable');
    assert.deepEqual(result.recommendation, localSupport(request).recommendation);
  }
});
test('hybrid API keeps Jev choice, sends calculated draft to LLM, validates narration schema', async () => {
  const draft = { measureId: 'M7', districtId: 'nura' as const };
  let llm: any;
  const narration = {
    summary: 'Consider the verified changes.',
    strengths: ['Education improves.'],
    tradeoffs: ['Benefits take time.'],
    nextStep: 'Inspect the preview.',
  };
  const result = await provideDecisionSupport(
    { ...request, draft },
    {
      typesafeKey: 'test-only',
      openaiKey: 'test-only',
      fetcher: (async (url, init) => {
        const body = JSON.parse(init!.body as string);
        if (String(url).includes('typesafe')) return json(jevAnswer(body));
        llm = body;
        return json({
          output: [
            {
              type: 'message',
              content: [{ type: 'output_text', text: JSON.stringify(narration) }],
            },
          ],
        });
      }) as typeof fetch,
    },
  );
  assert.equal(result.mode, 'hybrid');
  assert.deepEqual(result.narration, narration);
  assert.equal(result.recommendation!.id, legalCandidates([], 'en').at(-1)!.id);
  assert.equal(llm.store, false);
  assert.equal(llm.text.format.strict, true);
  assert.equal(JSON.parse(llm.input).draft.result.score, simulate([draft]).score);
  const invalid = await provideDecisionSupport(request, {
    openaiKey: 'test-only',
    fetcher: (async () =>
      json({
        output: [
          { type: 'message', content: [{ type: 'output_text', text: '{"summary":"Incomplete"}' }] },
        ],
      })) as typeof fetch,
  });
  assert.equal(invalid.mode, 'local');
  assert.equal(invalid.notice, 'llm_unavailable');
});
test('client rejects illegal alternatives and provenance, recomputes altered candidate numbers', () => {
  const local = localSupport(request),
    tampered = structuredClone(local);
  tampered.recommendation!.gain = 999;
  tampered.recommendation!.cost = 0;
  assert.deepEqual(acceptAdvice(tampered, request).recommendation, local.recommendation);
  tampered.alternatives[0].decision = { measureId: 'M999' };
  assert.throws(() => acceptAdvice(tampered, request));
  assert.throws(() => acceptAdvice({ ...local, reviewRequired: false }, request));
  assert.throws(() => acceptAdvice({ ...local, mode: 'hybrid' }, request));
  assert.throws(() => acceptAdvice({ ...local, alternatives: [local.recommendation] }, request));
});
test('export contract validates and every journal transition can be independently replayed', () => {
  const doc = scenarioDocument(EXAMPLE),
    valid = new Ajv().compile(scenarioSchema);
  assert.equal(valid(doc), true, JSON.stringify(valid.errors));
  assert.equal(doc.events.length, 5);
  doc.events.forEach((e, i) => {
    assert.equal(e.before.score, simulate(EXAMPLE.slice(0, i)).score);
    assert.equal(e.after.score, simulate(EXAMPLE.slice(0, i + 1)).score);
  });
  assert.equal(valid({ ...doc, synthetic: false }), false);
  assert.equal(
    jevPayload(request, legalCandidates([], 'en')).questions.recommended_action.type,
    'choice',
  );
});
