export type Lang = 'ru' | 'en' | 'kk';
export type LocalText = Record<Lang, string>;
export const tr = (ru: string, en: string, kk: string): LocalText => ({ ru, en, kk });
export const KEYS = ['T1','T2','E1','E2','S1','S2','B1','B2','C1','C2'] as const;
export type Indicator = typeof KEYS[number];
export type Category = 'transport'|'ecology'|'social'|'safety'|'services';
export type DistrictId = 'esil'|'almaty'|'saryarka'|'baikonur'|'nura';
export type Metrics = Record<Indicator, number>;
export const WEIGHTS: Metrics = {T1:.10,T2:.10,E1:.09,E2:.11,S1:.11,S2:.11,B1:.09,B2:.09,C1:.10,C2:.10};
export const INDICATORS: Record<Indicator, LocalText> = {
 T1:tr('Свободные дороги','Road flow','Еркін жолдар'), T2:tr('Общественный транспорт','Public transport','Қоғамдық көлік'), E1:tr('Озеленение','Green space','Көгалдандыру'), E2:tr('Чистый воздух','Clean air','Таза ауа'), S1:tr('Школы и детсады','Schools & kindergartens','Мектептер мен балабақшалар'), S2:tr('Доступная медицина','Healthcare access','Медициналық қолжетімділік'), B1:tr('Безопасность улиц','Street safety','Көше қауіпсіздігі'), B2:tr('Безопасность дорог','Road safety','Жол қауіпсіздігі'), C1:tr('Надёжность ЖКХ','Utility reliability','ТКШ сенімділігі'), C2:tr('Обращения жителей','Resident requests','Тұрғындар өтініштері')
};
export const CATEGORIES: Record<Category, {name: LocalText; color:string; keys:Indicator[]}> = {
 transport:{name:tr('Транспорт','Transport','Көлік'),color:'#497cbb',keys:['T1','T2']},
 ecology:{name:tr('Экология','Ecology','Экология'),color:'#578268',keys:['E1','E2']},
 social:{name:tr('Соцсфера','Community','Әлеуметтік сала'),color:'#bd8653',keys:['S1','S2']},
 safety:{name:tr('Безопасность','Safety','Қауіпсіздік'),color:'#9180b6',keys:['B1','B2']},
 services:{name:tr('Сервисы','Services','Қызметтер'),color:'#57949c',keys:['C1','C2']}
};
export interface District { id: DistrictId; name:LocalText; pop:number; metrics:Metrics; profile:LocalText; position:[number,number]; }
const metrics = (values:number[]):Metrics => Object.fromEntries(KEYS.map((k,i)=>[k,values[i]])) as Metrics;
export const DISTRICTS: District[] = [
 {id:'esil',name:tr('Есиль','Esil','Есіл'),pop:.27,metrics:metrics([45,62,68,72,48,55,78,60,75,70]),profile:tr('Мостам тесно. Школам тоже.','Busy bridges. Crowded classrooms.','Көпірлерде кептеліс. Мектептерде орын тапшы.'),position:[2.5,2.6]},
 {id:'almaty',name:tr('Алматы','Almaty','Алматы'),pop:.24,metrics:metrics([40,75,50,55,60,65,62,52,50,60]),profile:tr('Старые сети и пробки ждут решения.','Aging utilities and traffic need attention.','Ескі желілер мен кептелістер шешім күтуде.'),position:[3.2,-2.6]},
 {id:'saryarka',name:tr('Сарыарка','Saryarka','Сарыарқа'),pop:.20,metrics:metrics([50,70,42,40,62,68,58,55,45,55]),profile:tr('Больше деревьев. Меньше зимнего смога.','More trees. Less winter smog.','Көбірек ағаш. Қыста азырақ түтін.'),position:[-3.2,-2.6]},
 {id:'baikonur',name:tr('Байконур','Baikonur','Байқоңыр'),pop:.13,metrics:metrics([52,68,55,50,58,60,52,58,55,58]),profile:tr('Стабильный район. Есть куда расти.','A steady district with room to improve.','Тұрақты аудан. Дамуға мүмкіндік бар.'),position:[0,-3.4]},
 {id:'nura',name:tr('Нура','Nura','Нұра'),pop:.16,metrics:metrics([55,40,45,65,38,35,55,50,60,50]),profile:tr('Растущему району нужны школы и медицина.','A growing district needs schools and healthcare.','Өсіп келе жатқан ауданға мектеп пен емхана керек.'),position:[-3,2.5]}
];
export interface Measure { id:string; category:Category; name:LocalText; description:LocalText; scope:'district'|'city'; cost:number; lag:number; effects:Partial<Metrics>; }
export const MEASURES:Measure[] = [
 {id:'M1',category:'transport',name:tr('Полоса для автобусов','Bus priority lanes','Автобус жолағы'),description:tr('Меньше времени в пути. Больше города для людей.','Less time commuting. More city for people.','Жолға аз уақыт. Адамдарға көбірек қала.'),scope:'district',cost:18,lag:2,effects:{T1:6,T2:9}},
 {id:'M2',category:'transport',name:tr('Умные светофоры','Smarter traffic lights','Ақылды бағдаршамдар'),description:tr('Зелёная волна для всего города.','A green wave across the whole city.','Бүкіл қалаға жасыл толқын.'),scope:'city',cost:22,lag:2,effects:{T1:4,B2:3}},
 {id:'M3',category:'transport',name:tr('Новая линия ЛРТ','A new light rail line','Жаңа LRT желісі'),description:tr('Большая стройка. Долгий горизонт.','A big investment with a longer horizon.','Ірі құрылыс. Ұзақ мерзімді нәтиже.'),scope:'district',cost:30,lag:4,effects:{T1:16,T2:20,E2:4}},
 {id:'M4',category:'ecology',name:tr('Парк у дома','A neighborhood park','Үй жанындағы саябақ'),description:tr('Место, где район может выдохнуть.','A little room for the neighborhood to breathe.','Аудан тұрғындарына демалыс орны.'),scope:'district',cost:15,lag:2,effects:{E1:12,E2:3,B1:2}},
 {id:'M5',category:'ecology',name:tr('Чистое тепло','Cleaner home heating','Таза жылу'),description:tr('Чистое топливо вместо зимнего смога.','Cleaner fuel instead of winter smog.','Қысқы түтіннің орнына таза отын.'),scope:'district',cost:25,lag:3,effects:{E2:14,C1:4}},
 {id:'M6',category:'ecology',name:tr('Зелёный пояс','The green belt','Жасыл белдеу'),description:tr('Деревья и защита от степного ветра.','Trees and shelter from the steppe wind.','Ағаштар мен дала желінен қорғаныс.'),scope:'city',cost:20,lag:4,effects:{E1:5,E2:3}},
 {id:'M7',category:'social',name:tr('Школа и детсад','School & kindergarten','Мектеп пен балабақша'),description:tr('Ближе к дому. Без второй смены.','Closer to home. Fewer crowded classrooms.','Үйге жақын. Екінші ауысымсыз.'),scope:'district',cost:24,lag:3,effects:{S1:16}},
 {id:'M8',category:'social',name:tr('Семейная поликлиника','Family health center','Отбасылық емхана'),description:tr('Врач рядом, когда он нужен.','Care nearby, when it matters.','Қажет кезде дәрігер қасыңызда.'),scope:'district',cost:20,lag:3,effects:{S2:14}},
 {id:'M9',category:'social',name:tr('Спортивные дворы','Neighborhood sports hubs','Ауладағы спорт алаңдары'),description:tr('Активные дворы объединяют соседей.','Active spaces bring neighbors together.','Белсенді аула көршілерді біріктіреді.'),scope:'district',cost:10,lag:1,effects:{S1:3,S2:3,B1:3}},
 {id:'M10',category:'safety',name:tr('Светлые улицы','Brighter, safer streets','Жарық көшелер'),description:tr('Освещение и камеры для спокойных вечеров.','Lighting and cameras for safer evenings.','Тыныш кештерге арналған жарық пен камералар.'),scope:'district',cost:12,lag:1,effects:{B1:12,B2:2}},
 {id:'M11',category:'safety',name:tr('Безопасный путь в школу','Safer school crossings','Мектепке қауіпсіз жол'),description:tr('Безопаснее пешком, чуть медленнее на машине.','Safer on foot, slightly slower by car.','Жаяу қауіпсіз, көлікпен сәл баяу.'),scope:'district',cost:10,lag:1,effects:{B2:12,T1:-2}},
 {id:'M12',category:'services',name:tr('Город на связи','A city that listens','Байланыстағы қала'),description:tr('Единая платформа для обращений жителей.','One platform for every resident request.','Тұрғындар өтініштеріне арналған бірыңғай платформа.'),scope:'city',cost:14,lag:1,effects:{C2:5}},
 {id:'M13',category:'services',name:tr('Надёжные сети','Renew the utility network','Сенімді желілер'),description:tr('Тепло и вода без неприятных сюрпризов.','Reliable heat and water, fewer surprises.','Тұрақты жылу мен су.'),scope:'district',cost:28,lag:4,effects:{C1:18,E2:2}},
 {id:'M14',category:'services',name:tr('Быстрая помощь ЖКХ','Utility rapid response','ТКШ жедел көмегі'),description:tr('Замечать раньше. Исправлять быстрее.','Spot it earlier. Fix it faster.','Ертерек анықтау. Тезірек жөндеу.'),scope:'city',cost:16,lag:1,effects:{C1:5,C2:2}}
];
export const SYNERGIES = [
 {pair:['M1','M2'],indicator:'T1',bonus:2,name:tr('Зелёная волна','Green wave','Жасыл толқын')},
 {pair:['M10','M12'],indicator:'B1',bonus:2,name:tr('Город под защитой','Connected safety','Қала қорғаныста')},
 {pair:['M5','M6'],indicator:'E2',bonus:2,name:tr('Чистое дыхание','A breath of fresh air','Таза тыныс')}
] as const;
export const EXAMPLE = [{measureId:'M7',districtId:'nura'},{measureId:'M8',districtId:'nura'},{measureId:'M10',districtId:'nura'},{measureId:'M12'},{measureId:'M5',districtId:'saryarka'}] as const;
