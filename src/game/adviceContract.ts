import Ajv from 'ajv';
import responseSchema from '../../schemas/advisor-response.schema.json';
import {
  legalCandidates,
  type SupportRequest,
  type SupportResponse,
  type Candidate,
} from './decisionSupport';
const validate = new Ajv({ allErrors: true }).compile<SupportResponse>(responseSchema);
/** Provider wording is untrusted text. All selectable actions and displayed numbers are rebuilt locally. */
export function acceptAdvice(input: unknown, request: SupportRequest): SupportResponse {
  if (!validate(input)) throw new Error('Invalid advice schema');
  const legal = new Map(
    legalCandidates(request.decisions, request.lang, request.goal).map((c) => [c.id, c]),
  );
  const trusted = (candidate: Candidate) => {
    const value = legal.get(candidate.id);
    if (
      !value ||
      candidate.decision.measureId !== value.decision.measureId ||
      candidate.decision.districtId !== value.decision.districtId
    )
      throw new Error('Illegal advice candidate');
    return value;
  };
  if (Boolean(input.recommendation) !== Boolean(legal.size))
    throw new Error('Missing advice candidate');
  if (
    new Set(input.alternatives.map((c) => c.id)).size !== input.alternatives.length ||
    input.alternatives.some((c) => c.id === input.recommendation?.id)
  )
    throw new Error('Duplicate advice candidates');
  const selectedByJev = input.mode === 'jev' || input.mode === 'hybrid';
  if (
    selectedByJev
      ? input.confidence === null || !input.models.selection
      : input.confidence !== null || input.models.selection !== null
  )
    throw new Error('Inconsistent selection provenance');
  const explainedByLLM = input.mode === 'llm' || input.mode === 'hybrid';
  if (explainedByLLM ? !input.models.explanation : input.models.explanation !== null)
    throw new Error('Inconsistent explanation provenance');
  return {
    ...input,
    recommendation: input.recommendation ? trusted(input.recommendation) : null,
    alternatives: input.alternatives.map(trusted),
  };
}
