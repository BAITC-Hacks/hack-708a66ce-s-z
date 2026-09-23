import {
  CATEGORIES,
  DISTRICTS,
  KEYS,
  MEASURES,
  SYNERGIES,
  WEIGHTS,
  type Category,
  type DistrictId,
  type Indicator,
  type Lang,
  type Measure,
  type Metrics,
} from './data';
import { clip, type Decision, type IssueCode, type Result } from './engine';

export interface SandboxRules {
  budget: number;
  decisionCount: number;
}
export interface CustomMeasure {
  id: string;
  name: string;
  description: string;
  category: Category;
  scope: 'district' | 'city';
  cost: number;
  lag: number;
  effects: Partial<Metrics>;
}
export interface SandboxState {
  version: 1;
  rules: SandboxRules;
  customMeasures: CustomMeasure[];
  decisions: Decision[];
}
export type SandboxIssue = { code: IssueCode | 'rules' | 'custom'; detail?: string };
export const SANDBOX_KEY = 'qala-lab-v1';
export const DEFAULT_SANDBOX_RULES: SandboxRules = { budget: 100, decisionCount: 5 };
const categories = Object.keys(CATEGORIES);
const integer = (value: unknown, low: number, high: number) =>
  typeof value === 'number' && Number.isInteger(value) && value >= low && value <= high;
export function validSandboxRules(value: unknown): value is SandboxRules {
  if (!value || typeof value !== 'object') return false;
  const r = value as SandboxRules;
  return integer(r.budget, 1, 1000) && integer(r.decisionCount, 1, 10);
}
export function validCustomMeasure(value: unknown): value is CustomMeasure {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const m = value as CustomMeasure;
  if (
    typeof m.id !== 'string' ||
    !/^C-[a-zA-Z0-9-]{1,64}$/.test(m.id) ||
    typeof m.name !== 'string' ||
    !m.name.trim() ||
    m.name.length > 100 ||
    typeof m.description !== 'string' ||
    !m.description.trim() ||
    m.description.length > 500 ||
    !categories.includes(m.category) ||
    !['district', 'city'].includes(m.scope) ||
    !integer(m.cost, 1, 1000) ||
    !integer(m.lag, 0, 7) ||
    !m.effects ||
    typeof m.effects !== 'object' ||
    Array.isArray(m.effects)
  )
    return false;
  const effects = Object.entries(m.effects);
  return (
    effects.length > 0 &&
    effects.length <= 10 &&
    effects.some(([, v]) => v !== 0) &&
    effects.every(
      ([key, value]) =>
        KEYS.includes(key as Indicator) &&
        typeof value === 'number' &&
        Number.isFinite(value) &&
        value >= -100 &&
        value <= 100,
    )
  );
}
export function sandboxCatalog(state: Pick<SandboxState, 'customMeasures'>): Measure[] {
  return [
    ...MEASURES,
    ...state.customMeasures.map((m) => ({
      ...m,
      name: { ru: m.name, en: m.name, kk: m.name },
      description: { ru: m.description, en: m.description, kk: m.description },
    })),
  ];
}
export function sandboxIssues(state: unknown, complete = false): SandboxIssue[] {
  if (!state || typeof state !== 'object') return [{ code: 'rules' }];
  const s = state as SandboxState;
  if (s.version !== 1 || !validSandboxRules(s.rules)) return [{ code: 'rules' }];
  if (
    !Array.isArray(s.customMeasures) ||
    s.customMeasures.length > 30 ||
    s.customMeasures.some((m) => !validCustomMeasure(m)) ||
    new Set(s.customMeasures.map((m) => m.id)).size !== s.customMeasures.length
  )
    return [{ code: 'custom' }];
  if (!Array.isArray(s.decisions) || s.decisions.length > 10)
    return [{ code: 'count' }, { code: 'unknown' }];
  const issues: SandboxIssue[] = [],
    seen = new Set<string>(),
    counts: Record<string, number> = {};
  let cost = 0;
  if (
    complete
      ? s.decisions.length !== s.rules.decisionCount
      : s.decisions.length > s.rules.decisionCount
  )
    issues.push({ code: 'count' });
  const catalog = sandboxCatalog(s);
  for (const decision of s.decisions) {
    if (!decision || typeof decision !== 'object' || typeof decision.measureId !== 'string') {
      issues.push({ code: 'unknown' });
      continue;
    }
    const m = catalog.find((entry) => entry.id === decision.measureId);
    if (!m) {
      issues.push({ code: 'unknown' });
      continue;
    }
    if (seen.has(m.id)) issues.push({ code: 'duplicate', detail: m.id });
    seen.add(m.id);
    cost += m.cost;
    counts[m.category] = (counts[m.category] ?? 0) + 1;
    if (
      m.scope === 'district'
        ? !DISTRICTS.some((d) => d.id === decision.districtId)
        : decision.districtId !== undefined
    )
      issues.push({ code: 'target', detail: m.id });
  }
  if (cost > s.rules.budget) issues.push({ code: 'budget' });
  for (const cat of categories) if (counts[cat] > 2) issues.push({ code: 'category', detail: cat });
  if (seen.has('M1') && seen.has('M3')) issues.push({ code: 'transport-conflict' });
  for (const [a, b, code] of [
    ['M4', 'M7', 'land-conflict'],
    ['M5', 'M13', 'utility-conflict'],
  ] as const) {
    const first = s.decisions.find((d) => d?.measureId === a),
      second = s.decisions.find((d) => d?.measureId === b);
    if (first && second && first.districtId === second.districtId) issues.push({ code });
  }
  return issues;
}

/** Same published arithmetic; a rule-invalid plan may still have an explicitly labelled forecast. */
export function sandboxEvaluate(
  state: unknown,
  complete = false,
): { issues: SandboxIssue[]; result: Result | null; valid: boolean; final: boolean } {
  const issues = sandboxIssues(state, complete);
  if (
    issues.some((issue) =>
      ['rules', 'custom', 'unknown', 'target', 'duplicate'].includes(issue.code),
    )
  )
    return { issues, result: null, valid: false, final: false };
  const s = state as SandboxState,
    catalog = sandboxCatalog(s);
  const metrics = Object.fromEntries(DISTRICTS.map((d) => [d.id, { ...d.metrics }])) as Record<
    DistrictId,
    Metrics
  >;
  let cost = 0;
  for (const decision of [...s.decisions].sort((a, b) => a.measureId.localeCompare(b.measureId))) {
    const m = catalog.find((entry) => entry.id === decision.measureId)!;
    cost += m.cost;
    for (const district of m.scope === 'city' ? DISTRICTS.map((d) => d.id) : [decision.districtId!])
      for (const [key, value] of Object.entries(m.effects))
        metrics[district][key as Indicator] += (value * (8 - m.lag)) / 8;
  }
  const synergies = SYNERGIES.filter((synergy) =>
    synergy.pair.every((id) => s.decisions.some((decision) => decision.measureId === id)),
  );
  for (const synergy of synergies) {
    const district = s.decisions.find(
      (decision) => decision.measureId === synergy.pair[0],
    )!.districtId!;
    metrics[district][synergy.indicator] += synergy.bonus;
  }
  const districtScores = {} as Record<DistrictId, number>,
    critical: Result['critical'] = [];
  let average = 0;
  for (const district of DISTRICTS) {
    let score = 0;
    for (const key of KEYS) {
      metrics[district.id][key] = clip(metrics[district.id][key]);
      score += metrics[district.id][key] * WEIGHTS[key];
      if (metrics[district.id][key] < 40)
        critical.push({
          districtId: district.id,
          indicator: key,
          value: metrics[district.id][key],
        });
    }
    districtScores[district.id] = score;
    average += district.pop * score;
  }
  const weakest = DISTRICTS.reduce((a, b) =>
    districtScores[a.id] <= districtScores[b.id] ? a : b,
  ).id;
  return {
    issues,
    result: {
      metrics,
      districtScores,
      average,
      weakest,
      critical,
      score: 0.7 * average + 0.3 * districtScores[weakest] - critical.length,
      cost,
      synergies,
    },
    valid: issues.length === 0,
    final: issues.length === 0 && s.decisions.length === s.rules.decisionCount,
  };
}
export function newSandbox(initial: readonly Decision[] = []): SandboxState {
  const state: SandboxState = {
    version: 1,
    rules: { ...DEFAULT_SANDBOX_RULES },
    customMeasures: [],
    decisions: initial.map((d) => ({ ...d })),
  };
  return sandboxIssues(state).length ? { ...state, decisions: [] } : state;
}
/** Storage is untrusted. Keep valid structures even if the user lowered budget/count below their plan. */
export function parseSandbox(raw: string | null): SandboxState | null {
  if (!raw || raw.length > 100000) return null;
  try {
    const value = JSON.parse(raw) as SandboxState;
    if (sandboxIssues(value).some((issue) => !['budget', 'count'].includes(issue.code)))
      return null;
    return {
      version: 1,
      rules: { budget: value.rules.budget, decisionCount: value.rules.decisionCount },
      customMeasures: value.customMeasures.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        category: m.category,
        scope: m.scope,
        cost: m.cost,
        lag: m.lag,
        effects: Object.fromEntries(Object.entries(m.effects)),
      })),
      decisions: value.decisions.map((d) => ({
        measureId: d.measureId,
        ...(d.districtId ? { districtId: d.districtId } : {}),
      })),
    };
  } catch {
    return null;
  }
}
export function sandboxDocument(state: SandboxState) {
  const evaluation = sandboxEvaluate(state, true);
  return {
    format: 'qala-sandbox-v1',
    mode: 'sandbox',
    officialSubmission: false,
    dataSource: 'HackAlem synthetic districts plus user-defined hypothetical measures',
    horizonQuarters: 8,
    rules: state.rules,
    customMeasures: state.customMeasures,
    decisions: state.decisions,
    status: evaluation.final ? 'complete-custom-scenario' : 'invalid-or-incomplete-custom-scenario',
    issues: evaluation.issues,
    result: evaluation.result,
  };
}
export function sandboxIssueText(issue: SandboxIssue, rules: SandboxRules, lang: Lang) {
  const texts: Record<SandboxIssue['code'], Record<Lang, string>> = {
    rules: {
      en: 'Use a budget of 1–1000 and 1–10 decisions.',
      ru: 'Бюджет: 1–1000, решений: 1–10.',
      kk: 'Бюджет: 1–1000, шешім: 1–10.',
    },
    custom: {
      en: 'Check the custom policy fields and the 30-policy limit.',
      ru: 'Проверьте поля своих мер и лимит 30 мер.',
      kk: 'Жеке шара өрістерін және 30 шара шегін тексеріңіз.',
    },
    count: {
      en: `The plan needs exactly ${rules.decisionCount} decisions.`,
      ru: `Нужно ровно ${rules.decisionCount} решений.`,
      kk: `Дәл ${rules.decisionCount} шешім қажет.`,
    },
    budget: {
      en: 'The plan exceeds your budget. Raise the limit or remove a policy.',
      ru: 'Бюджет превышен. Увеличьте лимит или уберите меру.',
      kk: 'Бюджет шегінен асты. Шекті өсіріңіз не шараны алып тастаңыз.',
    },
    duplicate: {
      en: 'Each policy can be chosen once.',
      ru: 'Каждую меру можно выбрать один раз.',
      kk: 'Әр шара бір рет таңдалады.',
    },
    unknown: {
      en: 'An unknown policy cannot be simulated.',
      ru: 'Неизвестная мера не рассчитывается.',
      kk: 'Белгісіз шара есептелмейді.',
    },
    target: {
      en: 'Choose a valid district for this policy.',
      ru: 'Выберите район для этой меры.',
      kk: 'Осы шараға аудан таңдаңыз.',
    },
    category: {
      en: 'At most two policies per category, including custom policies.',
      ru: 'Не больше двух мер на направление, включая свои.',
      kk: 'Жеке шараларды қосқанда әр бағытта ең көбі екі шара.',
    },
    'transport-conflict': {
      en: 'Bus lanes and LRT cannot be combined.',
      ru: 'Автобусные полосы и ЛРТ несовместимы.',
      kk: 'Автобус жолағы мен LRT бірге таңдалмайды.',
    },
    'land-conflict': {
      en: 'School and park need different districts.',
      ru: 'Школе и парку нужны разные районы.',
      kk: 'Мектеп пен саябақ әртүрлі ауданда болуы керек.',
    },
    'utility-conflict': {
      en: 'Clean heating and utility renewal overlap in this district.',
      ru: 'Чистое отопление и обновление сетей пересекаются в одном районе.',
      kk: 'Таза жылыту мен желі жаңарту бір ауданда қайталанады.',
    },
    'dead-end': {
      en: 'Choose another policy or adjust the custom limits.',
      ru: 'Выберите другую меру или измените лимиты.',
      kk: 'Басқа шараны таңдаңыз немесе шектерді өзгертіңіз.',
    },
  };
  return texts[issue.code][lang];
}
