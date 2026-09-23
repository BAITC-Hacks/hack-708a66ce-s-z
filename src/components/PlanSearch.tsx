import { useEffect, useId, useRef, useState } from 'react';
import { ArrowUpRight, Check, GitBranch, LoaderCircle, Search, Square } from 'lucide-react';
import { DISTRICTS, MEASURES, type Lang } from '../game/data';
import { simulate, type Decision } from '../game/engine';
import { searchPlans, type PlanSearchProgress, type PlanSearchResult } from '../game/planSearch';
import '../plan-search.css';

type Props = {
  lang: Lang;
  decisions: Decision[];
  onPreview?: (decision: Decision) => void;
};
type SearchState = {
  status: 'idle' | 'running' | 'done' | 'cancelled' | 'error';
  context?: string;
  progress?: PlanSearchProgress;
  result?: PlanSearchResult;
};
export function PlanSearch({ lang, decisions, onPreview }: Props) {
  const t = (ru: string, en: string, kk: string) => ({ ru, en, kk })[lang];
  const headingId = useId();
  const [state, setState] = useState<SearchState>({ status: 'idle' });
  const currentKey = JSON.stringify(decisions),
    latestKey = useRef(currentKey);
  latestKey.current = currentKey;
  const request = useRef<{ id: number; controller: AbortController | null }>({
    id: 0,
    controller: null,
  });
  const complete = decisions.length === 5;
  useEffect(() => {
    request.current.controller?.abort();
    request.current.id++;
    setState({ status: 'idle' });
    return () => {
      request.current.controller?.abort();
      request.current.id++;
    };
  }, [currentKey]);
  const start = async () => {
    request.current.controller?.abort();
    const controller = new AbortController();
    const id = ++request.current.id;
    request.current.controller = controller;
    const context = currentKey;
    const isCurrent = () =>
      request.current.id === id && latestKey.current === context && !controller.signal.aborted;
    setState({ status: 'running' });
    try {
      const result = await searchPlans(complete ? [] : decisions, {
        signal: controller.signal,
        onProgress: (progress) => {
          if (isCurrent()) setState({ status: 'running', progress });
        },
      });
      if (isCurrent()) setState({ status: 'done', result, context });
    } catch (error) {
      if (request.current.id === id && latestKey.current === context)
        setState({
          status:
            error instanceof DOMException && error.name === 'AbortError' ? 'cancelled' : 'error',
        });
    }
  };
  const cancel = () => {
    request.current.controller?.abort();
    request.current.id++;
    setState({ status: 'cancelled' });
  };
  const result = state.context === currentKey ? state.result : undefined;
  const next = result && !complete ? result.decisions[decisions.length] : undefined;
  const currentScore = simulate(decisions).score;
  return (
    <section className="plan-search" aria-labelledby={headingId} data-testid="plan-search">
      <header className="plan-search-heading">
        <span className="plan-search-icon">
          <GitBranch size={19} aria-hidden="true" />
        </span>
        <div>
          <span className="plan-search-eyebrow">
            {t('Лаборатория решений', 'Decision lab', 'Шешімдер зертханасы')}
          </span>
          <h3 id={headingId}>
            {t('Сравнить полный план', 'Compare a complete plan', 'Толық жоспарды салыстыру')}
          </h3>
        </div>
      </header>
      <p className="plan-search-intro">
        {complete
          ? t(
              'Сравним новую партию из пяти решений с вашим итогом. Текущий план останется без изменений.',
              'Compare a fresh five-decision term with your result. Your current plan stays unchanged.',
              'Бес шешімнен тұратын жаңа ойынды нәтижеңізбен салыстырыңыз. Қазіргі жоспар өзгермейді.',
            )
          : decisions.length
            ? t(
                `Сохраним принятые решения (${decisions.length}) и найдём сильное продолжение до пяти.`,
                `Keep your ${decisions.length} funded decisions and find a strong five-choice completion.`,
                `Қабылданған ${decisions.length} шешімді сақтап, бес шешімге дейінгі тиімді жалғасын табыңыз.`,
              )
            : t(
                'Сравним сочетания мер в том же бюджете 100. Выбор остаётся за вами.',
                'Compare combinations within the same 100 budget. Every choice remains yours.',
                'Сол 100 бюджет шегінде шаралар жиынтығын салыстырыңыз. Таңдау өзіңізде.',
              )}
      </p>
      {state.status === 'running' ? (
        <div className="plan-search-running" role="status" aria-live="polite">
          <div>
            <LoaderCircle size={17} aria-hidden="true" />
            <strong>
              {t('Сравниваем варианты…', 'Comparing alternatives…', 'Нұсқалар салыстырылуда…')}
            </strong>
          </div>
          <progress
            max={5}
            value={state.progress?.depth ?? 0}
            aria-label={t('Прогресс поиска', 'Search progress', 'Іздеу барысы')}
          />
          <span>
            {(state.progress?.evaluatedStates ?? 0).toLocaleString()}{' '}
            {t('вариантов проверено', 'states evaluated', 'нұсқа тексерілді')}
          </span>
          <button type="button" className="plan-search-stop" onClick={cancel}>
            <Square size={12} />
            {t('Остановить', 'Stop search', 'Іздеуді тоқтату')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="plan-search-start"
          onClick={() => void start()}
          data-testid="plan-search-start"
        >
          <Search size={17} aria-hidden="true" />
          {result
            ? t('Сравнить снова', 'Compare again', 'Қайта салыстыру')
            : complete
              ? t(
                  'Найти альтернативу для новой партии',
                  'Find an alternative new term',
                  'Жаңа ойынға балама табу',
                )
              : t('Найти сильный план', 'Find a strong plan', 'Тиімді жоспар табу')}
        </button>
      )}
      {state.status === 'cancelled' && (
        <p className="plan-search-notice" role="status">
          {t(
            'Поиск остановлен. Ваши решения не изменены.',
            'Search stopped. Your decisions are unchanged.',
            'Іздеу тоқтатылды. Шешімдеріңіз өзгерген жоқ.',
          )}
        </p>
      )}
      {state.status === 'error' && (
        <p className="plan-search-notice" role="alert">
          {t(
            'Для текущих решений не удалось найти полный план. Можно отменить последний ход и попробовать снова.',
            'No complete plan was found for these decisions. You can undo the last choice and try again.',
            'Қазіргі шешімдерге толық жоспар табылмады. Соңғы шешімді қайтарып, қайта көріңіз.',
          )}
        </p>
      )}
      {result && (
        <div className="plan-search-result" data-testid="plan-search-result">
          <div className="plan-search-result-title">
            <Check size={16} />
            <strong>
              {t(
                'Лучший из найденных планов',
                'Best plan found in this search',
                'Іздеуде табылған үздік жоспар',
              )}
            </strong>
          </div>
          <div className="plan-search-stats">
            <div>
              <span>{t('Итоговый балл', 'Final score', 'Соңғы балл')}</span>
              <b>{result.score.toFixed(2)}</b>
            </div>
            <div>
              <span>
                {complete
                  ? t('К вашему итогу', 'Vs your result', 'Нәтижеңізбен')
                  : t('К исходному городу', 'Vs initial city', 'Бастапқы қаламен')}
              </span>
              <b>
                {(complete ? result.score - currentScore : result.gain) >= 0 ? '+' : ''}
                {(complete ? result.score - currentScore : result.gain).toFixed(2)}
              </b>
            </div>
            <div>
              <span>{t('Бюджет', 'Budget', 'Бюджет')}</span>
              <b>
                {result.cost}
                <small> / 100</small>
              </b>
            </div>
          </div>
          <ol className="plan-search-choices">
            {result.decisions.map((decision, index) => {
              const measure = MEASURES.find((m) => m.id === decision.measureId)!;
              const fixed = index < result.fixedCount;
              return (
                <li key={decision.measureId} className={fixed ? 'is-funded' : ''}>
                  <span className="plan-search-step">
                    {fixed ? <Check size={13} aria-hidden="true" /> : index + 1}
                  </span>
                  <div>
                    <strong>{measure.name[lang]}</strong>
                    <span>
                      {decision.districtId
                        ? DISTRICTS.find((d) => d.id === decision.districtId)!.name[lang]
                        : t('Весь город', 'Citywide', 'Бүкіл қала')}
                      {fixed ? ` · ${t('принято', 'funded', 'қабылданды')}` : ''}
                    </span>
                  </div>
                  <small>{measure.cost}</small>
                </li>
              );
            })}
          </ol>
          <p className="plan-search-evidence">
            {result.evaluatedStates.toLocaleString()}{' '}
            {t('вариантов проверено', 'states evaluated', 'нұсқа тексерілді')} ·{' '}
            {result.completedPlans.toLocaleString()}{' '}
            {t('полных планов', 'complete plans', 'толық жоспар')}
          </p>
          {next && onPreview && (
            <button
              type="button"
              className="plan-search-preview"
              data-testid="plan-search-preview"
              onClick={() => {
                if (latestKey.current === currentKey) onPreview({ ...next });
              }}
            >
              {t('Проверить следующий шаг', 'Preview the next step', 'Келесі қадамды көру')}
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
      <details className="plan-search-method">
        <summary>
          {t('Как сравниваются планы', 'How plans are compared', 'Жоспарлар қалай салыстырылады')}
        </summary>
        <p>
          {t(
            'Локальный поиск сохраняет до 180 лучших продолжений на шаге. Каждый вариант проверяет официальный движок: бюджет, районы, конфликты и синергии. Счётчик включает частичные и полные планы. Глобальный максимум не доказан; найденный план не хуже последовательных подсказок. Это расчёт, не ответ AI. Ничего не принимается автоматически.',
            'Local beam search keeps up to 180 promising continuations per step. The official engine checks budget, districts, conflicts and synergies. Counts include partial and complete plans. This is not a proven global optimum; the result is at least as strong as sequential suggestions. It is a calculation, not AI narration. Nothing is funded automatically.',
            'Жергілікті іздеу әр қадамда 180 үздік жалғастыру нұсқасына дейін сақтайды. Ресми қозғалтқыш бюджет, аудандар, қайшылықтар мен синергияны тексереді. Есептегіш жартылай және толық жоспарларды қамтиды. Жаһандық максимум дәлелденбеген; нәтиже кезекті кеңестерден кем емес. Бұл AI жауабы емес, есептеу. Ештеңе автоматты қабылданбайды.',
          )}
        </p>
      </details>
    </section>
  );
}
