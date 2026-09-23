import { useState } from 'react';
import { ArrowRight, Check, Flag, MapPin, X } from 'lucide-react';
import type { Lang } from '../game/data';
import advisorArt from '../assets/advisor-aida.png';
import '../onboarding.css';

export type MayorGuideStage = 'briefing' | 'choose' | 'preview' | 'result';
const GUIDE_KEY = 'qala-mayor-guide-v1';

/** Guidance is independent of the simulation: it can never spend or change a policy. */
export function useMayorOnboarding(initialDecisionCount: number) {
  const [active, setActive] = useState(() => {
    if (initialDecisionCount > 0) return false;
    try {
      return localStorage.getItem(GUIDE_KEY) !== 'done';
    } catch {
      return true;
    }
  });
  const finish = () => {
    setActive(false);
    try {
      localStorage.setItem(GUIDE_KEY, 'done');
    } catch {
      // Private browsing may deny storage. The current guide still stays dismissed.
    }
  };
  const replay = () => {
    setActive(true);
    try {
      localStorage.removeItem(GUIDE_KEY);
    } catch {}
  };
  return { active, start: replay, skip: finish, finish, replay };
}

interface Props {
  stage: MayorGuideStage;
  lang: Lang;
  onContinue?: () => void;
  onSkip: () => void;
  districtName?: string;
  lagQuarters?: number;
  citywide?: boolean;
}

export function MayorOnboarding({
  stage,
  lang,
  onContinue,
  onSkip,
  districtName,
  lagQuarters = 0,
  citywide = false,
}: Props) {
  const t = (ru: string, en: string, kk: string) => ({ ru, en, kk })[lang];
  const skipLabel = t('Пропустить обучение', 'Skip guide', 'Нұсқаулықты өткізу');
  const step = stage === 'choose' ? 0 : stage === 'preview' ? 1 : 2;
  const stepNames = [
    t('Выбрать', 'Choose', 'Таңдау'),
    t('Проверить', 'Preview', 'Тексеру'),
    t('Увидеть результат', 'See the result', 'Нәтижені көру'),
  ];

  if (stage === 'briefing') {
    return (
      <section className="mayor-guide-briefing" data-testid="onboarding-briefing">
        <div className="mayor-guide-portrait">
          <img
            src={advisorArt}
            alt={t(
              'Айда, вымышленный советник',
              'Aida, a fictional advisor',
              'Айда, ойдан шығарылған кеңесші',
            )}
          />
          <div className="mayor-guide-portrait-caption">
            <span>QALA / {t('Ваша команда', 'Your team', 'Сіздің командаңыз')}</span>
            <strong>{t('Айда', 'Aida', 'Айда')}</strong>
            <small>{t('Советник акима', 'Your mayoral advisor', 'Әкімнің кеңесшісі')}</small>
          </div>
        </div>
        <div className="mayor-guide-welcome">
          <span className="mayor-guide-eyebrow">
            {t('Первый день в мэрии', 'Your first day in office', 'Әкімдіктегі алғашқы күн')}
          </span>
          <h2>
            {t(
              'Один бюджет. Пять решений.',
              'One budget. Five decisions.',
              'Бір бюджет. Бес шешім.',
            )}
          </h2>
          <p className="mayor-guide-introduction">
            {t(
              'Я Айда. В начале срока Нуре не хватает школ и медицинских услуг. Начнём с потребностей жителей — и посмотрим, что изменит ваш выбор.',
              'I’m Aida. Nura begins with gaps in schools and healthcare. Let’s start with residents’ needs and see what your choices can change.',
              'Мен Айдамын. Мерзімнің басында Нұраға мектептер мен медициналық қызметтер жетіспейді. Тұрғындардың қажеттіліктерінен бастап, таңдауыңыз нені өзгертетінін көрейік.',
            )}
          </p>
          <div
            className="mayor-guide-mandate"
            aria-label={t('Ваша задача', 'Your mandate', 'Сіздің міндетіңіз')}
          >
            <div>
              <strong>100</strong>
              <span>
                {t(
                  'бюджета на весь город',
                  'budget for the whole city',
                  'бүкіл қалаға ортақ бюджет',
                )}
              </span>
            </div>
            <div>
              <strong>5</strong>
              <span>
                {t(
                  'разных решений — ровно пять',
                  'different policies — exactly five',
                  'түрлі шара — дәл бесеу',
                )}
              </span>
            </div>
          </div>
          <ol
            className="mayor-guide-path"
            aria-label={t('Как проходит ход', 'How a turn works', 'Қадам қалай өтеді')}
          >
            {stepNames.map((label, index) => (
              <li key={label}>
                <b>{index + 1}</b>
                <span>{label}</span>
                {index < 2 && <ArrowRight size={14} aria-hidden="true" />}
              </li>
            ))}
          </ol>
          <p className="mayor-guide-promise">
            <Check size={16} aria-hidden="true" />
            {t(
              'Сначала прогноз. Бюджет тратится только после подтверждения.',
              'Preview first. Your budget is spent only when you confirm.',
              'Алдымен болжам. Бюджет тек растағаннан кейін жұмсалады.',
            )}
          </p>
          <button className="gold-button" data-testid="onboarding-start" onClick={onContinue}>
            {t('Познакомиться с городом', 'Meet your city', 'Қаламен танысу')}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
          <button className="mayor-guide-skip" data-testid="onboarding-skip" onClick={onSkip}>
            {skipLabel}
          </button>
        </div>
      </section>
    );
  }

  const title =
    stage === 'choose'
      ? t('Начните с одной потребности', 'Start with one need', 'Бір қажеттіліктен бастаңыз')
      : stage === 'preview'
        ? t(
            'Посмотрите вперёд, затем решайте',
            'Look ahead, then decide',
            'Алдымен болжамды бағалаңыз',
          )
        : t('Смотрите на весь город', 'Look at the whole city', 'Бүкіл қаланы ескеріңіз');
  const message =
    stage === 'choose'
      ? districtName
        ? t(
            `Сейчас выбран район ${districtName}. Откройте карточку ниже: прогноз бесплатный. Другой район можно выбрать на карте.`,
            `${districtName} is selected. Open a card below: previewing is free. You can choose another district on the map.`,
            `${districtName} ауданы таңдалды. Төмендегі картаны ашыңыз: болжамды қарау тегін. Басқа ауданды қала картасынан таңдауға болады.`,
          )
        : t(
            'Выберите район на карте, затем откройте карточку ниже. Прогноз покажет последствия до траты бюджета.',
            'Choose a district on the map, then open a card below. Preview the consequences before spending.',
            'Қала картасынан ауданды таңдап, төмендегі картаны ашыңыз. Бюджетті жұмсамас бұрын салдарын көріңіз.',
          )
      : stage === 'preview'
        ? t(
            `Прогноз на 8 кварталов уже учитывает задержку: ${lagQuarters} кв. ${citywide ? 'Мера действует во всех районах.' : 'Проверьте район назначения.'} Не больше двух мер на направление.`,
            `The 8-quarter forecast includes a ${lagQuarters}-quarter delay. ${citywide ? 'This policy affects every district.' : 'Check the target district.'} At most two policies per category.`,
            `8 тоқсандық болжам ${lagQuarters} тоқсандық кешігуді ескереді. ${citywide ? 'Шара барлық ауданға әсер етеді.' : 'Шара қолданылатын ауданды тексеріңіз.'} Әр бағытта ең көбі екі шара.`,
          )
        : t(
            'QoL = 70% среднего по населению + 30% слабейшего района. Каждый показатель ниже 40 вычитает 1 балл. Улучшайте жизнь, не оставляя районы позади.',
            'QoL = 70% population-weighted city average + 30% weakest district. Each indicator below 40 costs 1 point. Help the city without leaving a district behind.',
            'QoL = халық саны ескерілген орташа мәннің 70%-ы + ең әлсіз ауданның 30%-ы. 40-тан төмен әр көрсеткіш 1 ұпайды шегереді. Еш аудан назардан тыс қалмасын.',
          );
  const Icon = stage === 'choose' ? MapPin : stage === 'preview' ? Flag : Check;

  return (
    <aside
      className={`mayor-guide-tip mayor-guide-tip-${stage}`}
      data-testid="guided-tip"
      data-guide-stage={stage}
      aria-label={t('Подсказка советника', 'Advisor guidance', 'Кеңесшінің нұсқауы')}
    >
      <div className="mayor-guide-tip-icon" aria-hidden="true">
        <Icon size={17} />
      </div>
      <div className="mayor-guide-tip-copy">
        <div className="mayor-guide-tip-heading">
          <strong>{title}</strong>
          <span className="mayor-guide-tip-step" aria-label={`${step + 1} / 3`}>
            {[0, 1, 2].map((index) => (
              <i key={index} className={index <= step ? 'is-complete' : ''} />
            ))}
          </span>
        </div>
        <p>{message}</p>
      </div>
      <button
        className="mayor-guide-dismiss"
        title={skipLabel}
        aria-label={skipLabel}
        onClick={onSkip}
      >
        <X size={15} aria-hidden="true" />
      </button>
    </aside>
  );
}
