import { DISTRICTS, MEASURES, CATEGORIES, type Lang, type DistrictId, type Category } from './data';
import { simulate, moveIssues, validate, BASELINE, type Decision } from './engine';
export type Goal = 'balanced' | 'equity' | 'transport' | 'ecology' | 'quick';
export interface SupportRequest {
  decisions: Decision[];
  lang: Lang;
  goal: Goal;
  question: string;
  draft?: Decision;
}
export interface Candidate {
  id: string;
  decision: Decision;
  name: string;
  district: string;
  category: Category;
  cost: number;
  lag: number;
  score: number;
  gain: number;
  criticalRemoved: number;
  weakestGain: number;
  categoryGain: number;
  metricDeltas: {
    districtId: DistrictId;
    indicator: string;
    before: number;
    after: number;
    delta: number;
  }[];
}
export interface Narration {
  summary: string;
  strengths: string[];
  tradeoffs: string[];
  nextStep: string;
}
export interface SupportResponse {
  schemaVersion: 'qala.advice/v1';
  mode: 'local' | 'jev' | 'llm' | 'hybrid';
  recommendation: Candidate | null;
  alternatives: Candidate[];
  confidence: number | null;
  needsClarification: boolean;
  reviewRequired: boolean;
  narration: Narration;
  models: { selection: string | null; explanation: string | null };
  notice: string | null;
}
export const GOALS: Record<Goal, { ru: string; en: string; kk: string }> = {
  balanced: { ru: 'Качество жизни', en: 'Quality of life', kk: 'Өмір сапасы' },
  equity: {
    ru: 'Поддержать слабые районы',
    en: 'Support weakest districts',
    kk: 'Әлсіз аудандарды қолдау',
  },
  transport: { ru: 'Улучшить транспорт', en: 'Better mobility', kk: 'Көлікті жақсарту' },
  ecology: { ru: 'Чистый и зелёный город', en: 'Cleaner, greener city', kk: 'Таза әрі жасыл қала' },
  quick: { ru: 'Быстрый результат', en: 'Earlier benefits', kk: 'Жылдам нәтиже' },
};
export function candidateFor(
  decisions: readonly Decision[],
  decision: Decision,
  lang: Lang,
  goal: Goal = 'balanced',
): Candidate {
  const before = simulate(decisions),
    after = simulate([...decisions, decision]),
    m = MEASURES.find((m) => m.id === decision.measureId)!;
  const metricDeltas = DISTRICTS.flatMap((d) =>
    Object.keys(before.metrics[d.id])
      .map((k) => {
        const indicator = k as keyof (typeof before.metrics)[typeof d.id];
        return {
          districtId: d.id,
          indicator,
          before: before.metrics[d.id][indicator],
          after: after.metrics[d.id][indicator],
          delta: after.metrics[d.id][indicator] - before.metrics[d.id][indicator],
        };
      })
      .filter((d) => Math.abs(d.delta) > 0.0001),
  );
  const category = goal === 'transport' ? 'transport' : goal === 'ecology' ? 'ecology' : m.category;
  const categoryGain = DISTRICTS.reduce(
    (sum, d) =>
      sum +
      d.pop *
        CATEGORIES[category].keys.reduce(
          (n, k) => n + after.metrics[d.id][k] - before.metrics[d.id][k],
          0,
        ),
    0,
  );
  return {
    id: `${m.id}:${decision.districtId ?? 'city'}`,
    decision,
    name: m.name[lang],
    district: decision.districtId
      ? DISTRICTS.find((d) => d.id === decision.districtId)!.name[lang]
      : { ru: 'Весь город', en: 'Citywide', kk: 'Бүкіл қала' }[lang],
    category: m.category,
    cost: m.cost,
    lag: m.lag,
    score: after.score,
    gain: after.score - before.score,
    criticalRemoved: before.critical.length - after.critical.length,
    weakestGain:
      Math.min(...Object.values(after.districtScores)) -
      Math.min(...Object.values(before.districtScores)),
    categoryGain,
    metricDeltas,
  };
}
export function legalCandidates(
  decisions: readonly Decision[],
  lang: Lang,
  goal: Goal = 'balanced',
) {
  if (validate(decisions, false).length || decisions.length >= 5) return [];
  const options = MEASURES.flatMap((m) =>
    m.scope === 'city'
      ? [{ measureId: m.id }]
      : DISTRICTS.map((d) => ({ measureId: m.id, districtId: d.id })),
  );
  const rank = (c: Candidate) =>
    goal === 'equity'
      ? c.weakestGain + c.criticalRemoved
      : goal === 'transport' || goal === 'ecology'
        ? c.categoryGain
        : goal === 'quick'
          ? c.gain / (1 + c.lag)
          : c.gain;
  return options
    .filter((d) => !moveIssues(decisions, d).length)
    .map((d) => candidateFor(decisions, d, lang, goal))
    .sort((a, b) => rank(b) - rank(a) || b.gain - a.gain || a.id.localeCompare(b.id));
}
export function localSupport(request: SupportRequest): SupportResponse {
  const options = legalCandidates(request.decisions, request.lang, request.goal),
    choice = options[0] ?? null,
    t = (ru: string, en: string, kk: string) => ({ ru, en, kk })[request.lang];
  return {
    schemaVersion: 'qala.advice/v1',
    mode: 'local',
    recommendation: choice,
    alternatives: options.slice(1, 4),
    confidence: null,
    needsClarification: false,
    reviewRequired: true,
    models: { selection: null, explanation: null },
    notice: null,
    narration: {
      summary: choice
        ? t(
            `По выбранному приоритету стоит рассмотреть «${choice.name}» (${choice.district}).`,
            `For your selected priority, consider ${choice.name} (${choice.district}).`,
            `Таңдалған басымдық үшін «${choice.name}» шарасын қарастырыңыз (${choice.district}).`,
          )
        : t(
            'Пять решений приняты. Сравните итог с исходным состоянием.',
            'Five decisions adopted. Compare your result with the baseline.',
            'Бес шешім қабылданды. Нәтижені бастапқы күймен салыстырыңыз.',
          ),
      strengths: [
        t(
          'Рекомендация опирается на рассчитанные изменения и сохраняет возможность завершить пять решений.',
          'This recommendation uses calculated changes and preserves a feasible five-decision plan.',
          'Кеңес есептелген өзгерістерге негізделген және бес шешімді аяқтауға мүмкіндік береді.',
        ),
      ],
      tradeoffs: [
        t(
          'Это локальный подбор по выбранному приоритету, не доказанный оптимум. Все данные учебные.',
          'This is a local ranking for your selected priority, not a proven optimum. All indicators are synthetic.',
          'Бұл таңдалған басымдық бойынша жергілікті рейтинг, дәлелденген оңтайлы шешім емес. Деректер синтетикалық.',
        ),
      ],
      nextStep: t(
        'Откройте прогноз и проверьте стоимость, задержку и влияние на каждый район.',
        'Open the preview to inspect cost, delay and each district’s changes.',
        'Болжамды ашып, бағаны, кідірісті және әр ауданға әсерін тексеріңіз.',
      ),
    },
  };
}
export function decisionEvents(decisions: readonly Decision[]) {
  return decisions.map((decision, index) => {
    const before = simulate(decisions.slice(0, index)),
      after = simulate(decisions.slice(0, index + 1));
    return {
      type: 'policy.adopted' as const,
      sequence: index + 1,
      decision,
      before: { score: before.score, cost: before.cost, critical: before.critical.length },
      after: { score: after.score, cost: after.cost, critical: after.critical.length },
    };
  });
}
export function scenarioDocument(decisions: readonly Decision[]) {
  return {
    $schema: 'https://qala.local/schemas/scenario',
    schemaVersion: 'qala.scenario/v2',
    modelVersion: 'hackalem-2026-synthetic',
    synthetic: true,
    decisions,
    events: decisionEvents(decisions),
    baseline: BASELINE,
    result: simulate(decisions),
  };
}
