import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Bus,
  Check,
  ChevronDown,
  CircleHelp,
  Download,
  Globe2,
  HeartPulse,
  Leaf,
  Map,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Waves,
  X,
  Zap,
  BookOpen,
  Trophy,
  Undo2,
  CircleCheck,
  Clock3,
  Wallet,
  Link2,
  AlertTriangle,
} from 'lucide-react';
import {
  CATEGORIES,
  DISTRICTS,
  INDICATORS,
  KEYS,
  MEASURES,
  SYNERGIES,
  WEIGHTS,
  type DistrictId,
  type Lang,
  type Measure,
} from './game/data';
import {
  BASELINE,
  contributions,
  moveIssues,
  recommend,
  simulate,
  type Decision,
  type IssueCode,
} from './game/engine';
import { readDecisions, readRuns, save, SAVE_KEY, type SavedRun } from './game/storage';
import { MayorExperience } from './components/MayorExperience';
import { scenarioDocument } from './game/decisionSupport';
import keyArt from './assets/astana-key-art.png';

const ICONS = {
  transport: Bus,
  ecology: Leaf,
  social: HeartPulse,
  safety: ShieldCheck,
  services: Waves,
};
const format = (n: number) => n.toFixed(2);
const signed = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}`;
function initialLang(): Lang {
  try {
    const v = localStorage.getItem('qala-lang');
    return v === 'en' || v === 'kk' ? v : 'ru';
  } catch {
    return 'ru';
  }
}

export default function App() {
  const [lang, setLang] = useState<Lang>(initialLang),
    [decisions, setDecisions] = useState<Decision[]>(readDecisions),
    [selected, setSelected] = useState<DistrictId>('nura'),
    [view, setView] = useState<'city' | 'report' | 'archive'>('city'),
    [help, setHelp] = useState(false),
    [runs, setRuns] = useState<SavedRun[]>(readRuns),
    [toast, setToast] = useState(''),
    [resetConfirm, setResetConfirm] = useState(false),
    [storageWarning, setStorageWarning] = useState(false),
    [aiText, setAiText] = useState(''),
    [aiBusy, setAiBusy] = useState(false);
  useEffect(() => {
    document.body.dataset.view = view;
  }, [view]);
  const aiRequest = useRef<AbortController | null>(null);
  const helpRef = useRef<HTMLDialogElement>(null),
    resetRef = useRef<HTMLDialogElement>(null);
  const t = (ru: string, en: string, kk: string) => ({ ru, en, kk })[lang];
  const result = useMemo(() => simulate(decisions), [decisions]);
  const complete = decisions.length === 5;
  useEffect(() => {
    if (!save(SAVE_KEY, decisions)) setStorageWarning(true);
  }, [decisions]);
  useEffect(() => {
    aiRequest.current?.abort();
    setAiText('');
    setAiBusy(false);
    return () => aiRequest.current?.abort();
  }, [decisions, lang]);
  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem('qala-lang', lang);
    } catch {}
  }, [lang]);
  useEffect(() => {
    if (toast) {
      const timeout = setTimeout(() => setToast(''), 4500);
      return () => clearTimeout(timeout);
    }
  }, [toast]);
  useEffect(() => {
    if (help) helpRef.current?.showModal();
    else helpRef.current?.close();
  }, [help]);
  useEffect(() => {
    if (resetConfirm) resetRef.current?.showModal();
    else resetRef.current?.close();
  }, [resetConfirm]);
  const reset = () => {
    setDecisions([]);
    setView('city');
    setResetConfirm(false);
    setSelected('nura');
  };
  const saveRun = () => {
    const run = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      decisions: [...decisions],
    };
    const updated = [run, ...runs].slice(0, 10);
    setRuns(updated);
    if (!save('qala-runs-v1', updated)) setStorageWarning(true);
    setToast(
      t(
        'Сценарий сохранён для сравнения.',
        'Scenario saved for comparison.',
        'Сценарий салыстыру үшін сақталды.',
      ),
    );
  };
  const exportRun = () => {
    const payload = scenarioDocument(decisions);
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'qala-scenario.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const askAI = async () => {
    aiRequest.current?.abort();
    const controller = new AbortController();
    aiRequest.current = controller;
    setAiBusy(true);
    try {
      const response = await fetch('/api/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisions, lang }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25000)]),
      });
      if (!response.ok) throw new Error('Unavailable');
      const data = await response.json();
      if (typeof data.text !== 'string') throw new Error('Invalid');
      if (!controller.signal.aborted) setAiText(data.text);
    } catch {
      if (!controller.signal.aborted)
        setAiText(
          t(
            'AI-сервис не подключён. Ниже доступен полный локальный разбор. Для LLM-анализа запустите сервер по инструкции в README.',
            'AI service is not connected. The full local explanation is available below. To enable LLM analysis, follow the README server setup.',
            'AI қызметі қосылмаған. Толық жергілікті талдау төменде бар. LLM талдауын қосу үшін README нұсқаулығын орындаңыз.',
          ),
        );
    } finally {
      if (aiRequest.current === controller) setAiBusy(false);
    }
  };
  const districtName = (id: DistrictId) => DISTRICTS.find((d) => d.id === id)!.name[lang];
  const criticalNames = result.critical
    .map((c) => `${districtName(c.districtId)}: ${INDICATORS[c.indicator][lang]} (${c.value})`)
    .join('; ');
  const localAdvice = result.critical.length
    ? t(
        `Требуют внимания: ${criticalNames}. Поднимите эти показатели до 40, чтобы убрать штрафы.`,
        `Needs attention: ${criticalNames}. Bring these indicators to 40 to remove their penalties.`,
        `Назар аударыңыз: ${criticalNames}. Айыптарды жою үшін осы көрсеткіштерді 40-қа көтеріңіз.`,
      )
    : t(
        'Критических показателей нет. Теперь сравните пользу для всего города и для самого слабого района. Неиспользованный бюджет не даёт бонуса.',
        'No indicators are critical. Now balance citywide benefits with the needs of the weakest district. Unspent budget earns no bonus.',
        'Сындарлы көрсеткіштер жоқ. Енді бүкіл қала мен ең әлсіз ауданның пайдасын салыстырыңыз. Қалған бюджет бонус бермейді.',
      );
  return (
    <>
      {view === 'city' && (
        <MayorExperience
          selected={selected}
          onSelect={setSelected}
          result={result}
          decisions={decisions}
          lang={lang}
          onLang={setLang}
          storageWarning={storageWarning}
          onApply={(decision) => {
            if (!moveIssues(decisions, decision).length) setDecisions([...decisions, decision]);
          }}
          onUndo={() => setDecisions(decisions.slice(0, -1))}
          onReport={() => setView('report')}
          onArchive={() => setView('archive')}
          onHelp={() => setHelp(true)}
          onReset={() => setResetConfirm(true)}
        />
      )}
      {view !== 'city' && (
        <>
          <header className="topbar">
            <a
              className="brand"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setView('city');
              }}
              aria-label="QALA home"
            >
              <span className="brand-mark">
                <Building2 size={23} />
              </span>
              QALA
              <span className="brand-sub">
                {t('ГОРОД В ТВОИХ РУКАХ', 'YOUR CITY. YOUR CALL.', 'ҚАЛА СЕНІҢ ҚОЛЫҢДА')}
              </span>
            </a>
            <nav aria-label={t('Навигация', 'Navigation', 'Навигация')}>
              <button className="" onClick={() => setView('city')}>
                <Map size={16} />
                {t('Мой город', 'My city', 'Менің қалам')}
              </button>
              <button
                className={view === 'report' ? 'active' : ''}
                onClick={() => setView('report')}
              >
                <BookOpen size={16} />
                {t('Результаты', 'Results', 'Нәтижелер')}
              </button>
              <button
                className={view === 'archive' ? 'active' : ''}
                onClick={() => setView('archive')}
              >
                <Trophy size={16} />
                {t('Сценарии', 'Scenarios', 'Сценарийлер')}
              </button>
            </nav>
            <div className="top-actions">
              <span className="offline">
                <i />
                {t('Работает офлайн', 'Offline ready', 'Офлайн дайын')}
              </span>
              <div className="languages" aria-label="Language">
                {(['ru', 'kk', 'en'] as Lang[]).map((l) => (
                  <button key={l} className={lang === l ? 'active' : ''} onClick={() => setLang(l)}>
                    {l === 'kk' ? 'ҚАЗ' : l.toUpperCase()}
                  </button>
                ))}
              </div>
              <button
                className="icon-button"
                aria-label={t('Как играть', 'How to play', 'Қалай ойнау керек')}
                onClick={() => setHelp(true)}
              >
                <CircleHelp size={20} />
              </button>
            </div>
          </header>
          <main>
            <section className="page-heading">
              <div>
                <div className="eyebrow">
                  <span />
                  ASTANA ·{' '}
                  {t(
                    'СИМУЛЯТОР ГОРОДСКИХ РЕШЕНИЙ',
                    'CITY DECISION SIMULATOR',
                    'ҚАЛАЛЫҚ ШЕШІМДЕР СИМУЛЯТОРЫ',
                  )}
                </div>
                <h1>
                  {view === 'report'
                    ? t(
                        'Каким станет ваш город?',
                        'What will your city become?',
                        'Қалаңыз қандай болады?',
                      )
                    : t(
                        'У каждого города — свой путь.',
                        'Every city has a different story.',
                        'Әр қаланың өз жолы бар.',
                      )}
                </h1>
                <p>
                  {t(
                    'Вы — аким Астаны. Вложите бюджет в то, что действительно меняет жизнь.',
                    'You are the mayor of Astana. Invest in what makes everyday life better.',
                    'Сіз — Астана әкімісіз. Бюджетті өмірді жақсартатын істерге жұмсаңыз.',
                  )}
                </p>
              </div>
              <button className="text-button" onClick={() => setResetConfirm(true)}>
                <RotateCcw size={15} />
                {t('Начать заново', 'Start again', 'Қайта бастау')}
              </button>
            </section>
            <section className="command-bar">
              <div className="turn-info">
                <span className="round-icon">
                  <Clock3 size={19} />
                </span>
                <div>
                  <small>{t('ВАШ СРОК', 'YOUR TERM', 'СІЗДІҢ МЕРЗІМІҢІЗ')}</small>
                  <strong>
                    {complete
                      ? t('Пять решений приняты', 'Five decisions made', 'Бес шешім қабылданды')
                      : t(
                          `Решение ${decisions.length + 1} из 5`,
                          `Decision ${decisions.length + 1} of 5`,
                          `${decisions.length + 1} / 5 шешім`,
                        )}
                  </strong>
                </div>
                <div className="turn-dots">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className={
                        i < decisions.length ? 'done' : i === decisions.length ? 'current' : ''
                      }
                    >
                      {i < decisions.length ? <Check size={14} /> : i + 1}
                    </span>
                  ))}
                </div>
              </div>
              <div className="budget-stat">
                <Wallet size={21} />
                <div>
                  <small>{t('ОСТАЛОСЬ БЮДЖЕТА', 'BUDGET REMAINING', 'ҚАЛҒАН БЮДЖЕТ')}</small>
                  <strong data-testid="budget">
                    {100 - result.cost}
                    <span> / 100</span>
                  </strong>
                </div>
                <div className="budget-meter">
                  <i style={{ width: `${100 - result.cost}%` }} />
                </div>
              </div>
              <div className="score-stat">
                <span className="round-icon">
                  <Sparkles size={20} />
                </span>
                <div>
                  <small>
                    {complete
                      ? 'ASTANA QUALITY OF LIFE'
                      : t(
                          'ПРОГНОЗ КАЧЕСТВА ЖИЗНИ',
                          'QUALITY OF LIFE FORECAST',
                          'ӨМІР САПАСЫНЫҢ БОЛЖАМЫ',
                        )}
                  </small>
                  <strong data-testid="score">
                    {format(result.score)}
                    <span> / 100</span>
                  </strong>
                </div>
                <b className="gain">
                  {signed(result.score - BASELINE.score)}
                  <ArrowUpRight size={14} />
                </b>
              </div>
            </section>
            {storageWarning && (
              <p className="warning" role="status">
                {t(
                  'Хранилище браузера недоступно. Экспортируйте результат перед закрытием.',
                  'Browser storage is unavailable. Export your result before closing.',
                  'Браузер жады қолжетімсіз. Жабар алдында нәтижені экспорттаңыз.',
                )}
              </p>
            )}
            {view === 'report' && (
              <section className="report">
                <div className="report-hero">
                  <div>
                    <span className="eyebrow">
                      {complete
                        ? t(
                            'ВАШ ГОРОД ЧЕРЕЗ ДВА ГОДА',
                            'YOUR CITY, TWO YEARS LATER',
                            'ЕКІ ЖЫЛДАН КЕЙІНГІ ҚАЛАҢЫЗ',
                          )
                        : t('ПРОМЕЖУТОЧНЫЙ ПРОГНОЗ', 'INTERIM FORECAST', 'АРАЛЫҚ БОЛЖАМ')}
                    </span>
                    <h2>
                      {complete
                        ? t(
                            'Город стал лучше. Благодаря вам.',
                            'A better city starts with you.',
                            'Жақсы қала сізден басталады.',
                          )
                        : t(
                            'Будущее ещё в ваших руках.',
                            'The future is still in your hands.',
                            'Болашақ әлі сіздің қолыңызда.',
                          )}
                    </h2>
                    <div className="big-score">
                      {format(result.score)}
                      <span>
                        {signed(result.score - BASELINE.score)}{' '}
                        {t('к началу', 'vs. baseline', 'бастапқыға')}
                      </span>
                    </div>
                    <p>
                      {complete
                        ? t(
                            'Astana Quality of Life Score · итоговый результат',
                            'Astana Quality of Life Score · final result',
                            'Astana Quality of Life Score · соңғы нәтиже',
                          )
                        : t(
                            'Это прогноз, не итоговый балл. Примите все пять решений.',
                            'This is a forecast, not a final score. Complete all five decisions.',
                            'Бұл соңғы балл емес, болжам. Бес шешімді аяқтаңыз.',
                          )}
                    </p>
                    <div className="report-actions">
                      {complete ? (
                        <>
                          <button className="primary" onClick={saveRun}>
                            <Trophy size={17} />
                            {t('Сохранить сценарий', 'Save scenario', 'Сценарийді сақтау')}
                          </button>
                          <button className="secondary" onClick={exportRun}>
                            <Download size={17} />
                            {t('Экспорт JSON', 'Export JSON', 'JSON экспорттау')}
                          </button>
                        </>
                      ) : (
                        <button className="primary" onClick={() => setView('city')}>
                          {t('Вернуться к городу', 'Back to my city', 'Қалаға оралу')}
                          <ArrowRight size={17} />
                        </button>
                      )}
                    </div>
                  </div>
                  <img
                    src={keyArt}
                    alt={t(
                      'Миниатюрная Астана с Байтереком и рекой',
                      'Miniature Astana with Baiterek and the river',
                      'Бәйтерек пен өзені бар шағын Астана',
                    )}
                  />
                </div>
                <div className="report-stats">
                  <article>
                    <small>
                      {t('ГОРОД В ЦЕЛОМ · 70%', 'CITY AVERAGE · 70%', 'ЖАЛПЫ ҚАЛА · 70%')}
                    </small>
                    <strong>{format(result.average)}</strong>
                    <p>
                      {t(
                        'С учётом доли населения каждого района',
                        'Weighted by each district’s population share',
                        'Әр аудан халқының үлесі ескерілген',
                      )}
                    </p>
                  </article>
                  <article>
                    <small>
                      {t('СЛАБЕЙШИЙ РАЙОН · 30%', 'WEAKEST DISTRICT · 30%', 'ЕҢ ӘЛСІЗ АУДАН · 30%')}
                    </small>
                    <strong>{format(result.districtScores[result.weakest])}</strong>
                    <p>
                      {districtName(result.weakest)} ·{' '}
                      {t(
                        'Никого не оставляем позади',
                        'Leave no neighborhood behind',
                        'Ешбір аудан назардан тыс қалмайды',
                      )}
                    </p>
                  </article>
                  <article>
                    <small>
                      {t('КРИТИЧЕСКИЕ ПОКАЗАТЕЛИ', 'CRITICAL INDICATORS', 'СЫНДАРЛЫ КӨРСЕТКІШТЕР')}
                    </small>
                    <strong>
                      {result.critical.length}
                      <span>
                        {' '}
                        / {BASELINE.critical.length} {t('в начале', 'at start', 'бастапқыда')}
                      </span>
                    </strong>
                    <p>
                      {t(
                        '−1 балл за каждый показатель ниже 40',
                        '−1 point for each indicator below 40',
                        '40-тан төмен әр көрсеткішке −1 балл',
                      )}
                    </p>
                  </article>
                </div>
                <div className="report-columns">
                  <section className="report-panel">
                    <h2>
                      {t('Изменения в районах', 'Neighborhood impact', 'Аудандардағы өзгерістер')}
                    </h2>
                    {DISTRICTS.map((d) => (
                      <div className="district-result" key={d.id}>
                        <div>
                          <b>{d.name[lang]}</b>
                          <small>
                            {Math.round(d.pop * 100)}% {t('населения', 'of residents', 'тұрғын')}
                          </small>
                        </div>
                        <div className="comparison-bar">
                          <span style={{ width: `${result.districtScores[d.id]}%` }} />
                          <i style={{ left: `${BASELINE.districtScores[d.id]}%` }} />
                        </div>
                        <span>
                          {format(result.districtScores[d.id])}
                          <b>
                            {signed(result.districtScores[d.id] - BASELINE.districtScores[d.id])}
                          </b>
                        </span>
                      </div>
                    ))}
                    <small>
                      {t(
                        'Вертикальная отметка — до ваших решений',
                        'Vertical mark = before your decisions',
                        'Тік белгі — шешімдеріңізге дейін',
                      )}
                    </small>
                  </section>
                  <section className="report-panel explanation">
                    <h2>
                      <Sparkles size={21} />
                      {t(
                        'Почему такой результат?',
                        'What is behind your score?',
                        'Нәтиже неге осындай?',
                      )}
                    </h2>
                    <span className="tiny-tag">
                      {t(
                        'ПРОВЕРЯЕМЫЙ ЛОКАЛЬНЫЙ РАЗБОР',
                        'VERIFIABLE LOCAL EXPLANATION',
                        'ТЕКСЕРІЛЕТІН ЖЕРГІЛІКТІ ТАЛДАУ',
                      )}
                    </span>
                    <p>{localAdvice}</p>
                    <p>
                      {t(
                        `Вы вложили ${result.cost} из 100. Средний балл города изменился на ${signed(result.average - BASELINE.average)}.`,
                        `You invested ${result.cost} of 100. The city average changed by ${signed(result.average - BASELINE.average)}.`,
                        `Сіз 100-ден ${result.cost} жұмсадыңыз. Қаланың орташа балы ${signed(result.average - BASELINE.average)} өзгерді.`,
                      )}
                    </p>
                    <p>
                      {t(
                        'Эффект строительства не мгновенный: чем больше задержка, тем меньшая доля пользы реализуется за два года.',
                        'Construction takes time: longer delays mean a smaller share of the benefit arrives within two years.',
                        'Құрылыс уақыт алады: кідіріс ұзақ болса, екі жылда пайданың аз бөлігі іске асады.',
                      )}
                    </p>
                    {result.synergies.map((s) => (
                      <div className="synergy-unlocked" key={s.pair[0]}>
                        <Zap size={16} />
                        {s.name[lang]} · {s.indicator} +{s.bonus}
                      </div>
                    ))}
                    {result.critical.map((c) => (
                      <div className="critical-item" key={c.districtId + c.indicator}>
                        <AlertTriangle size={14} />
                        {districtName(c.districtId)} · {INDICATORS[c.indicator][lang]}: {c.value}
                      </div>
                    ))}
                    {location.protocol !== 'file:' && (
                      <button className="secondary" disabled={aiBusy} onClick={askAI}>
                        <Sparkles size={16} />
                        {aiBusy
                          ? t('Анализируем…', 'Analyzing…', 'Талдау…')
                          : t(
                              'Запросить LLM-разбор',
                              'Request LLM explanation',
                              'LLM талдауын сұрау',
                            )}
                      </button>
                    )}
                    {aiText && (
                      <p className="ai-text" role="status">
                        {aiText}
                      </p>
                    )}
                  </section>
                </div>
                <section className="report-panel">
                  <h2>
                    {t('Что дала каждая мера', 'What each policy contributed', 'Әр шараның үлесі')}
                  </h2>
                  <p className="muted">
                    {t(
                      'Вклад = разница Score с мерой и без неё. Эти вклады не суммируются: синергии и штрафы нелинейны.',
                      'Contribution = score with the policy minus score without it. Contributions are not additive: synergies and penalties interact.',
                      'Үлес = шарамен және шарасыз балл айырмасы. Синергия мен айыптар әсерлесетіндіктен, үлестер қосылмайды.',
                    )}
                  </p>
                  <div className="contribution-list">
                    {contributions(decisions).map(({ decision: d, gain }) => (
                      <div key={d.measureId}>
                        <span>
                          <b>{MEASURES.find((m) => m.id === d.measureId)!.name[lang]}</b>
                          <small>
                            {d.districtId
                              ? districtName(d.districtId)
                              : t('Весь город', 'Citywide', 'Бүкіл қала')}
                          </small>
                        </span>
                        <strong className={gain < 0 ? 'negative' : 'positive'}>
                          {signed(gain)}
                        </strong>
                      </div>
                    ))}
                  </div>
                </section>
                <details className="report-panel methodology">
                  <summary>
                    {t(
                      'Открытая математика и все показатели',
                      'Open math & all indicators',
                      'Ашық математика және барлық көрсеткіштер',
                    )}
                    <ChevronDown size={18} />
                  </summary>
                  <p>
                    Score = 0.7 × {format(result.average)} + 0.3 ×{' '}
                    {format(result.districtScores[result.weakest])} − {result.critical.length} ={' '}
                    <b>{format(result.score)}</b>
                  </p>
                  <p>
                    {t(
                      'Каждый эффект × (8 − лаг) / 8. Синергии +2 без задержки. Ограничение показателей: 0–100. Порядок решений не влияет на результат.',
                      'Each effect × (8 − lag) / 8. Synergies add 2 without delay scaling. Indicators are clamped to 0–100. Decision order does not change the result.',
                      'Әр әсер × (8 − кідіріс) / 8. Синергия кідіріссіз +2 қосады. Көрсеткіштер 0–100 аралығында. Шешімдер реті нәтижеге әсер етпейді.',
                    )}
                  </p>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>{t('Показатель', 'Indicator', 'Көрсеткіш')}</th>
                          <th>{t('Вес', 'Weight', 'Салмақ')}</th>
                          {DISTRICTS.map((d) => (
                            <th key={d.id}>{d.name[lang]}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {KEYS.map((k) => (
                          <tr key={k}>
                            <th>
                              {k} · {INDICATORS[k][lang]}
                            </th>
                            <td>{WEIGHTS[k]}</td>
                            {DISTRICTS.map((d) => (
                              <td
                                key={d.id}
                                className={result.metrics[d.id][k] < 40 ? 'negative' : ''}
                              >
                                {format(result.metrics[d.id][k])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </section>
            )}
            {view === 'archive' && (
              <section className="archive">
                <div className="archive-intro">
                  <Trophy size={28} />
                  <h2>
                    {t(
                      'Сравнивайте идеи, а не обещания.',
                      'Compare ideas, not promises.',
                      'Уәделерді емес, идеяларды салыстырыңыз.',
                    )}
                  </h2>
                  <p>
                    {t(
                      'Сохранённые партии остаются только в этом браузере. Одинаковый старт делает сравнение честным.',
                      'Saved runs stay in this browser. Every run starts from the same baseline for a fair comparison.',
                      'Сақталған ойындар осы браузерде қалады. Бірдей бастапқы жағдай салыстыруды әділ етеді.',
                    )}
                  </p>
                </div>
                {runs.length === 0 ? (
                  <div className="empty-state">
                    <Building2 size={40} />
                    <h3>
                      {t(
                        'История города ещё впереди',
                        'Your city’s story is just beginning',
                        'Қаланың тарихы әлі алда',
                      )}
                    </h3>
                    <p>
                      {t(
                        'Примите пять решений и сохраните результат.',
                        'Make five decisions and save your result.',
                        'Бес шешім қабылдап, нәтижені сақтаңыз.',
                      )}
                    </p>
                    <button className="primary" onClick={() => setView('city')}>
                      {t('К моему городу', 'Go to my city', 'Қалама өту')}
                      <ArrowRight size={17} />
                    </button>
                  </div>
                ) : (
                  <div className="run-grid">
                    {runs.map((run, index) => {
                      const r = simulate(run.decisions);
                      return (
                        <article className="report-panel" key={run.id}>
                          <span className="eyebrow">
                            {t('СЦЕНАРИЙ', 'SCENARIO', 'СЦЕНАРИЙ')} {runs.length - index}
                          </span>
                          <h3>
                            {format(r.score)}{' '}
                            <span className="positive">{signed(r.score - BASELINE.score)}</span>
                          </h3>
                          <p>
                            {t('Бюджет', 'Budget', 'Бюджет')}: {r.cost}/100 ·{' '}
                            {t('Критических', 'Critical', 'Сындарлы')}: {r.critical.length}
                          </p>
                          <ul>
                            {run.decisions.map((d) => (
                              <li key={d.measureId}>
                                {MEASURES.find((m) => m.id === d.measureId)!.name[lang]} ·{' '}
                                {d.districtId
                                  ? districtName(d.districtId)
                                  : t('город', 'city', 'қала')}
                              </li>
                            ))}
                          </ul>
                          <small>
                            {new Date(run.date).toLocaleString(lang === 'kk' ? 'kk-KZ' : lang)}
                          </small>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
            <footer>
              <span>
                <b>QALA</b> ·{' '}
                {t('Город — это люди.', 'A city is its people.', 'Қала — бұл адамдар.')}
              </span>
              <span>SAUCE CODE / HACKALEM AI 2026</span>
              <button onClick={() => setHelp(true)}>
                {t('Правила и модель', 'Rules & model', 'Ережелер мен модель')}
                <ArrowUpRight size={13} />
              </button>
            </footer>
          </main>
        </>
      )}
      <dialog ref={helpRef} onCancel={() => setHelp(false)} className="help-dialog">
        <button className="close-button" aria-label="Close" onClick={() => setHelp(false)}>
          <X size={20} />
        </button>
        <img src={keyArt} alt="Astana miniature city" />
        <span className="eyebrow">
          QALA / {t('АКИМ НА 5 ЧАСОВ', 'MAYOR FOR 5 HOURS', '5 САҒАТҚА ӘКІМ')}
        </span>
        <h2>
          {t(
            'Ваш город. Ваши решения.',
            'Your city. Your call.',
            'Сіздің қалаңыз. Сіздің шешіміңіз.',
          )}
        </h2>
        <ol>
          <li>
            {t(
              'Изучите пять районов. У каждого свои сильные стороны и потребности.',
              'Explore five districts, each with different strengths and needs.',
              'Әрқайсысының қажеттілігі әртүрлі бес ауданды зерттеңіз.',
            )}
          </li>
          <li>
            {t(
              'Примите ровно 5 разных мер в пределах 100 единиц бюджета. Не больше 2 мер на направление.',
              'Adopt exactly 5 different policies within 100 budget. At most 2 per category.',
              '100 бюджет шегінде дәл 5 түрлі шара қабылдаңыз. Бір бағытта ең көбі 2 шара.',
            )}
          </li>
          <li>
            {t(
              'Оценивайте эффект перед выбором. Ищите синергии и следите за конфликтами.',
              'Preview each choice. Discover synergies and watch for conflicts.',
              'Әр таңдауды алдын ала бағалаңыз. Синергиялар мен қайшылықтарды ескеріңіз.',
            )}
          </li>
          <li>
            {t(
              'Получите итог, сохраните сценарий и попробуйте другой путь.',
              'See the result, save your scenario, then try another approach.',
              'Нәтижені көріңіз, сценарийді сақтап, басқа жолды таңдаңыз.',
            )}
          </li>
        </ol>
        <p className="muted">
          {t(
            'Все показатели: 0–100, больше — лучше. Данные синтетические. Карта схематичная. Это учебная модель, не прогноз реальной Астаны. Советник офлайн использует правила; LLM-разбор подключается отдельно.',
            'All indicators: 0–100, higher is better. Synthetic data, illustrative map. An educational model, not a forecast of real Astana. The offline advisor uses rules; LLM narration is optional.',
            'Барлық көрсеткіштер: 0–100, жоғарысы жақсырақ. Деректер синтетикалық, карта сызбалық. Бұл нақты Астана болжамы емес, оқу моделі. Офлайн кеңесші ережелерді қолданады; LLM бөлек қосылады.',
          )}
        </p>
        <button className="primary" onClick={() => setHelp(false)}>
          {t('Город ждёт вас', 'Your city is waiting', 'Қала сізді күтуде')}
          <ArrowRight size={17} />
        </button>
      </dialog>
      <dialog ref={resetRef} onCancel={() => setResetConfirm(false)} className="reset-dialog">
        <h2>{t('Начать новую историю?', 'Start a new story?', 'Жаңа тарих бастаймыз ба?')}</h2>
        <p>
          {t(
            'Текущие решения будут сброшены. Сохранённые сценарии останутся.',
            'Your current decisions will reset. Saved scenarios will remain.',
            'Қазіргі шешімдер жойылады. Сақталған сценарийлер қалады.',
          )}
        </p>
        <div className="report-actions">
          <button className="secondary" onClick={() => setResetConfirm(false)}>
            {t('Продолжить игру', 'Keep playing', 'Ойынды жалғастыру')}
          </button>
          <button className="primary" onClick={reset}>
            {t('Новая игра', 'New game', 'Жаңа ойын')}
          </button>
        </div>
      </dialog>
      {toast && (
        <div className="toast" role="status">
          <CircleCheck size={18} />
          {toast}
        </div>
      )}
    </>
  );
}
