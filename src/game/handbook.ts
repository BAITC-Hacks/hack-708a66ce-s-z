import { tr, type LocalText } from './data';
export interface HandbookTip {
  id: string;
  title: LocalText;
  principle: LocalText;
  action: LocalText;
  measures: string[];
  reading: string;
}
export const HANDBOOK: HandbookTip[] = [
  {
    id: 'people',
    title: tr(
      'Считайте людей, не машины',
      'Count people, not cars',
      'Көлікті емес, адамдарды санаңыз',
    ),
    principle: tr(
      'Свободная дорога и доступный транспорт решают разные задачи. Жителю важно добраться до нужного места, а не просто ехать быстрее.',
      'Clear roads and accessible transport solve different problems. Residents need to reach their destination, not simply drive faster.',
      'Еркін жол мен қолжетімді көлік әртүрлі міндетті шешеді. Тұрғынға жылдам жүру ғана емес, керек жерге жету маңызды.',
    ),
    action: tr(
      'Сравните T1 и T2. Полоса для автобусов вместе с умными светофорами даёт дополнительный эффект.',
      'Compare T1 and T2. Bus lanes paired with smart signals earn a synergy bonus.',
      'T1 мен T2-ні салыстырыңыз. Автобус жолағы мен ақылды бағдаршам бірге қосымша әсер береді.',
    ),
    measures: ['M1', 'M2', 'M3'],
    reading: '20, 33, 49',
  },
  {
    id: 'walking',
    title: tr(
      'Путь ребёнка важнее скорости',
      'A safe walk comes first',
      'Қауіпсіз жол бірінші орында',
    ),
    principle: tr(
      'Удобство улицы проверяется пешком. Подумайте, как её пересечёт ребёнок, пожилой человек или родитель с коляской.',
      'Test a street on foot. Think about a child, an older resident, or a parent with a stroller crossing it.',
      'Көшені жаяу жүріп бағалаңыз. Одан бала, қарт адам немесе арба ұстаған ата-ана қалай өтетінін ойлаңыз.',
    ),
    action: tr(
      'У M11 есть честный компромисс: безопасность дорог растёт, но свободный проезд немного снижается.',
      'M11 has a visible tradeoff: safer roads, with a small reduction in road flow.',
      'M11-де ымыра бар: жол қауіпсіздігі артады, бірақ еркін қозғалыс сәл төмендейді.',
    ),
    measures: ['M11', 'M10'],
    reading: '11, 14, 62, 64',
  },
  {
    id: 'park',
    title: tr('Парк должен быть рядом', 'A park within reach', 'Саябақ жақын болсын'),
    principle: tr(
      'Зелень полезна не только на общей карте. Важно, есть ли место для отдыха рядом с домом и удобно ли туда дойти.',
      'Green space matters at neighborhood scale. Can residents reach a pleasant place to rest close to home?',
      'Жасыл кеңістік аудан деңгейінде маңызды. Тұрғын үйіне жақын демалыс орнына оңай жете ала ма?',
    ),
    action: tr(
      'Сравните локальный парк M4 и городской зелёный пояс M6. Помните: парк и школа не делят один участок.',
      'Compare a local park, M4, with the citywide green belt, M6. A park and a school cannot occupy the same site.',
      'M4 жергілікті саябағы мен M6 қалалық жасыл белдеуін салыстырыңыз. Саябақ пен мектеп бір жерді бөлісе алмайды.',
    ),
    measures: ['M4', 'M6'],
    reading: '57, 58, 91',
  },
  {
    id: 'close',
    title: tr(
      'Повседневная жизнь рядом',
      'Bring everyday life closer',
      'Күнделікті өмір жақын болсын',
    ),
    principle: tr(
      'Жилому району нужны не только дома. Школа, медицина и места общения делают его пригодным для повседневной жизни.',
      'A neighborhood needs more than housing. Education, healthcare and shared spaces make everyday life possible.',
      'Ауданға тұрғын үй ғана жеткіліксіз. Мектеп, емхана және ортақ орындар күнделікті өмірге қажет.',
    ),
    action: tr(
      'В Нуре S1 = 38 и S2 = 35 на старте. Поддержка школ и медицины может убрать два критических штрафа.',
      'Nura starts with S1 = 38 and S2 = 35. Schools and healthcare can remove two critical penalties.',
      'Нұрада бастапқы S1 = 38, S2 = 35. Мектеп пен медицинаға қолдау екі сындарлы айыпты жоя алады.',
    ),
    measures: ['M7', 'M8', 'M9'],
    reading: '6, 93, 94',
  },
  {
    id: 'small',
    title: tr(
      'Малые шаги тоже меняют город',
      'Small improvements count',
      'Шағын өзгерістер де маңызды',
    ),
    principle: tr(
      'Большой бюджет не гарантирует лучшего решения. Сравнивайте пользу, охват жителей и время до результата.',
      'A bigger price does not guarantee a better choice. Compare benefit, reach and time until results arrive.',
      'Жоғары баға жақсы шешімге кепіл емес. Пайданы, қамтуды және нәтижеге дейінгі уақытты салыстырыңыз.',
    ),
    action: tr(
      'Спорт-хабы и безопасные переходы стоят по 10. Небольшие меры помогают завершить все пять решений.',
      'Sports hubs and safer crossings each cost 10. Smaller measures can help you finish all five decisions.',
      'Спорт алаңдары мен қауіпсіз өткелдердің әрқайсысы 10 тұрады. Шағын шаралар бес шешімді аяқтауға көмектеседі.',
    ),
    measures: ['M9', 'M11', 'M10'],
    reading: '59',
  },
  {
    id: 'listen',
    title: tr('Город должен отвечать', 'A city should respond', 'Қала жауап беруі керек'),
    principle: tr(
      'Понятная обратная связь делает работу служб видимой. Житель должен понимать, что происходит с его обращением.',
      'Clear feedback makes public services understandable. Residents should know what is happening to their requests.',
      'Түсінікті кері байланыс қызметтердің жұмысын көрсетеді. Тұрғын өз өтінішінің жағдайын білуі тиіс.',
    ),
    action: tr(
      'M12 улучшает C2 во всех районах. Вместе с M10 он также усиливает безопасность улиц выбранного района.',
      'M12 improves C2 in every district. Paired with M10, it also improves street safety in that policy’s district.',
      'M12 барлық ауданда C2-ні жақсартады. M10-мен бірге таңдалған ауданның көше қауіпсіздігін де арттырады.',
    ),
    measures: ['M12', 'M14'],
    reading: '55',
  },
  {
    id: 'care',
    title: tr('Сначала забота, потом витрина', 'Care before spectacle', 'Алдымен қамқорлық'),
    principle: tr(
      'Городская жизнь зависит и от незаметной инфраструктуры. Надёжное тепло, вода и обслуживание важны не меньше нового фасада.',
      'Everyday life relies on infrastructure that is easy to overlook. Reliable heat, water and maintenance matter as much as new landmarks.',
      'Күнделікті өмір көзге түсе бермейтін инфрақұрылымға тәуелді. Сенімді жылу, су және қызмет көрсету жаңа ғимараттардай маңызды.',
    ),
    action: tr(
      'Сравните долгую модернизацию M13 и быстрые городские бригады M14. У этих мер разный охват и лаг.',
      'Compare long-term renewal, M13, with rapid citywide response, M14. Their reach and delay differ.',
      'Ұзақ мерзімді M13 жаңартуы мен жедел M14 қалалық бригадаларын салыстырыңыз. Қамтуы мен кідірісі әртүрлі.',
    ),
    measures: ['M13', 'M14', 'M5'],
    reading: '9, 61, 74',
  },
  {
    id: 'fairness',
    title: tr('Не оставляйте район позади', 'Leave no district behind', 'Ешбір ауданды ұмытпаңыз'),
    principle: tr(
      'Средний результат скрывает различия. Хороший план должен помогать и тем, у кого стартовые условия хуже.',
      'An average can hide inequality. A useful plan also helps residents whose starting conditions are worse.',
      'Орташа көрсеткіш айырмашылықтарды жасырады. Жақсы жоспар бастапқы жағдайы нашар тұрғындарға да көмектеседі.',
    ),
    action: tr(
      '30% Score зависит от самого слабого района. Смотрите на него после каждого решения: лидерство может смениться.',
      '30% of the Score depends on the weakest district. Check it after every decision: the weakest district can change.',
      'Score-дың 30%-ы ең әлсіз ауданға тәуелді. Оны әр шешімнен кейін тексеріңіз: ең әлсіз аудан өзгеруі мүмкін.',
    ),
    measures: [],
    reading: 'QALA model',
  },
];
