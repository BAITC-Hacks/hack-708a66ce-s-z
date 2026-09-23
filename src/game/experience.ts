import { legalCandidates } from './decisionSupport';
import { DISTRICTS, KEYS, tr, type DistrictId, type Lang } from './data';
import { BASELINE, type Decision, type Result } from './engine';
export function districtNeeds(result: Result, id: DistrictId) {
  return [...KEYS].sort((a, b) => result.metrics[id][a] - result.metrics[id][b]).slice(0, 2);
}
export function milestones(result: Result) {
  return [
    {
      id: 'care',
      earned: result.critical.length === 0,
      title: tr('Никого не забыли', 'No one left behind', 'Ешкім ұмыт қалған жоқ'),
      detail: tr(
        'Нет показателей ниже 40.',
        'No indicators below 40.',
        '40-тан төмен көрсеткіш жоқ.',
      ),
    },
    {
      id: 'synergy',
      earned: result.synergies.length > 0,
      title: tr('Лучше вместе', 'Better together', 'Бірге тиімді'),
      detail: tr(
        'В плане работает синергия.',
        'Your plan activates a synergy.',
        'Жоспарда синергия іске қосылды.',
      ),
    },
    {
      id: 'reach',
      earned: DISTRICTS.every((d) => result.districtScores[d.id] > BASELINE.districtScores[d.id]),
      title: tr('Весь город растёт', 'Every district grows', 'Әр аудан дамиды'),
      detail: tr(
        'Улучшены все пять районов.',
        'All five district scores improved.',
        'Бес ауданның да балы өсті.',
      ),
    },
  ];
}
export function policyHand(decisions: Decision[], district: DistrictId, lang: Lang) {
  const all = legalCandidates(decisions, lang).filter(
    (c) => !c.decision.districtId || c.decision.districtId === district,
  );
  const hand = all.slice(0, 2);
  const alternative =
    all.slice(2).find((c) => !hand.some((h) => h.category === c.category)) ?? all[2];
  if (alternative) hand.push(alternative);
  return hand;
}
