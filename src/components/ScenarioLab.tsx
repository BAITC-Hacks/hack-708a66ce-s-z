import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  FlaskConical,
  Plus,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import {
  CATEGORIES,
  DISTRICTS,
  INDICATORS,
  KEYS,
  type Category,
  type DistrictId,
  type Lang,
  type Metrics,
} from '../game/data';
import { BASELINE, type Decision } from '../game/engine';
import {
  SANDBOX_KEY,
  newSandbox,
  parseSandbox,
  sandboxCatalog,
  sandboxDocument,
  sandboxEvaluate,
  sandboxIssueText,
  validCustomMeasure,
  type CustomMeasure,
  type SandboxState,
} from '../game/sandbox';
import { CityAnalytics } from './CityAnalytics';
import '../scenario-lab.css';

export function ScenarioLab({
  lang,
  initialDecisions,
  onClose,
}: {
  lang: Lang;
  initialDecisions: Decision[];
  onClose: () => void;
}) {
  const t = (ru: string, en: string, kk: string) => ({ ru, en, kk })[lang];
  const [state, setState] = useState<SandboxState>(() => {
    try {
      return parseSandbox(localStorage.getItem(SANDBOX_KEY)) ?? newSandbox(initialDecisions);
    } catch {
      return newSandbox(initialDecisions);
    }
  });
  const [selected, setSelected] = useState<DistrictId>('nura'),
    [tab, setTab] = useState<'plan' | 'analysis'>('plan'),
    [category, setCategory] = useState<Category | 'all' | 'custom'>('all'),
    [draftId, setDraftId] = useState<string | null>(null),
    [formOpen, setFormOpen] = useState(false),
    [storageFailed, setStorageFailed] = useState(false),
    [formError, setFormError] = useState(false),
    [lag, setLag] = useState('2'),
    [effects, setEffects] = useState<Record<string, string>>({});
  const [budgetInput, setBudgetInput] = useState(String(state.rules.budget)),
    [countInput, setCountInput] = useState(String(state.rules.decisionCount)),
    [limitError, setLimitError] = useState(false);
  const previewRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (draftId && matchMedia('(max-width: 760px)').matches)
      previewRef.current?.scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        block: 'center',
      });
  }, [draftId]);
  const catalog = useMemo(() => sandboxCatalog(state), [state.customMeasures]);
  const evaluation = useMemo(() => sandboxEvaluate(state), [state]);
  const final = useMemo(() => sandboxEvaluate(state, true), [state]);
  const result = evaluation.result!;
  const draft = catalog.find((m) => m.id === draftId);
  const proposal: Decision | null = draft
    ? { measureId: draft.id, ...(draft.scope === 'district' ? { districtId: selected } : {}) }
    : null;
  const forecast = proposal
    ? sandboxEvaluate({ ...state, decisions: [...state.decisions, proposal] })
    : null;
  const previewChanges =
    forecast?.result && draft
      ? KEYS.map((key) => {
          const targets =
            draft.scope === 'city' ? DISTRICTS.map((district) => district.id) : [selected];
          const changes = targets.map(
            (id) => forecast.result!.metrics[id][key] - result.metrics[id][key],
          );
          return { key, min: Math.min(...changes), max: Math.max(...changes) };
        }).filter(({ min, max }) => Math.abs(min) > 0.0001 || Math.abs(max) > 0.0001)
      : [];
  const signed = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
  const list = catalog.filter(
    (m) =>
      category === 'all' ||
      (category === 'custom' ? m.id.startsWith('C-') : m.category === category),
  );
  useEffect(() => {
    try {
      localStorage.setItem(SANDBOX_KEY, JSON.stringify(state));
      setStorageFailed(false);
    } catch {
      setStorageFailed(true);
    }
  }, [state]);
  function limits(event: FormEvent) {
    event.preventDefault();
    const budget = Number(budgetInput),
      decisionCount = Number(countInput);
    if (
      !budgetInput.trim() ||
      !countInput.trim() ||
      !Number.isInteger(budget) ||
      budget < 1 ||
      budget > 1000 ||
      !Number.isInteger(decisionCount) ||
      decisionCount < 1 ||
      decisionCount > 10
    ) {
      setLimitError(true);
      return;
    }
    setState((previous) => ({ ...previous, rules: { budget, decisionCount } }));
    setLimitError(false);
  }
  function custom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const measure: CustomMeasure = {
      id: `C-${crypto.randomUUID()}`,
      name: String(fields.get('name') ?? '').trim(),
      description: String(fields.get('description') ?? '').trim(),
      category: String(fields.get('category')) as Category,
      scope: String(fields.get('scope')) as 'district' | 'city',
      cost: Number(fields.get('cost')),
      lag: Number(lag),
      effects: Object.fromEntries(
        KEYS.filter((key) => effects[key]?.trim() && Number(effects[key]) !== 0).map((key) => [
          key,
          Number(effects[key]),
        ]),
      ) as Partial<Metrics>,
    };
    if (!validCustomMeasure(measure) || state.customMeasures.length >= 30) {
      setFormError(true);
      return;
    }
    setState((previous) => ({
      ...previous,
      customMeasures: [...previous.customMeasures, measure],
    }));
    setCategory('custom');
    setDraftId(measure.id);
    setFormOpen(false);
    setEffects({});
    setFormError(false);
  }
  function exportScenario() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(sandboxDocument(state), null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'qala-sandbox.json';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <main className="scenario-lab" data-testid="scenario-lab">
      <header className="lab-header">
        <button className="lab-back" onClick={onClose}>
          <ArrowLeft size={18} />
          {t('Вернуться в город', 'Return to city', 'Қалаға оралу')}
        </button>
        <div className="lab-mode">
          <FlaskConical size={19} />
          <span>
            <strong>
              {t('Лаборатория сценариев', 'Scenario laboratory', 'Сценарий зертханасы')}
            </strong>
            <small>
              {t(
                'Песочница · свои правила · не официальный результат',
                'Sandbox · custom rules · not an official score',
                'Құмсалғыш · жеке ережелер · ресми ұпай емес',
              )}
            </small>
          </span>
        </div>
        <button className="lab-export" onClick={exportScenario}>
          <Download size={16} />
          {t('Экспорт JSON', 'Export JSON', 'JSON экспорттау')}
        </button>
      </header>
      <div className="lab-body">
        <section className="lab-introduction">
          <span className="lab-kicker">QALA / {t('Что, если…', 'What if…', 'Егер…')}</span>
          <h1>
            {t(
              'Попробуйте свой вариант города.',
              'Explore your own city scenario.',
              'Қала сценарийіңізді зерттеңіз.',
            )}
          </h1>
          <p>
            {t(
              'Измените лимиты или предложите свою меру. Официальная игра остаётся прежней: 100 бюджета и 5 решений. Здесь отдельный план и локальный расчёт без AI-запросов.',
              'Change the limits or propose a policy of your own. Your official game keeps its 100 budget and five decisions. This is a separate plan with local calculations and no AI requests.',
              'Шектерді өзгертіңіз немесе өз шараңызды ұсыныңыз. Ресми ойынның 100 бюджеті мен бес шешімі сақталады. Бұл — жергілікті есептелетін, AI сұрауын жібермейтін бөлек жоспар.',
            )}
          </p>
        </section>
        {storageFailed && (
          <p className="lab-warning" role="status">
            {t(
              'Сохранение недоступно. Лаборатория работает до закрытия страницы; экспортируйте план.',
              'Browser saving is unavailable. The lab works for this visit; export your plan.',
              'Браузерде сақтау қолжетімсіз. Зертхана осы сапарда жұмыс істейді; жоспарды экспорттаңыз.',
            )}
          </p>
        )}
        <form className="lab-rules" onSubmit={limits}>
          <label>
            {t('Бюджет', 'Budget limit', 'Бюджет шегі')}
            <span>
              <input
                aria-label={t(
                  'Лимит бюджета песочницы',
                  'Sandbox budget limit',
                  'Құмсалғыш бюджетінің шегі',
                )}
                type="number"
                min="1"
                max="1000"
                step="1"
                required
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
              />
              <small>1–1000</small>
            </span>
          </label>
          <label>
            {t('Количество решений', 'Decision limit', 'Шешім шегі')}
            <span>
              <input
                aria-label={t(
                  'Лимит решений песочницы',
                  'Sandbox decision limit',
                  'Құмсалғыш шешімдерінің шегі',
                )}
                type="number"
                min="1"
                max="10"
                step="1"
                required
                value={countInput}
                onChange={(e) => setCountInput(e.target.value)}
              />
              <small>1–10</small>
            </span>
          </label>
          <button type="submit" className="lab-primary">
            {t('Применить лимиты', 'Apply limits', 'Шектерді қолдану')}
          </button>
          <p>
            {t(
              'Сохраняются: максимум две меры на направление, уникальность и конфликты. Горизонт — 8 кварталов.',
              'Still enforced: two policies per category, unique choices and conflicts. The horizon remains eight quarters.',
              'Сақталады: әр бағытта екі шара, бірегей таңдау және қайшылықтар. Көкжиек — сегіз тоқсан.',
            )}
          </p>
          {limitError && (
            <p role="alert" className="lab-error">
              {t(
                'Введите целые числа в указанных пределах.',
                'Enter whole numbers within the stated limits.',
                'Көрсетілген шектерде бүтін сандар енгізіңіз.',
              )}
            </p>
          )}
        </form>
        <nav
          className="lab-tabs"
          aria-label={t('Раздел лаборатории', 'Laboratory section', 'Зертхана бөлімі')}
        >
          <button
            className={tab === 'plan' ? 'active' : ''}
            aria-pressed={tab === 'plan'}
            onClick={() => setTab('plan')}
          >
            {t('Собрать план', 'Build a plan', 'Жоспар құру')}
          </button>
          <button
            className={tab === 'analysis' ? 'active' : ''}
            aria-pressed={tab === 'analysis'}
            onClick={() => setTab('analysis')}
          >
            {t('Показатели и последствия', 'Indicators & consequences', 'Көрсеткіштер мен салдар')}
          </button>
        </nav>
        <div className="lab-layout">
          <section className="lab-workspace">
            {tab === 'analysis' ? (
              <>
                <div className="lab-analysis-notice" role="status">
                  <FlaskConical size={18} />
                  <span>
                    {final.final
                      ? t(
                          'Завершённый пользовательский сценарий. Результат не для официального зачёта.',
                          'Completed custom scenario. This result is not an official submission.',
                          'Аяқталған жеке сценарий. Нәтиже ресми есепке арналмаған.',
                        )
                      : t(
                          'Предварительный расчёт. План ещё не соответствует выбранным лимитам; показатели сохранены для сравнения.',
                          'Forecast only. The plan does not yet meet your chosen limits; indicators remain visible for comparison.',
                          'Тек болжам. Жоспар таңдалған шектерге әлі сай емес; көрсеткіштер салыстыру үшін көрінеді.',
                        )}
                  </span>
                </div>
                <CityAnalytics
                  lang={lang}
                  result={result}
                  selected={selected}
                  onSelect={setSelected}
                />
              </>
            ) : (
              <>
                <div className="lab-tools">
                  <label>
                    {t(
                      'Район для новой меры',
                      'Target for the next policy',
                      'Келесі шараның ауданы',
                    )}
                    <select
                      value={selected}
                      onChange={(e) => setSelected(e.target.value as DistrictId)}
                      aria-label={t('Район песочницы', 'Sandbox district', 'Құмсалғыш ауданы')}
                    >
                      {DISTRICTS.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name[lang]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="lab-add-custom"
                    disabled={state.customMeasures.length >= 30}
                    onClick={() => {
                      setFormOpen(!formOpen);
                      setFormError(false);
                    }}
                  >
                    <Plus size={17} />
                    {t('Своя проблема / мера', 'Add problem / policy', 'Мәселе / шара қосу')}
                    <small>{state.customMeasures.length}/30</small>
                  </button>
                </div>
                {formOpen && (
                  <form
                    className="lab-custom-form"
                    onSubmit={custom}
                    data-testid="custom-policy-form"
                  >
                    <div className="lab-section-heading">
                      <h2>
                        {t(
                          'Какая проблема требует решения?',
                          'What problem needs a solution?',
                          'Қандай мәселені шешу қажет?',
                        )}
                      </h2>
                      <button
                        type="button"
                        onClick={() => setFormOpen(false)}
                        aria-label={t(
                          'Закрыть форму',
                          'Close custom policy form',
                          'Жеке шара формасын жабу',
                        )}
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <p>
                      {t(
                        'Эффекты — ваши допущения, а не доказанный прогноз. Сначала добавим меру в каталог, затем вы выберете её для плана.',
                        'Effects are your assumptions, not verified predictions. Add the policy to the catalogue first, then choose whether to include it in your plan.',
                        'Әсерлер — расталған болжам емес, сіздің жорамалдарыңыз. Алдымен шараны каталогқа қосып, содан кейін жоспарға енгізуді таңдаңыз.',
                      )}
                    </p>
                    <label>
                      {t('Название', 'Policy name', 'Шара атауы')}
                      <input name="name" required maxLength={100} />
                    </label>
                    <label>
                      {t(
                        'Проблема и предлагаемое решение',
                        'Problem and proposed solution',
                        'Мәселе және ұсынылған шешім',
                      )}
                      <textarea name="description" required maxLength={500} rows={2} />
                    </label>
                    <div className="lab-form-grid">
                      <label>
                        {t('Направление', 'Category', 'Бағыт')}
                        <select name="category">
                          {Object.entries(CATEGORIES).map(([id, c]) => (
                            <option key={id} value={id}>
                              {c.name[lang]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {t('Масштаб', 'Scope', 'Ауқым')}
                        <select name="scope">
                          <option value="district">
                            {t('Один район', 'One district', 'Бір аудан')}
                          </option>
                          <option value="city">{t('Весь город', 'Citywide', 'Бүкіл қала')}</option>
                        </select>
                      </label>
                      <label>
                        {t('Стоимость', 'Cost', 'Құны')}
                        <input
                          name="cost"
                          type="number"
                          required
                          min={1}
                          max={1000}
                          step={1}
                          defaultValue={10}
                        />
                      </label>
                      <label>
                        {t('Задержка, кварталы', 'Delay, quarters', 'Кідіріс, тоқсан')}
                        <input
                          name="lag"
                          type="number"
                          required
                          min={0}
                          max={7}
                          step={1}
                          value={lag}
                          onChange={(e) => setLag(e.target.value)}
                        />
                      </label>
                    </div>
                    <fieldset>
                      <legend>
                        {t(
                          'Полный эффект: −100 … +100',
                          'Full effects: −100 … +100',
                          'Толық әсер: −100 … +100',
                        )}
                      </legend>
                      <p>
                        {t(
                          'Хотя бы одно изменение. Отрицательные значения ухудшают показатель. Фактический эффект = полный × (8 − задержка) / 8.',
                          'Enter at least one change. Negative values worsen an indicator. Applied effect = full effect × (8 − delay) / 8.',
                          'Кемінде бір өзгеріс енгізіңіз. Теріс мән көрсеткішті төмендетеді. Нақты әсер = толық әсер × (8 − кідіріс) / 8.',
                        )}
                      </p>
                      <div className="lab-effects-grid">
                        {KEYS.map((key) => (
                          <label key={key}>
                            {key} · {INDICATORS[key][lang]}
                            <input
                              aria-label={`${key} ${t('полный эффект', 'full effect', 'толық әсер')}`}
                              type="number"
                              min={-100}
                              max={100}
                              step="0.01"
                              value={effects[key] ?? ''}
                              placeholder="0"
                              onChange={(e) =>
                                setEffects((previous) => ({ ...previous, [key]: e.target.value }))
                              }
                            />
                            <small>
                              {effects[key] && Number.isFinite(Number(effects[key]))
                                ? `${t('За 8 кв.', 'At 8 qtrs', '8 тоқсанда')}: ${((Number(effects[key]) * (8 - Number(lag))) / 8).toFixed(2)}`
                                : '\u00a0'}
                            </small>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    {formError && (
                      <p className="lab-error" role="alert">
                        {t(
                          'Проверьте поля и задайте хотя бы один ненулевой эффект.',
                          'Check the fields and enter at least one nonzero effect.',
                          'Өрістерді тексеріп, кемінде бір нөлден өзгеше әсер енгізіңіз.',
                        )}
                      </p>
                    )}
                    <button className="lab-primary" type="submit">
                      <Plus size={15} />
                      {t('Добавить в каталог', 'Add to catalogue', 'Каталогқа қосу')}
                    </button>
                  </form>
                )}
                <div className="lab-filters">
                  <button
                    className={category === 'all' ? 'active' : ''}
                    onClick={() => setCategory('all')}
                  >
                    {t('Все меры', 'All policies', 'Барлық шара')}
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
                  <button
                    className={category === 'custom' ? 'active' : ''}
                    onClick={() => setCategory('custom')}
                  >
                    {t('Мои меры', 'My policies', 'Менің шараларым')}
                  </button>
                </div>
                <div className="lab-policy-grid">
                  {list.map((m) => {
                    const chosen = state.decisions.some((decision) => decision.measureId === m.id),
                      isCustom = m.id.startsWith('C-');
                    return (
                      <article
                        key={m.id}
                        className={`lab-policy ${chosen ? 'is-chosen' : ''} ${draftId === m.id ? 'is-preview' : ''}`}
                      >
                        <button
                          className="lab-policy-open"
                          data-testid={`lab-policy-${m.id}`}
                          disabled={chosen}
                          onClick={() => setDraftId(m.id)}
                        >
                          <span>
                            <small>
                              {CATEGORIES[m.category].name[lang]}
                              {isCustom ? ` · ${t('Своя', 'Custom', 'Жеке')}` : ''}
                            </small>
                            <b>{m.cost}</b>
                          </span>
                          <h3>{m.name[lang]}</h3>
                          <p>{m.description[lang]}</p>
                          <footer>
                            <span>
                              {m.scope === 'city'
                                ? t('Весь город', 'Citywide', 'Бүкіл қала')
                                : DISTRICTS.find((d) => d.id === selected)!.name[lang]}{' '}
                              · {m.lag} {t('кв.', 'qtrs', 'тоқ.')}
                            </span>
                            {chosen ? <Check size={16} /> : <ArrowRight size={16} />}
                          </footer>
                        </button>
                        {isCustom && (
                          <button
                            className="lab-delete-custom"
                            aria-label={`${t('Удалить свою меру', 'Delete custom policy', 'Жеке шараны жою')}: ${m.name[lang]}`}
                            title={t(
                              'Удалит меру из каталога и плана',
                              'Removes this policy from the catalogue and plan',
                              'Шараны каталог пен жоспардан жояды',
                            )}
                            onClick={() => {
                              setState((previous) => ({
                                ...previous,
                                customMeasures: previous.customMeasures.filter(
                                  (x) => x.id !== m.id,
                                ),
                                decisions: previous.decisions.filter((x) => x.measureId !== m.id),
                              }));
                              if (draftId === m.id) setDraftId(null);
                            }}
                          >
                            <Trash2 size={13} />
                            {t('Удалить', 'Delete', 'Жою')}
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
                {!list.length && (
                  <p className="lab-empty">
                    {t(
                      'Здесь пока нет мер. Создайте свою выше.',
                      'No policies here yet. Add your own above.',
                      'Мұнда әзірше шара жоқ. Жоғарыдан өз шараңызды қосыңыз.',
                    )}
                  </p>
                )}
              </>
            )}
          </section>
          <aside className="lab-plan">
            <div className="lab-section-heading">
              <h2>{t('Ваш эксперимент', 'Your experiment', 'Сіздің тәжірибеңіз')}</h2>
              <FlaskConical size={18} />
            </div>
            <div className="lab-result">
              <small>
                {t(
                  'Расчёт по вашей модели',
                  'Your model’s calculated score',
                  'Моделіңіздің есептік ұпайы',
                )}
              </small>
              <strong data-testid="lab-score">{result.score.toFixed(2)}</strong>
              <span>
                {signed(result.score - BASELINE.score)}{' '}
                {t('к началу', 'from baseline', 'бастапқыдан')}
              </span>
            </div>
            <div className="lab-plan-totals">
              <span>
                {t('Потрачено', 'Spent', 'Жұмсалды')}
                <b data-testid="lab-budget">
                  {result.cost} / {state.rules.budget}
                </b>
              </span>
              <span>
                {t('Решений', 'Decisions', 'Шешім')}
                <b>
                  {state.decisions.length} / {state.rules.decisionCount}
                </b>
              </span>
            </div>
            {final.issues.length > 0 ? (
              <div className="lab-validation" role="status" data-testid="lab-validation">
                <strong>
                  {t('Пока только прогноз', 'Forecast only for now', 'Әзірше тек болжам')}
                </strong>
                {final.issues.map((issue, i) => (
                  <p key={`${issue.code}-${i}`}>{sandboxIssueText(issue, state.rules, lang)}</p>
                ))}
              </div>
            ) : (
              <div className="lab-valid" role="status">
                <Check size={15} />
                {t(
                  'Сценарий соответствует вашим правилам',
                  'Scenario matches your custom rules',
                  'Сценарий жеке ережелеріңізге сай',
                )}
              </div>
            )}
            {draft && forecast && (
              <section ref={previewRef} className="lab-preview" data-testid="lab-preview">
                <div className="lab-section-heading">
                  <small>
                    {t('Не добавлено · прогноз', 'Not added · preview', 'Қосылмаған · болжам')}
                  </small>
                  <button
                    onClick={() => setDraftId(null)}
                    aria-label={t(
                      'Закрыть прогноз',
                      'Close sandbox preview',
                      'Құмсалғыш болжамын жабу',
                    )}
                  >
                    <X size={15} />
                  </button>
                </div>
                <h3>{draft.name[lang]}</h3>
                <p>
                  {draft.scope === 'city'
                    ? t('Все пять районов', 'All five districts', 'Барлық бес аудан')
                    : DISTRICTS.find((d) => d.id === selected)!.name[lang]}
                </p>
                {forecast.result && (
                  <b>
                    {result.score.toFixed(2)} → {forecast.result.score.toFixed(2)}{' '}
                    <em>{signed(forecast.result.score - result.score)}</em>
                  </b>
                )}
                <div className="lab-preview-effects">
                  {previewChanges.map(({ key, min, max }) => (
                    <span key={key}>
                      {INDICATORS[key][lang]}
                      <b>
                        {Math.abs(max - min) < 0.0001
                          ? signed(min)
                          : `${signed(min)} … ${signed(max)}`}
                      </b>
                    </span>
                  ))}
                </div>
                {forecast.result && (
                  <p>
                    {t(
                      'Изменения с учётом границ 0–100 и синергий. Диапазон — различия между районами.',
                      'Actual changes after bounds and synergies. Ranges show differences across districts.',
                      '0–100 шегі мен синергия ескерілген. Аралық аудандар арасындағы айырманы көрсетеді.',
                    )}
                  </p>
                )}
                {forecast.issues.map((issue, i) => (
                  <p className="lab-error" key={i}>
                    {sandboxIssueText(issue, state.rules, lang)}
                  </p>
                ))}
                <button
                  className="lab-primary"
                  data-testid="lab-add-policy"
                  disabled={!forecast.valid}
                  onClick={() => {
                    if (proposal && forecast.valid) {
                      setState((previous) => ({
                        ...previous,
                        decisions: [...previous.decisions, { ...proposal }],
                      }));
                      setDraftId(null);
                    }
                  }}
                >
                  {t('Добавить в эксперимент', 'Add to experiment', 'Тәжірибеге қосу')} ·{' '}
                  {draft.cost}
                </button>
              </section>
            )}
            <ol className="lab-plan-list">
              {state.decisions.map((decision, i) => {
                const m = catalog.find((entry) => entry.id === decision.measureId)!;
                return (
                  <li key={decision.measureId}>
                    <span>{i + 1}</span>
                    <div>
                      <b>{m.name[lang]}</b>
                      <small>
                        {decision.districtId
                          ? DISTRICTS.find((d) => d.id === decision.districtId)!.name[lang]
                          : t('Весь город', 'Citywide', 'Бүкіл қала')}{' '}
                        · {m.cost}
                      </small>
                    </div>
                    <button
                      aria-label={`${t('Убрать из плана', 'Remove from plan', 'Жоспардан алып тастау')}: ${m.name[lang]}`}
                      onClick={() =>
                        setState((previous) => ({
                          ...previous,
                          decisions: previous.decisions.filter((_, index) => index !== i),
                        }))
                      }
                    >
                      <X size={14} />
                    </button>
                  </li>
                );
              })}
            </ol>
            {!state.decisions.length && (
              <p className="lab-empty">
                {t(
                  'Откройте карточку и сравните прогноз.',
                  'Open a policy card and compare its forecast.',
                  'Шара картасын ашып, болжамды салыстырыңыз.',
                )}
              </p>
            )}
            <button
              className="lab-undo"
              disabled={!state.decisions.length}
              onClick={() =>
                setState((previous) => ({
                  ...previous,
                  decisions: previous.decisions.slice(0, -1),
                }))
              }
            >
              <Undo2 size={14} />
              {t('Отменить последнее', 'Undo last choice', 'Соңғы таңдауды болдырмау')}
            </button>
            <button
              className="lab-analysis-button"
              onClick={() => setTab(tab === 'analysis' ? 'plan' : 'analysis')}
            >
              {tab === 'analysis'
                ? t('К мерам', 'Back to policies', 'Шараларға оралу')
                : t(
                    'Сравнить все показатели',
                    'Compare all indicators',
                    'Барлық көрсеткішті салыстыру',
                  )}
              <ArrowRight size={16} />
            </button>
            <p className="lab-local-note">
              {t(
                'Только локальный расчёт. Пользовательские допущения не отправляются официальному AI-советнику.',
                'Local calculation only. Custom assumptions are not sent to the official AI advisor.',
                'Тек жергілікті есеп. Жеке жорамалдар ресми AI кеңесшісіне жіберілмейді.',
              )}
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
