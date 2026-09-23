import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  Check,
  X,
  Coins,
  Sparkles,
  BookOpen,
  History,
  ChartNoAxesCombined,
  HelpCircle,
  RotateCcw,
  Undo2,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Pause,
  Play,
  MapPin,
  Users,
  Clock3,
  ShieldCheck,
  Bus,
  Leaf,
  HeartPulse,
  Waves,
  ChevronRight,
  ChevronDown,
  Medal,
  Download,
  Layers,
  Flag,
  Search,
  Settings2,
  Pencil,
  FlaskConical,
} from 'lucide-react';
import {
  DISTRICTS,
  MEASURES,
  CATEGORIES,
  INDICATORS,
  KEYS,
  SYNERGIES,
  type Lang,
  type DistrictId,
  type Measure,
  type Category,
} from '../game/data';
import {
  BASELINE,
  simulate,
  moveIssues,
  type Decision,
  type Result,
  type IssueCode,
} from '../game/engine';
import {
  candidateFor,
  localSupport,
  GOALS,
  decisionEvents,
  scenarioDocument,
  type Goal,
  type SupportResponse,
} from '../game/decisionSupport';
import { acceptAdvice } from '../game/adviceContract';
import { districtNeeds, milestones, policyHand } from '../game/experience';
import { HANDBOOK } from '../game/handbook';
import { IsoCity } from './IsoCity';
import { MayorOnboarding, useMayorOnboarding } from './MayorOnboarding';
import art from '../assets/astana-key-art.png';
import advisorArt from '../assets/advisor-aida.png';
import { IsoCityPolicyArt } from './IsoCityPolicyArt';
import { AdvisorConnection } from './AdvisorConnection';
import { DistrictStatistics } from './CityAnalytics';
import { PlanSearch } from './PlanSearch';
const ICONS = {
  transport: Bus,
  ecology: Leaf,
  social: HeartPulse,
  safety: ShieldCheck,
  services: Waves,
};
const signed = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`;
function cityPreference(key: 'night' | 'paused'): boolean {
  try {
    return sessionStorage.getItem(`qala-city-${key}`) === 'true';
  } catch {
    return false;
  }
}
interface Props {
  selected: DistrictId;
  onSelect: (id: DistrictId) => void;
  result: Result;
  decisions: Decision[];
  lang: Lang;
  onLang: (l: Lang) => void;
  onApply: (d: Decision) => void;
  onUndo: () => void;
  onReport: () => void;
  onSandbox: () => void;
  onArchive: () => void;
  onHelp: () => void;
  onReset: () => void;
  storageWarning: boolean;
}
type Layer = 'desk' | 'catalog' | 'district' | 'advisor' | 'journal' | 'book' | null;
type Phase = 'arrival' | 'briefing' | 'play' | 'response' | 'finale';
export function MayorExperience(p: Props) {
  const { selected, decisions, result, lang } = p,
    t = (ru: string, en: string, kk: string) => ({ ru, en, kk })[lang];
  const [phase, setPhase] = useState<Phase>(() => {
    try {
      return decisions.length || localStorage.getItem('qala-experience-v3') === 'done'
        ? 'play'
        : 'arrival';
    } catch {
      return 'arrival';
    }
  });
  const guide = useMayorOnboarding(decisions.length);
  const [layer, setLayer] = useState<Layer>(null),
    [draft, setDraft] = useState<Measure | null>(null),
    [beforeView, setBeforeView] = useState(false),
    [category, setCategory] = useState<Category | 'all'>('all'),
    [tip, setTip] = useState(0),
    [night, setNight] = useState(() => cityPreference('night')),
    [paused, setPaused] = useState(() => cityPreference('paused')),
    [sound, setSound] = useState(false),
    [focus, setFocus] = useState(0),
    [goal, setGoal] = useState<Goal>('balanced'),
    [question, setQuestion] = useState(''),
    [busy, setBusy] = useState(false),
    [advice, setAdvice] = useState<SupportResponse | null>(null),
    [receipt, setReceipt] = useState<{
      measure: Measure;
      decision: Decision;
      before: Result;
      after: Result;
    } | null>(null);
  const flowRef = useRef<HTMLDialogElement>(null),
    panelRef = useRef<HTMLDialogElement>(null),
    reviewRef = useRef<HTMLDialogElement>(null),
    request = useRef<AbortController | null>(null),
    audio = useRef<AudioContext | null>(null),
    lastCount = useRef(decisions.length);
  const district = DISTRICTS.find((d) => d.id === selected)!;
  const proposal: Decision | null = draft
    ? { measureId: draft.id, ...(draft.scope === 'district' ? { districtId: selected } : {}) }
    : null;
  const issues = proposal ? moveIssues(decisions, proposal) : [];
  const preview = useMemo(
    () => (proposal && !issues.length ? simulate([...decisions, proposal]) : null),
    [decisions, draft, selected],
  );
  const change = useMemo(
    () => (proposal && preview ? candidateFor(decisions, proposal, lang, goal) : null),
    [decisions, draft, selected, lang, goal],
  );
  const shown = beforeView ? BASELINE : (preview ?? result);
  const needs = districtNeeds(result, selected);
  const candidates = useMemo(
    () => policyHand(decisions, selected, lang),
    [decisions, selected, lang],
  );
  const local = useMemo(
    () => localSupport({ decisions, lang, goal, question: '' }),
    [decisions, lang, goal],
  );
  const answer = advice ?? local;
  const citySuggestion =
    answer.recommendation && !moveIssues(decisions, answer.recommendation.decision).length
      ? answer.recommendation
      : local.recommendation;
  const cityAdviceMode = citySuggestion === answer.recommendation ? answer.mode : 'local';
  const cityAdviceSource =
    cityAdviceMode === 'local'
      ? t('Локальный расчёт', 'Local calculation', 'Жергілікті есеп')
      : cityAdviceMode === 'hybrid'
        ? 'Jev + AI'
        : cityAdviceMode === 'jev'
          ? 'Jev'
          : 'AI';
  const achieved = milestones(result);
  const featuredDeltas = change
    ? change.metricDeltas.filter((d) => d.after < d.before || d.districtId === selected).slice(0, 3)
    : [];
  const metricRows = (rows: NonNullable<typeof change>['metricDeltas']) =>
    rows.map((d) => (
      <div key={d.districtId + d.indicator}>
        <span>
          <b>{INDICATORS[d.indicator as keyof typeof INDICATORS][lang]}</b>
          <small>{DISTRICTS.find((x) => x.id === d.districtId)!.name[lang]}</small>
        </span>
        <span>
          {d.before.toFixed(1)}
          <ArrowRight size={12} />
          <strong className={d.after < d.before ? 'negative' : ''}>{d.after.toFixed(1)}</strong>
        </span>
      </div>
    ));
  const flowOpen = phase !== 'play';
  useEffect(() => {
    try {
      sessionStorage.setItem('qala-city-night', String(night));
      sessionStorage.setItem('qala-city-paused', String(paused));
    } catch {}
  }, [night, paused]);
  useEffect(() => {
    const d = flowRef.current;
    if (flowOpen && !d?.open) d?.showModal();
    else if (!flowOpen && d?.open) d.close();
  }, [flowOpen, phase]);
  useEffect(() => {
    const d = panelRef.current;
    if (layer && !d?.open) d?.showModal();
    else if (!layer && d?.open) d.close();
  }, [layer]);
  useEffect(() => {
    const d = reviewRef.current;
    if (draft && !layer && !d?.open) d?.showModal();
    else if ((!draft || layer) && d?.open) d.close();
  }, [draft, layer]);
  useEffect(() => {
    request.current?.abort();
    setAdvice(null);
    setBusy(false);
  }, [decisions, selected, draft, goal, question, lang]);
  useEffect(
    () => () => {
      request.current?.abort();
      void audio.current?.close();
    },
    [],
  );
  useEffect(() => {
    if (decisions.length < lastCount.current) {
      setPhase('play');
      setDraft(null);
      setReceipt(null);
      setBeforeView(false);
    }
    lastCount.current = decisions.length;
  }, [decisions.length]);
  const enter = () => {
    setPhase('play');
    try {
      localStorage.setItem('qala-experience-v3', 'done');
    } catch {}
  };
  const select = (id: DistrictId) => {
    p.onSelect(id);
    setBeforeView(false);
    setFocus((v) => v + 1);
  };
  const openPolicy = (m: Measure, id?: DistrictId) => {
    if (id) p.onSelect(id);
    setLayer(null);
    setBeforeView(false);
    setDraft(m);
    setFocus((v) => v + 1);
  };
  const closeReview = () => {
    setDraft(null);
    setBeforeView(false);
  };
  const issueText = (code: IssueCode) =>
    (
      ({
        count: t(
          'Пять решений уже приняты.',
          'Five decisions have already been adopted.',
          'Бес шешім қабылданды.',
        ),
        budget: t(
          'На эту меру не хватает бюджета.',
          'There is not enough budget for this policy.',
          'Бұл шараға бюджет жеткіліксіз.',
        ),
        duplicate: t(
          'Эта мера уже есть в плане.',
          'This policy is already in your plan.',
          'Бұл шара жоспарда бар.',
        ),
        category: t(
          'Максимум две меры одного направления.',
          'At most two policies per category.',
          'Бір бағытта ең көбі екі шара.',
        ),
        target: t('Выберите район.', 'Choose a district.', 'Ауданды таңдаңыз.'),
        'transport-conflict': t(
          'Автобусные полосы и ЛРТ несовместимы.',
          'Bus lanes and light rail cannot both be selected.',
          'Автобус жолағы мен LRT бірге таңдалмайды.',
        ),
        'land-conflict': t(
          'Школа и парк претендуют на один участок. Выберите другой район.',
          'The school and park need the same site. Choose another district.',
          'Мектеп пен саябаққа бір жер қажет. Басқа аудан таңдаңыз.',
        ),
        'utility-conflict': t(
          'Эти меры дублируются в одном районе. Попробуйте другой.',
          'These utility programs overlap in this district. Try another.',
          'Бұл бағдарламалар бір ауданда қайталанады. Басқасын таңдаңыз.',
        ),
        'dead-end': t(
          'После этого выбора не получится завершить пять решений. Нужна более доступная мера.',
          'This leaves no legal way to finish five decisions. Try a more affordable policy.',
          'Бұдан кейін бес шешімді аяқтау мүмкін емес. Арзанырақ шара қажет.',
        ),
        unknown: t('Неизвестная мера.', 'Unknown policy.', 'Белгісіз шара.'),
      }) as Record<IssueCode, string>
    )[code];
  const chime = () => {
    if (!sound || !audio.current) return;
    const ctx = audio.current;
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const o = ctx.createOscillator(),
        g = ctx.createGain(),
        at = ctx.currentTime + i * 0.08;
      o.frequency.value = f;
      g.gain.setValueAtTime(0.025, at);
      g.gain.exponentialRampToValueAtTime(0.001, at + 0.45);
      o.connect(g).connect(ctx.destination);
      o.start(at);
      o.stop(at + 0.5);
    });
  };
  const apply = () => {
    if (!draft || !proposal || !preview || issues.length) return;
    setReceipt({ measure: draft, decision: proposal, before: result, after: preview });
    p.onApply(proposal);
    setDraft(null);
    setPhase('response');
    setBeforeView(false);
    chime();
  };
  const ask = async () => {
    const payload = {
      decisions,
      lang,
      goal,
      question,
      ...(proposal && !issues.length ? { draft: proposal } : {}),
    };
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    try {
      if (location.protocol === 'file:') throw Error('offline');
      const r = await fetch('/api/decision-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(45000)]),
      });
      if (!r.ok) throw Error('unavailable');
      const checked = acceptAdvice(await r.json(), payload);
      if (!controller.signal.aborted) setAdvice(checked);
    } catch {
      if (!controller.signal.aborted) setAdvice({ ...local, notice: 'unavailable' });
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(scenarioDocument(decisions), null, 2)], {
        type: 'application/json',
      }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'qala-scenario.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const openLayer = (next: Layer) => {
    setLayer(next);
    setBeforeView(false);
  };
  const card = (m: Measure, compact = false) => {
    const adopted = decisions.some((d) => d.measureId === m.id),
      Icon = ICONS[m.category],
      effect = Object.entries(m.effects).sort((a, b) => b[1] - a[1])[0];
    return (
      <button
        data-testid={`policy-${m.id}`}
        key={m.id}
        className={`civic-card ${m.category} ${compact ? 'compact' : ''}`}
        disabled={adopted || decisions.length === 5}
        onClick={() => openPolicy(m)}
        style={{ '--card-color': CATEGORIES[m.category].color } as CSSProperties}
      >
        <span className="card-heading">
          <span>
            <Icon size={15} />
            {CATEGORIES[m.category].name[lang]}
          </span>
          <b>
            <Coins size={14} />
            {m.cost}
          </b>
        </span>
        <IsoCityPolicyArt measure={m} />
        <span className="card-title">{m.name[lang]}</span>
        <span className="card-impact">
          {INDICATORS[effect[0] as keyof typeof INDICATORS][lang]}
          <b>+{((effect[1] * (8 - m.lag)) / 8).toFixed(1)}</b>
        </span>
        <span className="card-foot">
          <span>
            {adopted
              ? t('В плане', 'Adopted', 'Жоспарда')
              : m.scope === 'city'
                ? t('Весь город', 'Citywide', 'Бүкіл қала')
                : district.name[lang]}
          </span>
          {adopted ? <Check size={16} /> : <ArrowUpRight size={17} />}
        </span>
      </button>
    );
  };
  const languages = (
    <div className="term-languages" aria-label="Language">
      {(['ru', 'kk', 'en'] as Lang[]).map((l) => (
        <button key={l} className={l === lang ? 'active' : ''} onClick={() => p.onLang(l)}>
          {l === 'kk' ? 'ҚАЗ' : l.toUpperCase()}
        </button>
      ))}
    </div>
  );
  return (
    <div
      className={`mayor-experience ${night ? 'term-night' : ''}`}
      data-phase={phase}
      data-review={!!draft}
      data-guide-active={guide.active && decisions.length < 5}
    >
      <IsoCity
        selected={selected}
        onSelect={select}
        result={shown}
        decisions={beforeView ? [] : preview && proposal ? [...decisions, proposal] : decisions}
        lang={lang}
        night={night}
        paused={paused}
        focusRequest={focus}
        preview={Boolean(preview && proposal && !beforeView)}
      />
      <div className="term-shade" />
      <header className="term-header">
        <div className="term-brand" aria-label="QALA">
          QALA
          <span>
            {t('ВАШ ГОРОД. ВАШ ХОД.', 'YOUR CITY. YOUR MOVE.', 'СІЗДІҢ ҚАЛАҢЫЗ. СІЗДІҢ ҚАДАМЫҢЫЗ.')}
          </span>
        </div>
        <div className="term-resources">
          <div className="resource-budget">
            <Coins />
            <span>
              <small>{t('Бюджет', 'Budget', 'Бюджет')}</small>
              <b data-testid="budget">
                {100 - result.cost}
                <button
                  className="budget-lab-link"
                  data-testid="open-scenario-lab"
                  onClick={p.onSandbox}
                  aria-label={t(
                    'Открыть лабораторию сценариев',
                    'Open scenario laboratory',
                    'Сценарий зертханасын ашу',
                  )}
                  title={t(
                    'Изменить бюджет и правила в отдельном эксперименте',
                    'Change budget and rules in a separate experiment',
                    'Бюджет пен ережелерді бөлек тәжірибеде өзгерту',
                  )}
                >
                  <em>/100</em>
                  <Pencil size={11} />
                </button>
              </b>
            </span>
          </div>
          <div
            className="resource-turns"
            aria-label={t(
              `Принято решений: ${decisions.length} из 5`,
              `${decisions.length} of 5 decisions adopted`,
              `5 шешімнің ${decisions.length}-і қабылданды`,
            )}
          >
            <small>{t('Ваш срок', 'Your term', 'Сіздің мерзіміңіз')}</small>
            <span>
              {[0, 1, 2, 3, 4].map((i) => (
                <i
                  key={i}
                  className={
                    i < decisions.length ? 'done' : i === decisions.length ? 'current' : ''
                  }
                >
                  {i < decisions.length ? <Check size={13} /> : i + 1}
                </i>
              ))}
            </span>
          </div>
          <button
            className="resource-score"
            onClick={p.onReport}
            title={t('Полный разбор', 'Full report', 'Толық талдау')}
          >
            <small>{t('Качество жизни', 'Quality of life', 'Өмір сапасы')}</small>
            <b data-testid="score">
              {result.score.toFixed(2)}
              <em>{signed(result.score - BASELINE.score)}</em>
            </b>
          </button>
        </div>
        <button
          className="mayor-desk-button"
          onClick={() => openLayer('desk')}
          aria-label={t('Кабинет мэра', 'Mayor’s desk', 'Әкім кабинеті')}
        >
          <Settings2 size={18} />
          <span>{t('Кабинет', 'Mayor’s desk', 'Кабинет')}</span>
        </button>
      </header>
      <div className="city-brief-column">
        <section className="district-brief">
          <div className="brief-location">
            <MapPin size={14} />
            <select
              aria-label={t('Выбрать район', 'Select district', 'Ауданды таңдау')}
              value={selected}
              onWheelCapture={(e) => {
                e.currentTarget.blur();
                e.stopPropagation();
              }}
              onChange={(e) => select(e.target.value as DistrictId)}
            >
              {DISTRICTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name[lang]}
                </option>
              ))}
            </select>
            <ChevronDown size={13} />
          </div>
          <div className="brief-district-meta">
            <span>
              <Users size={11} />
              {Math.round(district.pop * 100)}% {t('жителей', 'population', 'халық')}
            </span>
            <b
              className={
                result.districtScores[selected] < BASELINE.districtScores[selected]
                  ? 'is-negative'
                  : ''
              }
              title={t(
                'Изменение балла района',
                'District score change',
                'Аудан ұпайының өзгерісі',
              )}
            >
              {signed(result.districtScores[selected] - BASELINE.districtScores[selected])}
            </b>
          </div>
          <h1>{district.profile[lang]}</h1>
          <div className="brief-needs">
            {needs.map((k) => (
              <div key={k}>
                <span>{INDICATORS[k][lang]}</span>
                <b className={result.metrics[selected][k] < 40 ? 'urgent' : ''}>
                  {result.metrics[selected][k].toFixed(0)}
                  <small>/100</small>
                </b>
              </div>
            ))}
          </div>
          <p>
            {result.critical.some((c) => c.districtId === selected)
              ? t(
                  'Показатели ниже 40 требуют внимания.',
                  'Indicators below 40 need attention.',
                  '40-тан төмен көрсеткіштерге назар аудару қажет.',
                )
              : t(
                  'Сравните, где ограниченный бюджет принесёт больше пользы.',
                  'Consider where your limited budget can help most.',
                  'Шектеулі бюджеттің қайда көбірек пайда әкелетінін салыстырыңыз.',
                )}
          </p>
          <button className="brief-link" onClick={() => openLayer('district')}>
            {t('Показатели района', 'Meet the district', 'Аудан көрсеткіштері')}
            <ArrowUpRight size={15} />
          </button>
        </section>
        <aside
          className="city-advice"
          data-testid="city-advice"
          aria-label={t(
            'Совет на следующий ход',
            'Advice for your next move',
            'Келесі қадамға кеңес',
          )}
        >
          <div className="city-advice-heading">
            <img src={advisorArt} alt="" />
            <div>
              <strong>{t('Айда советует', 'Aida suggests', 'Айда ұсынады')}</strong>
              <span>{cityAdviceSource}</span>
            </div>
            <button
              onClick={() => openLayer('advisor')}
              aria-label={t('Спросить Айду', 'Ask Aida', 'Айдадан сұрау')}
              title={t('Спросить Айду', 'Ask Aida', 'Айдадан сұрау')}
            >
              <Sparkles size={16} />
            </button>
          </div>
          {citySuggestion ? (
            <button
              className="city-advice-suggestion"
              data-testid="preview-suggestion"
              onClick={() =>
                openPolicy(
                  MEASURES.find((m) => m.id === citySuggestion.decision.measureId)!,
                  citySuggestion.decision.districtId,
                )
              }
            >
              <span>
                <b>{citySuggestion.name}</b>
                <small>
                  {citySuggestion.district} · {signed(citySuggestion.gain)} QoL
                </small>
              </span>
              <span className="city-advice-preview">
                {t('Прогноз', 'Preview', 'Болжам')}
                <ArrowRight size={14} />
              </span>
            </button>
          ) : (
            <p>
              {t(
                'Пять решений приняты. Теперь сравним результат с началом.',
                'Five decisions made. Let’s see how the city changed.',
                'Бес шешім қабылданды. Қаланың өзгерісін көрейік.',
              )}
            </p>
          )}
        </aside>
      </div>
      {decisions.length > 0 && (
        <div
          className="city-view-switch"
          aria-label={t('Сравнить город', 'Compare your city', 'Қаланы салыстыру')}
        >
          <button
            aria-pressed={!beforeView}
            className={!beforeView ? 'active' : ''}
            onClick={() => setBeforeView(false)}
          >
            {t('Ваш город', 'Your city', 'Сіздің қалаңыз')}
          </button>
          <button
            aria-pressed={beforeView}
            className={beforeView ? 'active' : ''}
            onClick={() => setBeforeView(true)}
          >
            {t('До решений', 'Before decisions', 'Шешімдерге дейін')}
          </button>
        </div>
      )}
      <section
        className="policy-desk"
        aria-label={t('Ваш следующий ход', 'Your next move', 'Келесі қадамыңыз')}
      >
        <div className="desk-title">
          <div>
            <span className="term-kicker">
              {decisions.length === 5
                ? t('Пять решений приняты', 'Five decisions made', 'Бес шешім қабылданды')
                : t(
                    `Решение ${decisions.length + 1} из 5`,
                    `Decision ${decisions.length + 1} of 5`,
                    `5 шешімнің ${decisions.length + 1}-шісі`,
                  )}
            </span>
            <h2>
              {decisions.length === 5
                ? t(
                    'Посмотрите, что изменилось.',
                    'See what you changed.',
                    'Не өзгергенін көріңіз.',
                  )
                : t(
                    'Что сделаем для жителей?',
                    'What will you do for residents?',
                    'Тұрғындар үшін не істейміз?',
                  )}
            </h2>
          </div>
          <button className="all-policies" onClick={() => openLayer('catalog')}>
            {t('Все 14 мер', 'All 14 policies', 'Барлық 14 шара')}
            <Layers size={15} />
          </button>
        </div>
        {guide.active && phase === 'play' && !draft && !layer && decisions.length < 5 && (
          <MayorOnboarding
            stage="choose"
            lang={lang}
            districtName={district.name[lang]}
            onSkip={guide.skip}
          />
        )}
        {decisions.length < 5 ? (
          <div className="term-policy-hand">
            {candidates.map((c) => card(MEASURES.find((m) => m.id === c.decision.measureId)!))}
          </div>
        ) : (
          <div className="term-finish-strip">
            <Flag size={27} />
            <span>
              {t(
                'Один бюджет. Ваш собственный путь.',
                'One budget. A path of your own.',
                'Бір бюджет. Өзіңіздің жолыңыз.',
              )}
            </span>
            <button className="gold-button" onClick={() => setPhase('finale')}>
              {t('Итоги срока', 'Review your term', 'Мерзім қорытындысы')}
              <ArrowRight size={17} />
            </button>
          </div>
        )}
      </section>
      {p.storageWarning && (
        <div className="term-storage" role="status">
          {t(
            'Сохранение недоступно. Экспортируйте план из истории.',
            'Storage unavailable. Export your plan from the journal.',
            'Сақтау мүмкін емес. Жоспарды тарихтан экспорттаңыз.',
          )}
        </div>
      )}
      <dialog
        ref={reviewRef}
        className="term-review"
        aria-label={t('Предпросмотр решения', 'Policy preview', 'Шешімді алдын ала қарау')}
        onCancel={closeReview}
      >
        {draft && (
          <>
            <div className="review-head">
              <button className="plain-back" onClick={closeReview}>
                <ArrowLeft size={17} />
                {t('К вариантам', 'Back to options', 'Нұсқаларға оралу')}
              </button>
              <span>
                {draft.id} / {CATEGORIES[draft.category].name[lang]}
              </span>
            </div>
            <div className="review-scroll">
              <span className="term-kicker">
                {t('Сначала — последствия', 'First, the consequences', 'Алдымен — салдары')}
              </span>
              <h2>{draft.name[lang]}</h2>
              <p className="review-description">{draft.description[lang]}</p>
              <div className="review-facts">
                <span>
                  <Coins size={16} />
                  <b>{draft.cost}</b>
                  {t('бюджета', 'budget', 'бюджет')}
                </span>
                <span>
                  <Clock3 size={16} />
                  <b>{draft.lag}</b>
                  {t('кв. до эффекта', 'qtrs until impact', 'тоқ. кейін әсер')}
                </span>
              </div>
              <label className="review-target">
                {t('Кому помогаем', 'Who benefits', 'Кімге көмектесеміз')}
                {draft.scope === 'city' ? (
                  <strong>
                    {t('Всем пяти районам', 'All five districts', 'Бес ауданның бәріне')}
                  </strong>
                ) : (
                  <select
                    aria-label={t('Район для меры', 'Policy district', 'Шара ауданы')}
                    value={selected}
                    onWheelCapture={(e) => {
                      e.currentTarget.blur();
                      e.stopPropagation();
                    }}
                    onChange={(e) => select(e.target.value as DistrictId)}
                  >
                    {DISTRICTS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name[lang]}
                      </option>
                    ))}
                  </select>
                )}
              </label>
              {issues.length ? (
                <div className="term-warning" role="alert">
                  {issues.map((i) => (
                    <p key={i.code}>{issueText(i.code)}</p>
                  ))}
                </div>
              ) : (
                preview &&
                change && (
                  <>
                    <div className="review-score">
                      <span>
                        {t(
                          'Прогноз качества жизни',
                          'Quality of life forecast',
                          'Өмір сапасының болжамы',
                        )}
                      </span>
                      <div>
                        <s>{result.score.toFixed(2)}</s>
                        <ArrowRight size={19} />
                        <strong>{preview.score.toFixed(2)}</strong>
                        <em>{signed(change.gain)}</em>
                      </div>
                    </div>
                    <div className="review-deltas">{metricRows(featuredDeltas)}</div>
                    {change.metricDeltas.length > featuredDeltas.length && (
                      <details className="review-all-changes">
                        <summary>
                          {t(
                            `Все изменения: ${change.metricDeltas.length}`,
                            `All ${change.metricDeltas.length} indicator changes`,
                            `Барлық ${change.metricDeltas.length} өзгеріс`,
                          )}
                          <ChevronDown size={15} />
                        </summary>
                        <div className="review-deltas">{metricRows(change.metricDeltas)}</div>
                      </details>
                    )}
                    {change.criticalRemoved > 0 && (
                      <div className="review-milestone">
                        <ShieldCheck size={18} />
                        {t(
                          `Критических показателей станет меньше: ${change.criticalRemoved}.`,
                          `Resolves ${change.criticalRemoved} critical indicator${change.criticalRemoved === 1 ? '' : 's'}.`,
                          `Сындарлы көрсеткіш ${change.criticalRemoved}-ге азаяды.`,
                        )}
                      </div>
                    )}
                  </>
                )
              )}
              {guide.active && (
                <MayorOnboarding
                  stage="preview"
                  lang={lang}
                  lagQuarters={draft.lag}
                  citywide={draft.scope === 'city'}
                  onSkip={guide.skip}
                />
              )}
              {SYNERGIES.filter((s) => s.pair.some((id) => id === draft.id)).map((s) => (
                <div className="review-synergy" key={s.indicator}>
                  <Sparkles size={16} />
                  <span>
                    <b>{s.name[lang]}</b>
                    {t('Вместе с', 'Pair with', 'Бірге')}{' '}
                    {
                      MEASURES.find((m) => m.id === s.pair.find((id) => id !== draft.id))!.name[
                        lang
                      ]
                    }
                    : {s.indicator} +{s.bonus}
                  </span>
                </div>
              ))}
              <p className="review-horizon">
                {t(
                  'Эффект рассчитан на 8 кварталов с учётом задержки. Это учебная модель.',
                  'Effects are calculated over 8 quarters, including delay. This is an educational model.',
                  'Әсер кідірісті ескере отырып, 8 тоқсанға есептелді. Бұл оқу моделі.',
                )}
              </p>
              <button className="review-ask" onClick={() => setLayer('advisor')}>
                <Sparkles size={17} />
                {t(
                  'Обсудить с советником',
                  'Talk it through with your advisor',
                  'Кеңесшімен талқылау',
                )}
                <ArrowRight size={15} />
              </button>
            </div>
            <footer className="review-footer">
              <div>
                <span>{t('Останется', 'Remaining', 'Қалады')}</span>
                <b>
                  {100 - result.cost - draft.cost}
                  <small>/100</small>
                </b>
              </div>
              <button
                className="gold-button"
                data-testid="commit-policy"
                disabled={!!issues.length}
                onClick={apply}
              >
                {t('Принять решение', 'Fund this policy', 'Шешімді қабылдау')}
                <ArrowRight size={18} />
              </button>
            </footer>
          </>
        )}
      </dialog>
      <dialog
        ref={panelRef}
        className={`term-panel panel-${layer}`}
        onCancel={() => setLayer(null)}
      >
        <header>
          <span className="term-kicker">
            QALA /{' '}
            {layer === 'desk'
              ? t('Кабинет мэра', 'Mayor’s desk', 'Әкім кабинеті')
              : layer === 'catalog'
                ? t('Ваши возможности', 'Your options', 'Сіздің мүмкіндіктеріңіз')
                : layer === 'district'
                  ? t('Район в деталях', 'District details', 'Аудан туралы')
                  : layer === 'advisor'
                    ? t('Советник мэра', 'Mayor’s advisor', 'Әкім кеңесшісі')
                    : layer === 'journal'
                      ? t('История решений', 'Decision journal', 'Шешімдер тарихы')
                      : t('Книга мэра', 'Mayor’s handbook', 'Әкім кітабы')}
          </span>
          <button
            aria-label={t('Закрыть панель', 'Close panel', 'Панельді жабу')}
            className="round-close"
            onClick={() => setLayer(null)}
          >
            <X size={19} />
          </button>
        </header>
        <div className="term-panel-body">
          {layer === 'desk' && (
            <>
              <h2>{t('Небольшая пауза.', 'A moment to think.', 'Ойланатын сәт.')}</h2>
              <p>
                {t(
                  'Советы, история и настройки здесь. Город подождёт вашего следующего решения.',
                  'Advice, your decisions, and a few comforts. The city can wait for your next move.',
                  'Кеңестер, шешімдер мен баптаулар осында. Қала келесі қадамыңызды күтеді.',
                )}
              </p>
              <div className="desk-links">
                <button onClick={() => setLayer('advisor')}>
                  <Sparkles />
                  <span>
                    <b>{t('AI-советник', 'AI advisor', 'AI кеңесші')}</b>
                    <small>
                      {t(
                        'Обсудить варианты с Айдой',
                        'Think through the options with Aida',
                        'Нұсқаларды Айдамен талқылау',
                      )}
                    </small>
                  </span>
                  <ChevronRight />
                </button>
                <button onClick={() => setLayer('journal')}>
                  <History />
                  <span>
                    <b>{t('История решений', 'Decision journal', 'Шешімдер тарихы')}</b>
                    <small>
                      {t(
                        'Вернуться на шаг, сохранить или начать заново',
                        'Reconsider, save, or begin again',
                        'Қайта қарау, сақтау немесе қайта бастау',
                      )}
                    </small>
                  </span>
                  <ChevronRight />
                </button>
                <button onClick={() => setLayer('book')}>
                  <BookOpen />
                  <span>
                    <b>{t('Книга мэра', 'Mayor’s handbook', 'Әкім кітабы')}</b>
                    <small>
                      {t(
                        'Восемь идей для более удобного города',
                        'Eight ideas for a more livable city',
                        'Жайлы қалаға арналған сегіз идея',
                      )}
                    </small>
                  </span>
                  <ChevronRight />
                </button>
              </div>
              <button
                className="desk-laboratory"
                onClick={() => {
                  setLayer(null);
                  p.onSandbox();
                }}
              >
                <FlaskConical size={20} />
                <span>
                  <b>{t('Лаборатория сценариев', 'Scenario laboratory', 'Сценарий зертханасы')}</b>
                  <small>
                    {t(
                      'Бюджет, число решений и свои меры · отдельно от игры',
                      'Budget, decision limit and custom policies · separate from your game',
                      'Бюджет, шешім саны мен өз шараларыңыз · ойыннан бөлек',
                    )}
                  </small>
                </span>
                <ArrowUpRight size={17} />
              </button>
              <div className="desk-secondary">
                <button
                  onClick={() => {
                    setLayer(null);
                    p.onReport();
                  }}
                >
                  <ChartNoAxesCombined size={17} />
                  {t('Полный разбор', 'Full report', 'Толық талдау')}
                </button>
                <button
                  onClick={() => {
                    setLayer(null);
                    guide.replay();
                    setPhase('briefing');
                  }}
                >
                  <HelpCircle size={17} />
                  {t('Как играть', 'How to play', 'Қалай ойнау керек')}
                </button>
              </div>
              <div className="desk-preferences">
                <div>
                  <span>{t('Язык', 'Language', 'Тіл')}</span>
                  {languages}
                </div>
                <button onClick={() => setNight(!night)} aria-pressed={night}>
                  {night ? <Moon size={17} /> : <Sun size={17} />}
                  <span>{t('Вечерний город', 'Evening city', 'Кешкі қала')}</span>
                  <i className={night ? 'on' : ''} />
                </button>
                <button onClick={() => setPaused(!paused)} aria-pressed={paused}>
                  {paused ? <Pause size={17} /> : <Play size={17} />}
                  <span>{t('Пауза движения', 'Pause city life', 'Қала қозғалысын кідірту')}</span>
                  <i className={paused ? 'on' : ''} />
                </button>
                <button
                  onClick={() => {
                    if (!sound) {
                      audio.current ??= new AudioContext();
                      void audio.current.resume();
                    }
                    setSound(!sound);
                  }}
                  aria-pressed={sound}
                >
                  {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
                  <span>{t('Звуки решений', 'Decision sounds', 'Шешім дыбыстары')}</span>
                  <i className={sound ? 'on' : ''} />
                </button>
              </div>
            </>
          )}
          {layer === 'catalog' && (
            <>
              <h2>
                {t(
                  'У города много путей.',
                  'A city has many possible futures.',
                  'Қаланың даму жолдары көп.',
                )}
              </h2>
              <p>
                {t(
                  'Выберите меру, чтобы увидеть последствия. Бюджет пока не расходуется.',
                  'Choose a policy to preview its consequences. Your budget stays untouched.',
                  'Салдарын көру үшін шараны таңдаңыз. Бюджет әзірге жұмсалмайды.',
                )}
              </p>
              <div className="catalog-filters">
                <button
                  className={category === 'all' ? 'active' : ''}
                  onClick={() => setCategory('all')}
                >
                  {t('Все', 'All', 'Бәрі')}
                </button>
                {Object.entries(CATEGORIES).map(([id, c]) => (
                  <button
                    key={id}
                    className={category === id ? 'active' : ''}
                    onClick={() => setCategory(id as Category)}
                  >
                    {c.name[lang]}
                  </button>
                ))}
              </div>
              <div className="catalog-grid">
                {MEASURES.filter((m) => category === 'all' || m.category === category).map((m) =>
                  card(m, true),
                )}
              </div>
            </>
          )}
          {layer === 'district' && (
            <>
              <DistrictStatistics
                lang={lang}
                result={result}
                selected={selected}
                onSelect={select}
              />
              <button
                className="district-city-analytics"
                onClick={() => {
                  setLayer(null);
                  p.onReport();
                }}
              >
                <ChartNoAxesCombined size={17} />
                {t('Сравнить все районы', 'Compare all districts', 'Барлық аудандарды салыстыру')}
                <ArrowUpRight size={15} />
              </button>
              <button className="gold-button" onClick={() => setLayer('catalog')}>
                {t('Найти решение', 'Find a policy', 'Шешім табу')}
                <ArrowRight size={16} />
              </button>
            </>
          )}
          {layer === 'advisor' && (
            <>
              <div className="advisor-intro">
                <img src={advisorArt} alt="" />
                <div>
                  <span>
                    {t('Айда · ваш советник', 'Aida · your advisor', 'Айда · сіздің кеңесшіңіз')}
                  </span>
                  <h2>{t('Обдумаем вместе.', 'Let’s think it through.', 'Бірге ойланайық.')}</h2>
                </div>
              </div>
              <p>
                {t(
                  'Числа уже рассчитаны. Советник помогает понять выбор; последнее слово за вами.',
                  'The numbers are already calculated. Your advisor helps explain the choice; you have the final say.',
                  'Сандар есептелген. Кеңесші таңдауды түсіндіреді; соңғы шешім өзіңізде.',
                )}
              </p>
              <AdvisorConnection lang={lang} />
              <label className="advice-label">
                {t('Что для вас важнее?', 'What matters most?', 'Сіз үшін не маңызды?')}
                <select value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
                  {Object.entries(GOALS).map(([id, g]) => (
                    <option key={id} value={id}>
                      {g[lang]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="advice-label">
                {t('Ваш вопрос', 'Your question', 'Сұрағыңыз')}
                <textarea
                  maxLength={800}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={t(
                    'Как помочь Нуре и оставить деньги на безопасность?',
                    'How can I help Nura and preserve budget for safety?',
                    'Нұраға көмектесіп, қауіпсіздікке бюджетті қалай қалдырамыз?',
                  )}
                />
              </label>
              {draft && (
                <div className="advice-draft">
                  {t('Обсуждаем', 'Reviewing', 'Талқылануда')}: <b>{draft.name[lang]}</b>
                  <button onClick={() => setLayer(null)}>
                    {t('К прогнозу', 'Return to preview', 'Болжамға оралу')}
                    <ArrowUpRight size={13} />
                  </button>
                </div>
              )}
              <button className="gold-button" disabled={busy} onClick={ask}>
                <Sparkles size={17} />
                {busy
                  ? t(
                      'Обдумываем варианты…',
                      'Considering your options…',
                      'Нұсқалар қарастырылуда…',
                    )
                  : t('Получить совет', 'Get advice', 'Кеңес алу')}
              </button>
              <section className="advice-response" aria-live="polite">
                <span className="advice-origin">
                  {answer.mode === 'local'
                    ? t(
                        'Локальный анализ · без LLM',
                        'Local analysis · no LLM',
                        'Жергілікті талдау · LLM жоқ',
                      )
                    : answer.mode === 'hybrid'
                      ? 'Jev + LLM'
                      : answer.mode === 'jev'
                        ? 'Jev'
                        : 'LLM'}
                </span>
                {answer.notice && (
                  <p className="term-warning">
                    {t(
                      'AI-сервис недоступен. Источник совета указан выше.',
                      'An AI service is unavailable. The advice source is shown above.',
                      'AI қызметі қолжетімсіз. Кеңес көзі жоғарыда көрсетілген.',
                    )}
                  </p>
                )}
                {answer.mode === 'local' && (
                  <p className="advice-footnote">
                    {t(
                      'Локальный анализ использует выбранный приоритет. Для свободного вопроса нужен подключённый AI.',
                      'Local analysis uses your selected priority. Free-text questions need a connected AI service.',
                      'Жергілікті талдау басымдықты қолданады. Еркін сұрақ үшін қосылған AI қажет.',
                    )}
                  </p>
                )}
                <p className="advice-summary">{answer.narration.summary}</p>
                {answer.confidence !== null && (
                  <p className="advice-confidence">
                    {t(
                      'Уверенность выбора Jev',
                      'Jev selection confidence',
                      'Jev таңдау сенімділігі',
                    )}
                    : {Math.round(answer.confidence * 100)}%
                    {answer.confidence < 0.55 && (
                      <b>
                        {t(
                          ' · сравните альтернативы',
                          ' · review alternatives',
                          ' · баламаларды салыстырыңыз',
                        )}
                      </b>
                    )}
                  </p>
                )}
                {answer.needsClarification && (
                  <p className="term-warning">
                    {t(
                      'Уточните приоритет: запрос неоднозначен.',
                      'Clarify your priority: the request is ambiguous.',
                      'Басымдықты нақтылаңыз: сұрау екіұшты.',
                    )}
                  </p>
                )}
                {answer.recommendation && (
                  <button
                    className="advisor-choice"
                    onClick={() =>
                      openPolicy(
                        MEASURES.find((m) => m.id === answer.recommendation!.decision.measureId)!,
                        answer.recommendation!.decision.districtId,
                      )
                    }
                  >
                    <span>
                      <small>{t('Рассмотреть', 'Consider', 'Қарастыру')}</small>
                      <b>{answer.recommendation.name}</b>
                      <small>
                        {answer.recommendation.district} · {answer.recommendation.cost} ·{' '}
                        {signed(answer.recommendation.gain)} QoL
                      </small>
                    </span>
                    <ArrowUpRight size={21} />
                  </button>
                )}
                <h3>{t('Что даёт решение', 'What it offers', 'Шешімнің пайдасы')}</h3>
                <ul>
                  {answer.narration.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
                <h3>{t('О чём помнить', 'What to keep in mind', 'Нені ескеру керек')}</h3>
                <ul>
                  {answer.narration.tradeoffs.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
                <p>{answer.narration.nextStep}</p>
                {answer.alternatives.length > 0 && (
                  <h3>{t('Другие пути', 'Other paths', 'Басқа жолдар')}</h3>
                )}
                {answer.alternatives.map((c) => (
                  <button
                    className="advice-alternative"
                    key={c.id}
                    onClick={() =>
                      openPolicy(
                        MEASURES.find((m) => m.id === c.decision.measureId)!,
                        c.decision.districtId,
                      )
                    }
                  >
                    <span>
                      {c.name}
                      <small>{c.district}</small>
                    </span>
                    <b>{signed(c.gain)}</b>
                    <ChevronRight size={16} />
                  </button>
                ))}
              </section>
              <PlanSearch
                lang={lang}
                decisions={decisions}
                onPreview={(decision) =>
                  openPolicy(
                    MEASURES.find((m) => m.id === decision.measureId)!,
                    decision.districtId,
                  )
                }
              />
            </>
          )}
          {layer === 'journal' && (
            <>
              <h2>{t('Ваш след в городе.', 'Your mark on the city.', 'Қаладағы ізіңіз.')}</h2>
              <p>
                {t(
                  'Сохранены только принятые решения. Можно вернуться на шаг назад.',
                  'Only adopted policies appear here. You can step back and reconsider.',
                  'Мұнда қабылданған шаралар ғана бар. Бір қадамға оралуға болады.',
                )}
              </p>
              <div className="term-journal">
                {decisionEvents(decisions).map((e) => (
                  <article key={e.sequence}>
                    <i>{e.sequence}</i>
                    <div>
                      <h3>{MEASURES.find((m) => m.id === e.decision.measureId)!.name[lang]}</h3>
                      <small>
                        {e.decision.districtId
                          ? DISTRICTS.find((d) => d.id === e.decision.districtId)!.name[lang]
                          : t('Весь город', 'Citywide', 'Бүкіл қала')}
                      </small>
                      <p>
                        {e.before.score.toFixed(2)} <ArrowRight size={13} />{' '}
                        <b>{e.after.score.toFixed(2)}</b>
                        <em>{signed(e.after.score - e.before.score)}</em>
                      </p>
                    </div>
                  </article>
                ))}
              </div>
              {!decisions.length && (
                <div className="journal-empty">
                  <Flag size={36} />
                  <p>
                    {t(
                      'Ваш первый ход ещё впереди.',
                      'Your first move is still ahead.',
                      'Алғашқы қадамыңыз әлі алда.',
                    )}
                  </p>
                </div>
              )}
              <div className="journal-actions">
                <button disabled={!decisions.length} onClick={p.onUndo}>
                  <Undo2 size={16} />
                  {t('Отменить последний ход', 'Undo last decision', 'Соңғы шешімді қайтару')}
                </button>
                <button onClick={download}>
                  <Download size={16} />
                  {t('Экспорт JSON', 'Export JSON', 'JSON экспорты')}
                </button>
                <button onClick={p.onArchive}>
                  <History size={16} />
                  {t('Сохранённые сценарии', 'Saved scenarios', 'Сақталған сценарийлер')}
                </button>
                <button
                  onClick={() => {
                    setLayer(null);
                    p.onReset();
                  }}
                >
                  <RotateCcw size={16} />
                  {t('Начать заново', 'Start again', 'Қайта бастау')}
                </button>
              </div>
            </>
          )}
          {layer === 'book' && (
            <>
              <span className="book-chapter">{String(tip + 1).padStart(2, '0')} / 08</span>
              <h2>{HANDBOOK[tip].title[lang]}</h2>
              <p className="book-principle">{HANDBOOK[tip].principle[lang]}</p>
              <div className="book-exercise">
                <span className="term-kicker">
                  {t('Попробуйте в городе', 'Try it in your city', 'Қалаңызда қолданып көріңіз')}
                </span>
                <p>{HANDBOOK[tip].action[lang]}</p>
                {HANDBOOK[tip].measures.map((id) => (
                  <button key={id} onClick={() => openPolicy(MEASURES.find((m) => m.id === id)!)}>
                    {MEASURES.find((m) => m.id === id)!.name[lang]}
                    <ArrowUpRight size={15} />
                  </button>
                ))}
              </div>
              <div className="book-paging">
                <button disabled={tip === 0} onClick={() => setTip(tip - 1)}>
                  <ArrowLeft size={16} />
                  {t('Назад', 'Previous', 'Артқа')}
                </button>
                <button disabled={tip === 7} onClick={() => setTip(tip + 1)}>
                  {t('Далее', 'Next', 'Келесі')}
                  <ArrowRight size={16} />
                </button>
              </div>
              <div className="book-contents">
                {HANDBOOK.map((h, i) => (
                  <button
                    className={tip === i ? 'active' : ''}
                    key={h.id}
                    onClick={() => setTip(i)}
                  >
                    <span>{String(i + 1).padStart(2, '0')}</span>
                    {h.title[lang]}
                  </button>
                ))}
              </div>
              <p className="advice-footnote">
                {t(
                  'Оригинальные советы QALA по темам вступления и оглавления «100 советов мэру» И. Варламова и М. Каца (2020). Полные главы не воспроизводятся.',
                  'Original QALA advice inspired by topics in the supplied introduction and contents of “100 Tips for a Mayor” by I. Varlamov and M. Katz (2020). Full chapters are not reproduced.',
                  'И. Варламов пен М. Кацтың «100 советов мэру» (2020) кітабының берілген кіріспесі мен мазмұнына негізделген QALA кеңестері. Толық тараулар көшірілмеген.',
                )}
              </p>
            </>
          )}
        </div>
      </dialog>
      <dialog
        ref={flowRef}
        className={`term-flow flow-${phase}`}
        onCancel={(e) => {
          if (phase === 'arrival' || phase === 'briefing') {
            e.preventDefault();
            guide.skip();
            enter();
          } else {
            if (phase === 'response') guide.finish();
            setPhase('play');
          }
        }}
      >
        {phase === 'arrival' && (
          <div className="arrival">
            <img className="arrival-art" src={art} alt="Astana isometric city" />
            <div className="arrival-veil" />
            <div className="arrival-top">
              <b>QALA</b>
              {languages}
            </div>
            <div className="arrival-copy">
              <span className="arrival-eyebrow">
                ASTANA / {t('АКИМ НА 5 ЧАСОВ', 'MAYOR FOR 5 HOURS', '5 САҒАТҚА ӘКІМ')}
              </span>
              <h1>
                {t('Большой город.', 'A whole city.', 'Тұтас қала.')}
                <br />
                <em>{t('Ваши пять решений.', 'Your five decisions.', 'Сіздің бес шешіміңіз.')}</em>
              </h1>
              <p>
                {t(
                  'За каждой цифрой — чья-то дорога домой, школа или тихий двор. На что вы потратите один городской бюджет?',
                  'Behind every number is a journey home, a classroom, a neighborhood. How will you spend one city budget?',
                  'Әр санның артында үйге жол, мектеп пен аула бар. Бір қала бюджетін қалай жұмсайсыз?',
                )}
              </p>
              <button className="gold-button" onClick={() => setPhase('briefing')}>
                {t('Стать акимом', 'Take office', 'Әкім болу')}
                <ArrowRight size={20} />
              </button>
              <button
                className="arrival-skip"
                onClick={() => {
                  guide.skip();
                  enter();
                }}
              >
                {t('Сразу в город', 'Go straight to the city', 'Бірден қалаға өту')}
              </button>
              <div className="arrival-details">
                <span>
                  <Coins size={15} />
                  100 {t('бюджета', 'budget', 'бюджет')}
                </span>
                <span>
                  <Flag size={15} />5 {t('решений', 'decisions', 'шешім')}
                </span>
                <span>{t('Работает офлайн', 'Works offline', 'Офлайн жұмыс істейді')}</span>
              </div>
            </div>
            <span className="arrival-footnote">
              {t(
                'Учебная Астана. Синтетические данные. Настоящие вопросы.',
                'An illustrative Astana. Synthetic data. Meaningful choices.',
                'Астананың оқу үлгісі. Синтетикалық деректер. Мағыналы таңдау.',
              )}
            </span>
          </div>
        )}
        {phase === 'briefing' && (
          <MayorOnboarding
            stage="briefing"
            lang={lang}
            onContinue={() => {
              guide.start();
              enter();
            }}
            onSkip={() => {
              guide.skip();
              enter();
            }}
          />
        )}
        {phase === 'response' && receipt && (
          <div className="policy-response" data-testid="applied-summary">
            <div className="response-seal">
              <Check size={32} />
            </div>
            <span className="term-kicker">
              {t(
                `Решение ${decisions.length} принято`,
                `Decision ${decisions.length} adopted`,
                `${decisions.length}-шешім қабылданды`,
              )}
            </span>
            <h2>{receipt.measure.name[lang]}</h2>
            <p>
              {receipt.decision.districtId
                ? DISTRICTS.find((d) => d.id === receipt.decision.districtId)!.name[lang]
                : t('Все пять районов', 'All five districts', 'Бес ауданның бәрі')}
            </p>
            <div className="response-score">
              <span>{receipt.before.score.toFixed(2)}</span>
              <ArrowRight size={23} />
              <b>{receipt.after.score.toFixed(2)}</b>
              <em>{signed(receipt.after.score - receipt.before.score)} QoL</em>
            </div>
            <p className="response-meaning">
              {receipt.before.critical.length > receipt.after.critical.length
                ? t(
                    'Одна из самых острых потребностей получила поддержку.',
                    'A critical need now has support.',
                    'Сындарлы қажеттілік қолдау тапты.',
                  )
                : t(
                    'Ваш план изменил показатели города. Каждый следующий выбор добавит свой вклад.',
                    'Your plan has changed the city’s indicators. The next choice builds on this one.',
                    'Жоспарыңыз қала көрсеткіштерін өзгертті. Келесі таңдау өз үлесін қосады.',
                  )}
            </p>
            <div className="response-delta-row">
              <span>
                {t('Критических показателей', 'Critical indicators', 'Сындарлы көрсеткіштер')}
              </span>
              <b>
                {receipt.before.critical.length} → {receipt.after.critical.length}
              </b>
            </div>
            {milestones(receipt.after)
              .filter(
                (m) => m.earned && !milestones(receipt.before).find((x) => x.id === m.id)!.earned,
              )
              .map((m) => (
                <div className="earned-milestone" key={m.id}>
                  <Medal size={21} />
                  <span>
                    <b>{m.title[lang]}</b>
                    <small>{m.detail[lang]}</small>
                  </span>
                </div>
              ))}
            {guide.active && <MayorOnboarding stage="result" lang={lang} onSkip={guide.skip} />}
            <button
              className="gold-button"
              onClick={() => {
                guide.finish();
                setPhase(decisions.length === 5 ? 'finale' : 'play');
              }}
            >
              {decisions.length === 5
                ? t('Подвести итоги', 'Review your term', 'Қорытындылау')
                : t('Следующее решение', 'Next decision', 'Келесі шешім')}
              <ArrowRight size={19} />
            </button>
            <button
              className="response-undo"
              onClick={() => {
                p.onUndo();
                setPhase('play');
              }}
            >
              <Undo2 size={14} />
              {t('Пересмотреть решение', 'Reconsider this decision', 'Шешімді қайта қарау')}
            </button>
          </div>
        )}
        {phase === 'finale' && (
          <div className="term-finale">
            <span className="term-kicker">
              {t('Пять решений. Один город.', 'Five decisions. One city.', 'Бес шешім. Бір қала.')}
            </span>
            <h2>
              {t(
                'Вот что вы изменили.',
                'Here is what you changed.',
                'Міне, сіз өзгерткен нәтиже.',
              )}
            </h2>
            <div className="finale-score">
              <small>Astana Quality of Life Score</small>
              <strong>{result.score.toFixed(2)}</strong>
              <span>
                {signed(result.score - BASELINE.score)}{' '}
                {t('к исходному', 'from the baseline', 'бастапқыдан')}
              </span>
            </div>
            <div className="finale-facts">
              <span>
                <Coins size={16} />
                {result.cost} / 100 {t('потрачено', 'spent', 'жұмсалды')}
              </span>
              <span>
                <ShieldCheck size={16} />
                {result.critical.length}{' '}
                {t('критических', 'critical indicators', 'сындарлы көрсеткіш')}
              </span>
            </div>
            <div className="finale-milestones">
              {achieved.map((m) => (
                <div key={m.id} className={m.earned ? 'earned' : ''}>
                  <Medal size={24} />
                  <span>
                    <b>{m.title[lang]}</b>
                    <small>
                      {m.earned
                        ? m.detail[lang]
                        : t(
                            'Цель для следующей партии',
                            'A goal for your next term',
                            'Келесі ойынның мақсаты',
                          )}
                    </small>
                  </span>
                  {m.earned && <Check size={17} />}
                </div>
              ))}
            </div>
            <p>
              {t(
                'Баллы рассчитаны по формуле кейса. Достижения не добавляют скрытых бонусов.',
                'Scores follow the case formula. Milestones add no hidden bonuses.',
                'Балл кейс формуласына сай. Жетістіктер жасырын бонус қоспайды.',
              )}
            </p>
            <button className="gold-button" onClick={p.onReport}>
              {t('Открыть полный разбор', 'Open the full report', 'Толық талдауды ашу')}
              <ArrowRight size={18} />
            </button>
            <button className="response-undo" onClick={() => setPhase('play')}>
              {t('Вернуться в город', 'Back to the city', 'Қалаға оралу')}
            </button>
          </div>
        )}
      </dialog>
    </div>
  );
}
