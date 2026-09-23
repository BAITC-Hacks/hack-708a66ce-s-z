import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bus,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  HeartPulse,
  Leaf,
  MapPin,
  Moon,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sun,
  Trophy,
  Undo2,
  Volume2,
  VolumeX,
  Waves,
  X,
  HelpCircle,
  Landmark,
} from 'lucide-react';
import {
  CATEGORIES,
  DISTRICTS,
  INDICATORS,
  MEASURES,
  WEIGHTS,
  type Category,
  type DistrictId,
  type Lang,
  type Measure,
} from '../game/data';
import { BASELINE, type Decision, type Result } from '../game/engine';
import { HANDBOOK } from '../game/handbook';
import { PhaserCity } from './PhaserCity';
import art from '../assets/astana-key-art.png';
import advisor from '../assets/advisor-aida.png';
const ICONS = {
  transport: Bus,
  ecology: Leaf,
  social: HeartPulse,
  safety: ShieldCheck,
  services: Waves,
};
interface Props {
  selected: DistrictId;
  onSelect: (id: DistrictId) => void;
  result: Result;
  decisions: Decision[];
  lang: Lang;
  onLang: (l: Lang) => void;
  onPolicy: (m: Measure) => void;
  onUndo: () => void;
  onReport: () => void;
  onArchive: () => void;
  onSuggest: () => void;
  onHelp: () => void;
  onReset: () => void;
}
export function GameStage(p: Props) {
  const { selected, onSelect, result, decisions, lang, onLang, onPolicy } = p;
  const t = (ru: string, en: string, kk: string) => ({ ru, en, kk })[lang];
  const [intro, setIntro] = useState(() => {
      try {
        return localStorage.getItem('qala-intro-v2') !== 'done';
      } catch {
        return true;
      }
    }),
    [briefing, setBriefing] = useState(false),
    [guide, setGuide] = useState(false),
    [book, setBook] = useState(false),
    [tip, setTip] = useState(0),
    [filter, setFilter] = useState<Category | 'all'>('all'),
    [night, setNight] = useState(false),
    [paused, setPaused] = useState(false),
    [sound, setSound] = useState(false),
    [collapsed, setCollapsed] = useState(false);
  const hand = useRef<HTMLDivElement>(null),
    introDialog = useRef<HTMLDialogElement>(null),
    bookDialog = useRef<HTMLDialogElement>(null),
    audio = useRef<AudioContext | null>(null),
    previous = useRef(decisions.length);
  const district = DISTRICTS.find((d) => d.id === selected)!;
  const complete = decisions.length === 5;
  const enter = (guided: boolean) => {
    setIntro(false);
    setGuide(guided);
    try {
      localStorage.setItem('qala-intro-v2', 'done');
    } catch {}
  };
  useEffect(() => {
    if (intro) introDialog.current?.showModal();
    else introDialog.current?.close();
  }, [intro]);
  useEffect(() => {
    if (book) bookDialog.current?.showModal();
    else bookDialog.current?.close();
  }, [book]);
  useEffect(() => {
    if (decisions.length > previous.current && sound) {
      const ctx = audio.current;
      if (ctx) {
        [523.25, 659.25, 783.99].forEach((f, i) => {
          const oscillator = ctx.createOscillator(),
            gain = ctx.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.value = f;
          gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.07);
          gain.gain.linearRampToValueAtTime(0.035, ctx.currentTime + i * 0.07 + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.07 + 0.45);
          oscillator.connect(gain).connect(ctx.destination);
          oscillator.start(ctx.currentTime + i * 0.07);
          oscillator.stop(ctx.currentTime + i * 0.07 + 0.5);
        });
      }
    }
    previous.current = decisions.length;
    if (decisions.length > 0) setGuide(false);
  }, [decisions.length, sound]);
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    [],
  );
  const toggleSound = () => {
    if (!sound) {
      audio.current ??= new AudioContext();
      void audio.current.resume();
    }
    setSound(!sound);
  };
  const ordering = [
    'M7',
    'M1',
    'M4',
    'M10',
    'M12',
    'M8',
    'M9',
    'M2',
    'M5',
    'M6',
    'M11',
    'M14',
    'M3',
    'M13',
  ];
  const policies = ordering
    .map((id) => MEASURES.find((m) => m.id === id)!)
    .filter((m) => filter === 'all' || m.category === filter);
  const openTip = (measure?: string) => {
    const index = measure ? HANDBOOK.findIndex((t) => t.measures.includes(measure)) : 0;
    setTip(Math.max(0, index));
    setBook(true);
  };
  return (
    <div className={`game-stage ${night ? 'night' : 'day'}`}>
      <PhaserCity
        selected={selected}
        onSelect={onSelect}
        result={result}
        decisions={decisions}
        lang={lang}
        night={night}
        paused={paused || intro}
      />
      <div className="game-hud" inert={intro || undefined} aria-hidden={intro || undefined}>
        <header className="game-top">
          <button
            className="game-brand"
            onClick={() => {
              setBriefing(false);
              setIntro(true);
            }}
            aria-label="QALA home"
          >
            <Landmark size={26} />
            <span>
              QALA<small>{t('Аким на 5 часов', 'Mayor for 5 hours', '5 сағатқа әкім')}</small>
            </span>
          </button>
          <div className="term-progress">
            <span>
              {complete
                ? t('Срок завершён', 'Term complete', 'Мерзім аяқталды')
                : t(
                    `Решение ${decisions.length + 1} из 5`,
                    `Decision ${decisions.length + 1} of 5`,
                    `${decisions.length + 1} / 5 шешім`,
                  )}
            </span>
            <div>
              {[0, 1, 2, 3, 4].map((i) => (
                <i
                  className={
                    i < decisions.length ? 'done' : i === decisions.length ? 'current' : ''
                  }
                  key={i}
                >
                  {i < decisions.length ? <Check size={13} /> : i + 1}
                </i>
              ))}
            </div>
          </div>
          <div className="hud-resource">
            <span>{t('Бюджет', 'Budget', 'Бюджет')}</span>
            <strong data-testid="budget">
              {100 - result.cost}
              <small> / 100</small>
            </strong>
          </div>
          <div className="hud-resource score">
            <span>
              {complete
                ? 'Quality of Life'
                : t('Прогноз качества жизни', 'Quality of Life forecast', 'Өмір сапасы болжамы')}
            </span>
            <strong data-testid="score">
              {result.score.toFixed(2)}
              <small className="score-gain">+{(result.score - BASELINE.score).toFixed(2)}</small>
            </strong>
          </div>
          <div className="hud-languages">
            {(['ru', 'kk', 'en'] as Lang[]).map((l) => (
              <button key={l} className={l === lang ? 'active' : ''} onClick={() => onLang(l)}>
                {l === 'kk' ? 'ҚАЗ' : l.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            className="hud-icon"
            aria-label={t('Как играть', 'How to play', 'Қалай ойнау керек')}
            onClick={p.onHelp}
          >
            <HelpCircle size={20} />
          </button>
        </header>
        <nav className="game-rail" aria-label={t('Меню города', 'City menu', 'Қала мәзірі')}>
          <button
            className="active"
            onClick={() => setCollapsed(!collapsed)}
            title={t('Районы', 'Districts', 'Аудандар')}
          >
            <MapPin size={21} />
          </button>
          <button
            onClick={() => openTip()}
            title={t('Книга мэра', 'Mayor’s handbook', 'Әкім кітабы')}
            aria-label={t('Книга мэра', 'Mayor’s handbook', 'Әкім кітабы')}
          >
            <BookOpen size={21} />
          </button>
          <button
            onClick={p.onReport}
            title={t('Результаты', 'Results', 'Нәтижелер')}
            aria-label={t('Результаты', 'Results', 'Нәтижелер')}
          >
            <Trophy size={21} />
          </button>
          <button
            onClick={p.onHelp}
            aria-label={t('Как играть', 'How to play', 'Қалай ойнау керек')}
            className="rail-help"
          >
            <HelpCircle size={18} />
          </button>
          <span />
          <button
            onClick={() => setNight(!night)}
            aria-label={
              night
                ? t('Дневной режим', 'Day mode', 'Күндізгі режим')
                : t('Вечерний режим', 'Night mode', 'Түнгі режим')
            }
          >
            {night ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={() => setPaused(!paused)}
            aria-label={
              paused
                ? t('Оживить город', 'Resume city', 'Қозғалысты жалғастыру')
                : t('Остановить движение', 'Pause city', 'Қозғалысты тоқтату')
            }
          >
            {paused ? <Play size={19} /> : <Pause size={19} />}
          </button>
          <button
            onClick={toggleSound}
            aria-label={
              sound
                ? t('Выключить звук', 'Mute sound', 'Дыбысты өшіру')
                : t('Включить звук', 'Enable sound', 'Дыбысты қосу')
            }
          >
            {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </button>
          <button
            onClick={p.onReset}
            aria-label={t('Начать заново', 'Start again', 'Қайта бастау')}
            title={t('Начать заново', 'Start again', 'Қайта бастау')}
          >
            <RotateCcw size={18} />
          </button>
        </nav>
        <aside className={`district-dossier ${collapsed ? 'collapsed' : ''}`}>
          <div className="dossier-heading">
            <div>
              <span>
                {t('В фокусе', 'In focus', 'Назарда')}{' '}
                <i>
                  {Math.round(district.pop * 100)}% {t('жителей', 'of residents', 'тұрғын')}
                </i>
              </span>
              <select
                aria-label={t('Выбрать район', 'Select district', 'Ауданды таңдау')}
                value={selected}
                onChange={(e) => onSelect(e.target.value as DistrictId)}
              >
                {DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name[lang]}
                  </option>
                ))}
              </select>
            </div>
            <b>{result.districtScores[selected].toFixed(1)}</b>
          </div>
          {!collapsed && (
            <>
              <p>{district.profile[lang]}</p>
              <div className="dossier-metrics">
                {Object.entries(CATEGORIES).map(([key, cat]) => {
                  const Icon = ICONS[key as Category],
                    value =
                      cat.keys.reduce((s, k) => s + result.metrics[selected][k] * WEIGHTS[k], 0) /
                      cat.keys.reduce((s, k) => s + WEIGHTS[k], 0);
                  return (
                    <div key={key}>
                      <Icon size={15} />
                      <span>{cat.name[lang]}</span>
                      <b className={value < 40 ? 'at-risk' : ''}>{value.toFixed(0)}</b>
                      <i>
                        <em style={{ transform: `scaleX(${value / 100})` }} />
                      </i>
                    </div>
                  );
                })}
              </div>
              <div className="dossier-needs">
                {result.critical.filter((c) => c.districtId === selected).length > 0 ? (
                  <>
                    <span className="care-indicator" />
                    {t('Нужна поддержка', 'Needs your attention', 'Қолдау қажет')}
                  </>
                ) : (
                  <>
                    <Check size={13} />
                    {t('Без критических проблем', 'No critical indicators', 'Сындарлы мәселе жоқ')}
                  </>
                )}
              </div>
              {!complete && (
                <button className="advisor-suggest" onClick={p.onSuggest}>
                  <img src={advisor} alt="" />
                  <span>
                    {t('Совет Айды', 'Ask Aida', 'Айдадан кеңес')}
                    <small>
                      {t(
                        'Подобрать следующий ход',
                        'Suggest a legal next move',
                        'Келесі қадамды таңдау',
                      )}
                    </small>
                  </span>
                  <ArrowUpRight size={15} />
                </button>
              )}
              <button
                className="dossier-cta"
                onClick={() =>
                  setFilter(
                    selected === 'nura' ? 'social' : selected === 'saryarka' ? 'ecology' : 'all',
                  )
                }
              >
                {t('Помочь району', 'Help this district', 'Ауданға көмектесу')}
                <ArrowRight size={15} />
              </button>
            </>
          )}
        </aside>
        <div className="mayor-mission">
          <span>{t('Ваша задача', 'Your mission', 'Сіздің міндетіңіз')}</span>
          <strong>
            {t(
              'Город, в котором хорошо всем.',
              'A better city. For everyone.',
              'Барлығына жайлы қала.',
            )}
          </strong>
          <small>
            {t(
              'Уберите критические показатели, не забывая о других районах.',
              'Resolve critical needs while caring for every district.',
              'Барлық ауданды ескеріп, сындарлы мәселелерді шешіңіз.',
            )}
          </small>
          <div>
            <i className={result.critical.length === 0 ? 'achieved' : ''}>
              {result.critical.length === 0 ? <Check size={13} /> : result.critical.length}
            </i>
            {t('показателей ниже 40', 'indicators below 40', 'көрсеткіш 40-тан төмен')}
          </div>
        </div>
        {guide && (
          <div className="first-move-guide">
            <img
              src={advisor}
              alt={t(
                'Айда, вымышленный советник',
                'Aida, fictional advisor',
                'Айда, ойдан шығарылған кеңесші',
              )}
            />
            <div>
              <b>{t('Начнём с Нуры?', 'Let’s start with Nura.', 'Нұрадан бастайық.')}</b>
              <p>
                {t(
                  'Здесь нужны школы и медицина. Откройте карточку и посмотрите, что изменится.',
                  'Schools and healthcare need attention. Open a card and preview what changes.',
                  'Мұнда мектеп пен медицина қажет. Картаны ашып, өзгерістерді қараңыз.',
                )}
              </p>
              <button onClick={() => setGuide(false)}>
                {t('Понятно', 'Got it', 'Түсінікті')}
                <Check size={13} />
              </button>
            </div>
          </div>
        )}
        <section className={`policy-hand ${complete ? 'term-finished' : ''}`}>
          <div className="hand-toolbar">
            <div className="hand-title">
              <span>{t('Ваш следующий ход', 'Your next move', 'Келесі қадамыңыз')}</span>
              <h2>
                {complete
                  ? t(
                      'Пять решений. Одна история.',
                      'Five decisions. One story.',
                      'Бес шешім. Бір тарих.',
                    )
                  : t('Что изменим сегодня?', 'What changes today?', 'Бүгін нені өзгертеміз?')}
              </h2>
            </div>
            <div className="hand-categories">
              <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
                {t('Все', 'All', 'Бәрі')}
              </button>
              {Object.entries(CATEGORIES).map(([id, cat]) => {
                const Icon = ICONS[id as Category];
                return (
                  <button
                    key={id}
                    className={filter === id ? 'active' : ''}
                    onClick={() => setFilter(id as Category)}
                    title={cat.name[lang]}
                    aria-label={cat.name[lang]}
                  >
                    <Icon size={17} />
                    <span>{cat.name[lang]}</span>
                  </button>
                );
              })}
            </div>
            <div className="hand-controls">
              {decisions.length > 0 && (
                <button
                  aria-label={t(
                    'Отменить последний ход',
                    'Undo last decision',
                    'Соңғы шешімді қайтару',
                  )}
                  onClick={p.onUndo}
                >
                  <Undo2 size={17} />
                </button>
              )}
              <button
                aria-label={t('Предыдущие карточки', 'Previous policies', 'Алдыңғы карталар')}
                onClick={() => hand.current?.scrollBy({ left: -480, behavior: 'smooth' })}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                aria-label={t('Следующие карточки', 'Next policies', 'Келесі карталар')}
                onClick={() => hand.current?.scrollBy({ left: 480, behavior: 'smooth' })}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          {complete ? (
            <div className="complete-hand">
              <Trophy size={34} />
              <div>
                <b>{result.score.toFixed(2)} Quality of Life</b>
                <p>
                  {t(
                    'Посмотрите, как ваши решения изменили город.',
                    'Discover how your decisions shaped the city.',
                    'Шешімдеріңіз қаланы қалай өзгерткенін көріңіз.',
                  )}
                </p>
              </div>
              <button onClick={p.onReport}>
                {t('Итоги срока', 'Your term in review', 'Мерзім қорытындысы')}
                <ArrowRight size={17} />
              </button>
            </div>
          ) : (
            <div className="hand-scroll" ref={hand}>
              {policies.map((m, index) => {
                const Icon = ICONS[m.category],
                  taken = decisions.some((d) => d.measureId === m.id);
                return (
                  <article
                    className={`game-card card-${m.category} ${taken ? 'is-built' : ''}`}
                    key={m.id}
                  >
                    <button
                      className="card-help"
                      aria-label={`${t('Совет', 'Tip', 'Кеңес')}: ${m.name[lang]}`}
                      onClick={() => openTip(m.id)}
                    >
                      <BookOpen size={13} />
                    </button>
                    <button
                      data-testid={`policy-${m.id}`}
                      className="card-main"
                      disabled={taken}
                      onClick={() => onPolicy(m)}
                    >
                      <span className="card-cost">
                        {taken ? (
                          <Check size={17} />
                        ) : (
                          <>
                            {m.cost}
                            <i>◈</i>
                          </>
                        )}
                      </span>
                      <div className={`card-scene card-scene-${m.id}`}>
                        <div className="card-building" />
                        <Icon size={30} />
                      </div>
                      <span className="card-type">
                        {CATEGORIES[m.category].name[lang]}
                        <small>
                          {m.scope === 'city'
                            ? t('город', 'citywide', 'қала')
                            : district.name[lang]}
                        </small>
                      </span>
                      <h3>{m.name[lang]}</h3>
                      <div className="card-bottom">
                        <span>
                          <Clock3 size={11} />
                          {m.lag} {t('кв.', 'qtrs', 'тоқ.')}
                        </span>
                        <strong>
                          {taken
                            ? t('Принято', 'Adopted', 'Қабылданды')
                            : t('Рассмотреть', 'Explore', 'Қарастыру')}
                          <ArrowUpRight size={13} />
                        </strong>
                      </div>
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
        <div className="game-bottom">
          <button onClick={p.onArchive}>
            {t('Мои сценарии', 'My scenarios', 'Менің сценарийлерім')}
          </button>
          <span>
            {t(
              'Перетаскивайте карту. Колёсико меняет масштаб.',
              'Drag to explore. Scroll to zoom.',
              'Картаны жылжытыңыз. Дөңгелекпен үлкейтіңіз.',
            )}
          </span>
          <button onClick={() => openTip()}>
            <BookOpen size={12} />
            {t('Книга мэра', 'Mayor’s handbook', 'Әкім кітабы')}
          </button>
        </div>
      </div>
      <dialog ref={introDialog} className="mayor-intro" onCancel={() => enter(false)}>
        <div className="intro-art" style={{ backgroundImage: `url(${art})` }} />
        <div className="intro-shade" />
        <header>
          <strong>QALA</strong>
          <div>
            {(['ru', 'kk', 'en'] as Lang[]).map((l) => (
              <button className={lang === l ? 'active' : ''} key={l} onClick={() => onLang(l)}>
                {l === 'kk' ? 'ҚАЗ' : l.toUpperCase()}
              </button>
            ))}
          </div>
          <button onClick={() => enter(false)}>
            {t('Пропустить вступление', 'Skip briefing', 'Кіріспені өткізу')}
            <ArrowRight size={15} />
          </button>
        </header>
        {!briefing ? (
          <div className="intro-content">
            <span>
              {t(
                'Астана ждёт своего акима',
                'Astana is waiting for its mayor',
                'Астана өз әкімін күтуде',
              )}
            </span>
            <h1>
              {t(
                'Город живёт.\nТеперь ваш ход.',
                'A city alive.\nYour move.',
                'Қала өмір сүруде.\nКезек сізде.',
              )}
            </h1>
            <p>
              {t(
                'Сто единиц бюджета. Пять решений. Тысячи повседневных историй, которые вы можете изменить.',
                'One hundred budget. Five decisions. Everyday lives you can change for the better.',
                'Жүз бюджет бірлігі. Бес шешім. Сіз жақсарта алатын күнделікті өмір.',
              )}
            </p>
            <button
              className="take-office"
              onClick={() => (decisions.length ? enter(false) : setBriefing(true))}
            >
              {decisions.length
                ? t('Продолжить срок', 'Continue your term', 'Мерзімді жалғастыру')
                : t('Вступить в должность', 'Take office', 'Қызметке кірісу')}
              <ArrowRight size={20} />
            </button>
          </div>
        ) : (
          <div className="briefing-content">
            <div className="advisor-portrait">
              <img
                src={advisor}
                alt={t(
                  'Айда, городской советник',
                  'Aida, your city advisor',
                  'Айда, қала кеңесшісі',
                )}
              />
              <span>
                {t('Айда', 'Aida', 'Айда')}
                <small>{t('Ваш советник', 'Your advisor', 'Сіздің кеңесшіңіз')}</small>
              </span>
            </div>
            <div>
              <span className="briefing-kicker">
                {t('Добро пожаловать, аким.', 'Welcome, Mayor.', 'Қош келдіңіз, әкім.')}
              </span>
              <h2>
                {t(
                  'Сначала люди.\nПотом всё остальное.',
                  'People first.\nThe rest follows.',
                  'Алдымен адамдар.\nСодан кейін қалғаны.',
                )}
              </h2>
              <p>
                {t(
                  'Я помогу разобраться с городом. В Нуре не хватает школ и медицины, в Сарыарке ждут чистого воздуха. Всем сразу не помочь. Но можно выбрать, с чего начать.',
                  'I’ll help you get to know the city. Nura needs schools and healthcare. Saryarka needs cleaner air. You cannot do everything at once. You can choose where to begin.',
                  'Мен сізге қаланы танып білуге көмектесемін. Нұраға мектеп пен емхана, Сарыарқаға таза ауа қажет. Бәрін бірден жасай алмайсыз. Бірақ неден бастауға болатынын таңдай аласыз.',
                )}
              </p>
              <div className="briefing-rules">
                <div>
                  <b>100</b>
                  <span>{t('общий бюджет', 'total budget', 'жалпы бюджет')}</span>
                </div>
                <div>
                  <b>5</b>
                  <span>{t('ваших решений', 'your decisions', 'сіздің шешіміңіз')}</span>
                </div>
                <div>
                  <b>2</b>
                  <span>{t('года последствий', 'years of impact', 'жылдық әсер')}</span>
                </div>
              </div>
              <button className="take-office" onClick={() => enter(true)}>
                {t('Познакомиться с городом', 'Meet your city', 'Қаламен танысу')}
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}
        <footer>
          <span>SAUCE CODE</span>
          <span>HACKALEM AI 2026</span>
          <span>
            {t(
              'Синтетическая учебная модель',
              'A synthetic learning simulation',
              'Синтетикалық оқу моделі',
            )}
          </span>
        </footer>
      </dialog>
      <dialog ref={bookDialog} className="handbook-dialog" onCancel={() => setBook(false)}>
        <button
          className="close-button"
          aria-label={t('Закрыть книгу', 'Close handbook', 'Кітапты жабу')}
          onClick={() => setBook(false)}
        >
          <X size={21} />
        </button>
        <div className="book-spine" />
        <div className="book-index">
          <BookOpen size={30} />
          <h2>{t('Книга\nмэра', 'Mayor’s\nhandbook', 'Әкім\nкітабы')}</h2>
          <span>
            {t(
              'Восемь идей для хорошего города',
              'Eight ideas for a better city',
              'Жақсы қалаға арналған сегіз идея',
            )}
          </span>
          <nav>
            {HANDBOOK.map((h, i) => (
              <button className={tip === i ? 'active' : ''} onClick={() => setTip(i)} key={h.id}>
                <small>{String(i + 1).padStart(2, '0')}</small>
                {h.title[lang]}
              </button>
            ))}
          </nav>
        </div>
        <article className="book-page">
          <div className="book-page-number">QALA / {String(tip + 1).padStart(2, '0')}</div>
          <h3>{HANDBOOK[tip].title[lang]}</h3>
          <p>{HANDBOOK[tip].principle[lang]}</p>
          <div className="book-game-tip">
            <span>{t('Попробуйте в игре', 'Try it in the game', 'Ойында байқап көріңіз')}</span>
            <p>{HANDBOOK[tip].action[lang]}</p>
            <div>
              {HANDBOOK[tip].measures.map((id) => (
                <button
                  onClick={() => {
                    setBook(false);
                    onPolicy(MEASURES.find((m) => m.id === id)!);
                  }}
                  key={id}
                >
                  {id}
                  <ArrowUpRight size={13} />
                </button>
              ))}
            </div>
          </div>
          <div className="book-source">
            <b>{t('Откуда идея', 'Reading inspiration', 'Идеяның негізі')}</b>
            <p>
              {t(
                'Оригинальные советы QALA по темам книги И. Варламова и М. Каца «100 советов мэру» (2020). Загруженный фрагмент содержит вступление и оглавление, не полные главы.',
                'Original QALA advice inspired by topics in Ilya Varlamov and Maxim Katz’s “100 Tips for a Mayor” (2020). The supplied excerpt contains the introduction and contents, not full chapters.',
                'И. Варламов пен М. Кацтың «100 советов мэру» (2020) кітабының тақырыптарына негізделген QALA-ның төл кеңестері. Берілген үзіндіде толық тараулар емес, кіріспе мен мазмұн бар.',
              )}
            </p>
            <small>
              {HANDBOOK[tip].reading === 'QALA model'
                ? t(
                    'Источник: формула кейса QALA.',
                    'Source: QALA case formula.',
                    'Дереккөз: QALA формуласы.',
                  )
                : t(
                    `Темы для чтения: советы ${HANDBOOK[tip].reading}.`,
                    `Reading topics: tips ${HANDBOOK[tip].reading}.`,
                    `Оқу тақырыптары: ${HANDBOOK[tip].reading} кеңестер.`,
                  )}
            </small>
          </div>
          <div className="book-pagination">
            <button disabled={tip === 0} onClick={() => setTip(tip - 1)}>
              <ChevronLeft size={17} />
              {t('Назад', 'Previous', 'Артқа')}
            </button>
            <button disabled={tip === HANDBOOK.length - 1} onClick={() => setTip(tip + 1)}>
              {t('Дальше', 'Next', 'Алға')}
              <ChevronRight size={17} />
            </button>
          </div>
        </article>
      </dialog>
    </div>
  );
}
