import { ArrowRight, ArrowUpRight, Users, TriangleAlert, ChartNoAxesCombined } from 'lucide-react';
import {
  DISTRICTS,
  INDICATORS,
  KEYS,
  WEIGHTS,
  SYNERGIES,
  type DistrictId,
  type Lang,
} from '../game/data';
import { BASELINE, type Result } from '../game/engine';
import '../analytics.css';

export interface CityAnalyticsProps {
  lang: Lang;
  result: Result;
  selected: DistrictId;
  onSelect?: (id: DistrictId) => void;
}
type ResultProps = Pick<CityAnalyticsProps, 'lang' | 'result'>;
const number = (value: number) => Number(value.toFixed(2)).toString();
const signed = (value: number) => `${value >= 0 ? '+' : '−'}${number(Math.abs(value))}`;
const copy = (lang: Lang) => (ru: string, en: string, kk: string) => ({ ru, en, kk })[lang];

function Legend({ lang, threshold = false }: { lang: Lang; threshold?: boolean }) {
  const t = copy(lang);
  return (
    <div className="ca-legend">
      <span>
        <i className="ca-before-key" />
        {t('До решений', 'Before decisions', 'Шешімдерге дейін')}
      </span>
      <span>
        <i className="ca-after-key" />
        {t('Сценарий', 'Scenario', 'Сценарий')}
      </span>
      {threshold && (
        <span>
          <i className="ca-threshold-key" />
          {t('Порог 40', 'Threshold 40', '40 шегі')}
        </span>
      )}
    </div>
  );
}

export function DistrictStatistics({ lang, result, selected, onSelect }: CityAnalyticsProps) {
  const t = copy(lang);
  const district = DISTRICTS.find((d) => d.id === selected)!;
  const change = result.districtScores[selected] - BASELINE.districtScores[selected];
  const critical = result.critical.filter((c) => c.districtId === selected).length;
  return (
    <section
      className="ca-card ca-district"
      data-testid="district-statistics"
      aria-label={t(
        'Статистика выбранного района',
        'Selected district statistics',
        'Таңдалған аудан статистикасы',
      )}
    >
      <div className="ca-section-head">
        <div>
          <span className="ca-eyebrow">
            {t('Район в деталях', 'District in detail', 'Аудан туралы')}
          </span>
          <h2>{district.name[lang]}</h2>
        </div>
        <div className="ca-district-score">
          <strong>
            {number(result.districtScores[selected])}
            <small>/100</small>
          </strong>
          <span className={change < 0 ? 'ca-negative' : 'ca-positive'}>
            <ArrowUpRight size={14} />
            {signed(change)} {t('балла', 'points', 'ұпай')}
          </span>
        </div>
      </div>
      {onSelect && (
        <div
          className="ca-district-tabs"
          role="group"
          aria-label={t('Район для анализа', 'District to analyze', 'Талдауға арналған аудан')}
        >
          {DISTRICTS.map((d) => (
            <button
              key={d.id}
              type="button"
              aria-pressed={d.id === selected}
              onClick={() => onSelect(d.id)}
            >
              {d.name[lang]}
            </button>
          ))}
        </div>
      )}
      <div className="ca-district-meta">
        <span>
          <Users size={15} />
          {t('Доля населения', 'Population share', 'Халық үлесі')}{' '}
          <b>{Math.round(district.pop * 100)}%</b>
        </span>
        <span>
          {t('Исходный балл', 'Baseline score', 'Бастапқы ұпай')}{' '}
          <b>{number(BASELINE.districtScores[selected])}</b>
        </span>
        <span className={critical ? 'ca-negative' : ''}>
          <TriangleAlert size={15} />
          {t('Ниже 40', 'Below 40', '40-тан төмен')} <b>{critical}</b>
        </span>
      </div>
      <p className="ca-caption">
        {t(
          '10 показателей по шкале 0–100: больше — лучше. Это баллы модели, не проценты жителей.',
          'Ten indicators on a 0–100 scale: higher is better. These are model scores, not percentages of residents.',
          '0–100 шкаласындағы он көрсеткіш: жоғары болғаны жақсы. Бұл тұрғындардың пайызы емес, модель ұпайлары.',
        )}
      </p>
      <Legend lang={lang} threshold />
      <div className="ca-metrics">
        {KEYS.map((key) => {
          const before = BASELINE.metrics[selected][key],
            after = result.metrics[selected][key],
            delta = after - before;
          return (
            <div key={key} className={`ca-metric ${after < 40 ? 'ca-is-critical' : ''}`}>
              <div className="ca-metric-label">
                <span>
                  <small>{key}</small>
                  {INDICATORS[key][lang]}
                </span>
                <span>
                  <em>{number(before)}</em>
                  <ArrowRight size={12} />
                  <b>{number(after)}</b>
                </span>
              </div>
              <div
                className="ca-meter"
                role="meter"
                aria-label={`${district.name[lang]}: ${INDICATORS[key][lang]}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={after}
                aria-valuetext={`${number(before)} → ${number(after)} / 100`}
              >
                <span className="ca-meter-before" style={{ width: `${before}%` }} />
                <span className="ca-meter-after" style={{ width: `${after}%` }} />
                <i className="ca-threshold" />
              </div>
              <div className="ca-metric-note">
                <span>
                  {after < 40
                    ? t(
                        'Ниже критического порога',
                        'Below critical threshold',
                        'Критикалық шектен төмен',
                      )
                    : '\u00a0'}
                </span>
                <b className={delta < 0 ? 'ca-negative' : 'ca-positive'}>
                  {delta ? signed(delta) : '—'}
                </b>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function CityComparison({ lang, result }: ResultProps) {
  const t = copy(lang),
    gain = result.score - BASELINE.score;
  return (
    <section className="ca-card" data-testid="city-comparison">
      <div className="ca-section-head">
        <div>
          <span className="ca-eyebrow">
            {t('Результат для города', 'City outcome', 'Қала нәтижесі')}
          </span>
          <h2>{t('Что изменилось', 'What changed', 'Не өзгерді')}</h2>
        </div>
        <ChartNoAxesCombined size={25} />
      </div>
      <div className="ca-city-total">
        <span>
          <small>{t('Качество жизни', 'Quality of life', 'Өмір сапасы')}</small>
          <b>
            {number(BASELINE.score)} <ArrowRight size={18} /> {number(result.score)}
          </b>
        </span>
        <strong className={gain < 0 ? 'ca-negative' : 'ca-positive'}>
          {signed(gain)}
          <small>{t('балла к исходному', 'points from baseline', 'бастапқыдан ұпай')}</small>
        </strong>
      </div>
      <Legend lang={lang} />
      <div className="ca-comparison-bars">
        {DISTRICTS.map((d) => (
          <div className="ca-comparison-row" key={d.id}>
            <div>
              <b>{d.name[lang]}</b>
              <span>
                {number(BASELINE.districtScores[d.id])} →{' '}
                <strong>{number(result.districtScores[d.id])}</strong>
              </span>
              <em
                className={
                  result.districtScores[d.id] < BASELINE.districtScores[d.id]
                    ? 'ca-negative'
                    : 'ca-positive'
                }
              >
                {signed(result.districtScores[d.id] - BASELINE.districtScores[d.id])}
              </em>
            </div>
            <div className="ca-meter" aria-hidden="true">
              <span
                className="ca-meter-before"
                style={{ width: `${BASELINE.districtScores[d.id]}%` }}
              />
              <span
                className="ca-meter-after"
                style={{ width: `${result.districtScores[d.id]}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="ca-caption">
        {t(
          'Баллы районов учитывают все 10 показателей и их веса.',
          'District scores account for all ten indicators and their weights.',
          'Аудан ұпайлары барлық он көрсеткіш пен олардың салмағын ескереді.',
        )}
      </p>
    </section>
  );
}

export function ProblemChart({ lang, result }: ResultProps) {
  const t = copy(lang);
  const deficits = KEYS.map((key) => ({
    key,
    before: DISTRICTS.reduce((sum, d) => sum + Math.max(0, 40 - BASELINE.metrics[d.id][key]), 0),
    after: DISTRICTS.reduce((sum, d) => sum + Math.max(0, 40 - result.metrics[d.id][key]), 0),
  }));
  const max = Math.max(1, ...deficits.flatMap((d) => [d.before, d.after]));
  const total = deficits.reduce((sum, d) => sum + d.after, 0);
  return (
    <section className="ca-card ca-problem" data-testid="problem-chart">
      <div className="ca-section-head">
        <div>
          <span className="ca-eyebrow">
            {t(
              'Проблемы, которые ещё нужно решить',
              'Needs still to address',
              'Әлі шешілуі қажет мәселелер',
            )}
          </span>
          <h2>{t('До порога 40', 'Gap to the threshold', 'Шекке дейінгі алшақтық')}</h2>
        </div>
        <TriangleAlert size={24} />
      </div>
      <p className="ca-caption">
        {t(
          'Сумма недостающих баллов до 40 по пяти районам. Меньше — лучше. Это размер дефицита, а не штраф в формуле.',
          'Total points needed to reach 40 across five districts. Lower is better. This measures the gap, not the score penalty.',
          'Бес аудан бойынша 40-қа жетпейтін ұпайлар қосындысы. Азырақ болғаны жақсы. Бұл формуладағы айып емес, тапшылық көлемі.',
        )}
      </p>
      <Legend lang={lang} />
      <div className="ca-deficits">
        {deficits.map((d) => (
          <div className={`ca-deficit-row ${d.after ? 'ca-unresolved' : ''}`} key={d.key}>
            <span>
              <b>{d.key}</b>
              {INDICATORS[d.key][lang]}
            </span>
            <div className="ca-deficit-track" aria-hidden="true">
              <i style={{ width: `${(d.before / max) * 100}%` }} />
              <i style={{ width: `${(d.after / max) * 100}%` }} />
            </div>
            <strong>
              {number(d.before)} → {number(d.after)}
            </strong>
          </div>
        ))}
      </div>
      <div className="ca-problem-total">
        <span>
          {t(
            'Осталось критических показателей',
            'Critical indicators remaining',
            'Қалған критикалық көрсеткіштер',
          )}
        </span>
        <b>
          {result.critical.length}
          <small>
            {' '}
            · {number(total)} {t('балла дефицита', 'gap points', 'тапшылық ұпайы')}
          </small>
        </b>
      </div>
    </section>
  );
}

export function IndicatorMatrix({
  lang,
  result,
  onSelect,
}: ResultProps & Pick<CityAnalyticsProps, 'onSelect'>) {
  const t = copy(lang);
  return (
    <section className="ca-card ca-matrix" data-testid="indicator-matrix">
      <div className="ca-section-head">
        <div>
          <span className="ca-eyebrow">
            {t('Весь город в одном срезе', 'A citywide view', 'Бүкіл қала бір көріністе')}
          </span>
          <h2>{t('Матрица показателей', 'Indicator matrix', 'Көрсеткіштер матрицасы')}</h2>
        </div>
      </div>
      <p className="ca-caption">
        {t(
          'В ячейке — значение сценария и изменение к исходному. Коралловый цвет и знак ! отмечают значения ниже 40. Шкала 0–100.',
          'Each cell shows the scenario value and change from baseline. Coral and ! mark values below 40. Scale: 0–100.',
          'Ұяшықта сценарий мәні және бастапқыдан өзгерісі көрсетілген. Маржан түс пен ! белгісі 40-тан төмен мәндерді көрсетеді. Шкала: 0–100.',
        )}
      </p>
      <div
        className="ca-table-scroll"
        tabIndex={0}
        role="region"
        aria-label={t(
          'Прокручиваемая матрица пяти районов',
          'Scrollable matrix of five districts',
          'Бес ауданның айналдырылатын матрицасы',
        )}
      >
        <table>
          <thead>
            <tr>
              <th scope="col">{t('Район', 'District', 'Аудан')}</th>
              {KEYS.map((key) => (
                <th scope="col" key={key}>
                  <abbr title={INDICATORS[key][lang]}>{key}</abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DISTRICTS.map((d) => (
              <tr key={d.id}>
                <th scope="row">
                  {onSelect ? (
                    <button onClick={() => onSelect(d.id)}>{d.name[lang]}</button>
                  ) : (
                    d.name[lang]
                  )}
                  <small>
                    {Math.round(d.pop * 100)}% {t('населения', 'population', 'халық')}
                  </small>
                </th>
                {KEYS.map((key) => {
                  const after = result.metrics[d.id][key],
                    before = BASELINE.metrics[d.id][key],
                    delta = after - before;
                  return (
                    <td key={key}>
                      <span
                        className={`ca-matrix-value ${after < 40 ? 'ca-critical-cell' : after >= 65 ? 'ca-healthy-cell' : ''}`}
                        title={`${INDICATORS[key][lang]}: ${number(before)} → ${number(after)}`}
                      >
                        <b>
                          {after < 40 && <i aria-hidden="true">!</i>}
                          {number(after)}
                        </b>
                        <small>{delta ? signed(delta) : '—'}</small>
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ca-key-legend">
        {KEYS.map((key) => (
          <span key={key}>
            <b>{key}</b>
            {INDICATORS[key][lang]}
          </span>
        ))}
      </div>
    </section>
  );
}

export function CalculationModel({ lang, result }: ResultProps) {
  const t = copy(lang),
    weakest = DISTRICTS.find((d) => d.id === result.weakest)!;
  return (
    <section className="ca-card ca-model" data-testid="calculation-model">
      <div className="ca-section-head">
        <div>
          <span className="ca-eyebrow">
            {t('Открытая математика', 'Open calculation', 'Ашық есептеу')}
          </span>
          <h2>{t('Откуда берётся балл', 'Where the score comes from', 'Ұпай қалай есептеледі')}</h2>
        </div>
      </div>
      <div
        className="ca-formula"
        aria-label={t(
          'Формула качества жизни',
          'Quality of life formula',
          'Өмір сапасының формуласы',
        )}
      >
        <div>
          <b>{number(0.7 * result.average)}</b>
          <span>70% × {number(result.average)}</span>
          <small>
            {t(
              'Среднее с учётом населения',
              'Population-weighted average',
              'Халық үлесі ескерілген орташа',
            )}
          </small>
        </div>
        <i>+</i>
        <div>
          <b>{number(0.3 * result.districtScores[result.weakest])}</b>
          <span>30% × {number(result.districtScores[result.weakest])}</span>
          <small>
            {t('Слабейший район', 'Weakest district', 'Ең әлсіз аудан')}: {weakest.name[lang]}
          </small>
        </div>
        <i>−</i>
        <div>
          <b>{result.critical.length}</b>
          <span>{t('По 1 за значение < 40', '1 for each value < 40', 'Әрбір < 40 мәнге 1')}</span>
          <small>
            {t('Критические показатели', 'Critical indicators', 'Критикалық көрсеткіштер')}
          </small>
        </div>
        <i>=</i>
        <div className="ca-formula-result">
          <b>{number(result.score)}</b>
          <span>Astana QoL</span>
        </div>
      </div>
      <p className="ca-caption">
        {t(
          'Отображаемые значения округлены. Расчёт использует полную точность.',
          'Displayed values are rounded. Calculation uses full precision.',
          'Көрсетілген мәндер дөңгелектелген. Есептеу толық дәлдікпен орындалады.',
        )}
      </p>
      <div className="ca-model-notes">
        <div>
          <h3>{t('01 / Эффект решения', '01 / Policy effect', '01 / Шара әсері')}</h3>
          <p>
            {t(
              'Исходный показатель + эффект × (8 − задержка) / 8 + синергия. Итог ограничен диапазоном 0–100. Порядок решений не меняет результат.',
              'Baseline + effect × (8 − lag) / 8 + synergy. Values stay within 0–100. Decision order does not change the result.',
              'Бастапқы мән + әсер × (8 − кідіріс) / 8 + синергия. Мәндер 0–100 аралығында. Шешімдер реті нәтижеге әсер етпейді.',
            )}
          </p>
        </div>
        <div>
          <h3>
            {t(
              '02 / Вес каждого показателя',
              '02 / Indicator weights',
              '02 / Көрсеткіштер салмағы',
            )}
          </h3>
          <div className="ca-weight-list">
            {KEYS.map((key) => (
              <span key={key} title={INDICATORS[key][lang]}>
                <b>{key}</b>
                {Math.round(WEIGHTS[key] * 100)}%
              </span>
            ))}
          </div>
          <p>
            {t(
              'Балл района — взвешенная сумма десяти показателей. Городское среднее учитывает долю населения каждого района.',
              'A district score is the weighted sum of ten indicators. The city average uses each district’s population share.',
              'Аудан ұпайы — он көрсеткіштің салмақталған қосындысы. Қаладағы орташа мән әр ауданның халық үлесін ескереді.',
            )}
          </p>
        </div>
      </div>
      <details className="ca-model-details" data-testid="model-assumptions">
        <summary>
          {t(
            'Синергии и доли населения',
            'Synergies and population shares',
            'Синергиялар мен халық үлестері',
          )}
        </summary>
        <div className="ca-model-details-grid">
          <div>
            <h3>
              {t('Совместный эффект мер', 'Combined policy effects', 'Шаралардың бірлескен әсері')}
            </h3>
            <ul className="ca-synergy-list">
              {SYNERGIES.map((synergy) => (
                <li key={synergy.pair.join('-')}>
                  <span>{synergy.name[lang]}</span>
                  <b>
                    {synergy.pair.join(' + ')} → {synergy.indicator} +{synergy.bonus}
                  </b>
                </li>
              ))}
            </ul>
            <p>
              {t(
                'Бонус получает район первой, локальной меры в паре. Он добавляется целиком, без умножения на задержку.',
                'The bonus goes to the district targeted by the first, local policy in each pair. It is added in full, without lag scaling.',
                'Бонус жұптағы бірінші, жергілікті шара бағытталған ауданға беріледі. Ол кідіріске көбейтілмей, толық қосылады.',
              )}
            </p>
          </div>
          <div>
            <h3>
              {t(
                'Вес района в городском среднем',
                'District weight in the city average',
                'Қаланың орташа мәніндегі аудан салмағы',
              )}
            </h3>
            <ul className="ca-population-list">
              {DISTRICTS.map((district) => (
                <li key={district.id}>
                  <span>{district.name[lang]}</span>
                  <b>{Math.round(district.pop * 100)}%</b>
                </li>
              ))}
            </ul>
            <p>
              {t(
                'Доли населения заданы учебным датасетом. Они взвешивают баллы районов при расчёте среднего для города.',
                'Population shares come from the educational dataset. They weight district scores when calculating the city average.',
                'Халық үлестері оқу деректерінде берілген. Қаланың орташа мәнін есептегенде аудан ұпайлары осы үлестермен өлшенеді.',
              )}
            </p>
          </div>
        </div>
      </details>
      <p className="ca-model-disclosure">
        {t(
          'Синтетическая модель HackAlem для обучения и сравнения сценариев. Горизонт — 8 кварталов, или 2 условных года. AI объясняет расчёт и предлагает варианты; сам балл считается по формуле.',
          'A synthetic HackAlem model for learning and comparing scenarios. The horizon is eight quarters, or two simulated years. AI explains calculations and suggests options; the formula determines the score.',
          'Үйренуге және сценарийлерді салыстыруға арналған HackAlem синтетикалық моделі. Есептеу көкжиегі — 8 тоқсан, яғни 2 шартты жыл. AI есептеуді түсіндіреді және нұсқалар ұсынады; ұпайды формула анықтайды.',
        )}
      </p>
    </section>
  );
}

export function CityAnalytics(props: CityAnalyticsProps) {
  return (
    <div className="city-analytics">
      <div className="ca-overview-grid">
        <CityComparison {...props} />
        <ProblemChart {...props} />
      </div>
      <DistrictStatistics {...props} />
      <IndicatorMatrix {...props} />
      <CalculationModel {...props} />
    </div>
  );
}
