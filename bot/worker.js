// Telegram bot for "Сайты от Nurbolat" on Cloudflare Workers (free plan).
// Answers clients from the knowledge base below, takes orders and forwards
// every client message to the owner. The owner replies to a forwarded message
// in Telegram and the bot delivers the answer to the client.
//
// Environment variables (Workers → Settings → Variables and Secrets):
//   BOT_TOKEN       token from @BotFather (secret)
//   WEBHOOK_SECRET  any random string, letters and digits (secret)
//   ADMIN_CHAT_ID   owner's chat id; send /myid to the bot to get it

const SITE = 'https://abylakhan.github.io/nurbolat-sites/';
const WHATSAPP = 'https://wa.me/77471541449';
const TELEGRAM = 'https://t.me/nurrrvsx';
const INSTAGRAM = 'https://www.instagram.com/nuurrrr_a/';

const DEMOS = [
  { id: 'dental', url: 'https://abylakhan.github.io/dental-clinic-shymkent/', ru: 'Стоматология', kk: 'Стоматология' },
  { id: 'beauty', url: SITE + 'beauty.html', ru: 'Салон красоты', kk: 'Сұлулық салоны' },
  { id: 'edu', url: SITE + 'edu.html', ru: 'Учебный центр', kk: 'Оқу орталығы' },
  { id: 'auto', url: SITE + 'auto.html', ru: 'Автосалон', kk: 'Автосалон' },
  { id: 'build', url: SITE + 'build.html', ru: 'Ремонт и строительство', kk: 'Жөндеу және құрылыс' },
  { id: 'cargo', url: SITE + 'cargo.html', ru: 'Карго и доставка', kk: 'Карго және жеткізу' }
];

// Prices and timelines match the calculator on the site.
const PACKS = [
  { price: 40000, days: '3–5', ru: ['Одностраничный сайт', 'одна страница до 7 блоков, 3 языка, заявки в WhatsApp'], kk: ['Бір беттік сайт', '7 блокқа дейінгі бір бет, 3 тіл, өтінімдер WhatsApp-қа'] },
  { price: 80000, days: '7–14', ru: ['Многостраничный сайт', 'до 8 страниц: услуги, цены, о компании'], kk: ['Көпбетті сайт', '8 бетке дейін: қызметтер, бағалар, компания туралы'] },
  { price: 140000, days: '14–21', ru: ['Интернет-магазин', 'каталог, корзина, заказ и онлайн-оплата'], kk: ['Интернет-дүкен', 'каталог, себет, тапсырыс және онлайн-төлем'] },
  { price: 200000, days: '10–18', ru: ['Сайт с CRM', 'многостраничный сайт и Bitrix24 или amoCRM'], kk: ['CRM қосылған сайт', 'көпбетті сайт және Bitrix24 немесе amoCRM'] },
  { price: 35000, days: '3–5', ru: ['Telegram-бот', 'меню, ответы на вопросы, заявки'], kk: ['Telegram-бот', 'мәзір, сұрақтарға жауап, өтінімдер'] },
  { price: 90000, days: '7–12', ru: ['Бот с записью или магазином', 'запись на время или каталог с заказом'], kk: ['Жазылу немесе дүкені бар бот', 'уақытқа жазылу немесе тапсырыс беретін каталог'] },
  { price: 350000, days: '21–42', ru: ['Индивидуальный проект', 'своя админка, личный кабинет, веб-сервис'], kk: ['Жеке жоба', 'жеке әкімшілік панель, жеке кабинет, веб-сервис'] }
];

const ADDONS = [
  { price: 10000, ru: 'Карточки в 2GIS и Google Картах', kk: '2GIS және Google Карталардағы карточкалар' },
  { price: 15000, ru: 'Тексты под ключ', kk: 'Дайын мәтіндер' },
  { price: 20000, ru: 'Квиз или калькулятор цены', kk: 'Квиз немесе баға калькуляторы' },
  { price: 30000, ru: 'Telegram-бот для заявок с сайта', kk: 'Сайт өтінімдеріне арналған Telegram-бот' },
  { price: 30000, ru: 'SEO-настройка', kk: 'SEO-баптау' },
  { price: 35000, ru: 'Онлайн-запись', kk: 'Онлайн-жазылу' },
  { price: 40000, ru: 'Подключение CRM', kk: 'CRM қосу' },
  { price: 40000, ru: 'Онлайн-оплата', kk: 'Онлайн-төлем' },
  { price: 70000, ru: 'ИИ-помощник (сервис ИИ оплачивается отдельно)', kk: 'ЖИ-көмекші (ЖИ сервисі бөлек төленеді)' }
];

const FAQ = {
  ru: [
    ['Сколько стоят домен и хостинг?', 'Они оплачиваются отдельно, раз в год, и оформляются на вас. Так сайт остаётся вашим, даже если мы перестанем работать вместе. Точную сумму скажу до начала работы.'],
    ['Нужно ли платить за CRM?', 'Мне вы платите только за подключение. Подписку на CRM вы оплачиваете сервису напрямую. У Bitrix24 есть бесплатный тариф, с него можно начать.'],
    ['Как проходит оплата?', 'Половина перед началом работы, половина после запуска сайта. Перевод на Kaspi.'],
    ['Что нужно от меня?', 'Логотип, фотографии, список услуг с ценами и контакты. Если текстов нет, напишу их сам, это отдельная опция в расчёте.'],
    ['Можно ли потом менять цены и тексты?', 'Да. Первые 14 дней правки бесплатные. Дальше можно взять поддержку за 10 000 ₸ в месяц: вы пишете, что изменить, я делаю в течение дня.'],
    ['Работаете с другими городами?', 'Да, удалённо по всему Казахстану. Всё обсуждаем в WhatsApp, Telegram или по звонку.']
  ],
  kk: [
    ['Домен мен хостинг қанша тұрады?', 'Олар бөлек, жылына бір рет төленеді және сіздің атыңызға рәсімделеді. Осылайша бірге жұмыс істеуді тоқтатсақ та, сайт сізде қалады. Нақты соманы жұмыс басталғанға дейін айтамын.'],
    ['CRM үшін төлеу керек пе?', 'Маған тек қосу жұмысы үшін төлейсіз. CRM жазылымын сервиске тікелей өзіңіз төлейсіз. Bitrix24-те тегін тариф бар, содан бастауға болады.'],
    ['Төлем қалай жүргізіледі?', 'Жартысы жұмыс басталар алдында, жартысы сайт іске қосылғаннан кейін. Kaspi арқылы аударым.'],
    ['Менен не қажет?', 'Логотип, фотосуреттер, бағалары көрсетілген қызметтер тізімі және байланыс деректері. Мәтін болмаса, өзім жазып беремін, бұл есептегі бөлек опция.'],
    ['Кейін бағалар мен мәтіндерді өзгертуге бола ма?', 'Иә. Алғашқы 14 күнде түзету тегін. Одан кейін айына 10 000 ₸ қолдау қызметін алуға болады: не өзгерту керегін жазасыз, мен бір күн ішінде жасаймын.'],
    ['Басқа қалалармен жұмыс істейсіз бе?', 'Иә, бүкіл Қазақстан бойынша қашықтан жұмыс істеймін. Барлығын WhatsApp, Telegram немесе қоңырау арқылы талқылаймыз.']
  ]
};

const T = {
  ru: {
    hello: 'Здравствуйте! Я бот Нурболата, он делает сайты и Telegram-ботов для бизнеса.\n\nОдностраничный сайт от 40 000 ₸, запуск от 3 дней. Казахский, русский и английский. Заявки приходят вам в WhatsApp или Telegram.\n\nВыберите, что интересно, или просто напишите вопрос.',
    menu: 'Что ещё показать?',
    btn: { prices: '💰 Цены', demos: '🖼 Примеры сайтов', process: '⚙️ Как идёт работа', faq: '❓ Частые вопросы', order: '📝 Оставить заявку', contact: '💬 Связаться с Нурболатом', lang: '🇰🇿 Қазақша' },
    prices_h: 'Цены (указаны «от», точная сумма зависит от объёма работы):',
    addons_h: 'Можно добавить к сайту:',
    support: 'Поддержка после запуска: 10 000 ₸ в месяц.',
    calc: 'Посчитать точнее можно в калькуляторе на сайте: ' + SITE + '#prices',
    days: 'дней',
    demos_h: 'Примеры для разных ниш. Откройте свою и посмотрите, как может выглядеть ваш сайт:',
    process: 'Как идёт работа:\n\n1. Знакомство. Полчаса в WhatsApp или по звонку: чем вы занимаетесь и откуда приходят клиенты.\n2. План и цена. Присылаю структуру сайта, точную цену и срок. После согласования предоплата 50%.\n3. Дизайн. Показываю первый экран и общий стиль, правим, пока вам не понравится.\n4. Сборка. Собираю сайт, подключаю заявки, домен и хостинг.\n5. Запуск. Сайт в интернете, вторая половина оплаты и 14 дней бесплатных правок.',
    faq_h: 'Выберите вопрос:',
    order_niche: 'Для какого бизнеса нужен сайт?',
    other: 'Другое',
    order_phone: 'Отлично! Напишите, пожалуйста, ваше имя и номер телефона (или нажмите кнопку ниже). Нурболат свяжется с вами сегодня.',
    share_phone: '📱 Отправить мой номер',
    order_done: 'Спасибо! Заявка передана Нурболату, он скоро напишет вам. Если удобнее сразу, вот WhatsApp: ' + WHATSAPP,
    contact: 'Напишите Нурболату напрямую:',
    forwarded: 'Передал ваш вопрос Нурболату, он ответит здесь же в ближайшее время. А пока можно посмотреть цены и примеры 👇',
    hi_back: 'Здравствуйте! Чем могу помочь? Выберите пункт ниже или напишите вопрос.',
    bot_info: 'Telegram-бот от 35 000 ₸, 3–5 дней: меню с услугами и ценами, ответы на частые вопросы, приём заявок с уведомлением вам. Бот с записью на время или каталогом заказов от 90 000 ₸, 7–12 дней. Сервер для бота оплачивается отдельно.',
    term: 'Сроки: одностраничный сайт 3–5 дней, многостраничный 7–14 дней, интернет-магазин 14–21 день. Точный срок скажу после короткого разговора о задаче.'
  },
  kk: {
    hello: 'Сәлеметсіз бе! Мен Нұрболаттың ботымын, ол бизнеске сайт және Telegram-бот жасайды.\n\nБір беттік сайт 40 000 ₸ бастап, іске қосу 3 күннен бастап. Қазақ, орыс және ағылшын тілдерінде. Өтінімдер сізге WhatsApp-қа немесе Telegram-ға келеді.\n\nҚызықтыратынын таңдаңыз немесе сұрағыңызды жазыңыз.',
    menu: 'Тағы не көрсетейін?',
    btn: { prices: '💰 Бағалар', demos: '🖼 Сайт үлгілері', process: '⚙️ Жұмыс барысы', faq: '❓ Жиі сұрақтар', order: '📝 Өтінім қалдыру', contact: '💬 Нұрболатпен байланысу', lang: '🇷🇺 Русский' },
    prices_h: 'Бағалар («бастап» деп көрсетілген, нақты сома жұмыс көлеміне байланысты):',
    addons_h: 'Сайтқа қосуға болады:',
    support: 'Іске қосқаннан кейінгі қолдау: айына 10 000 ₸.',
    calc: 'Сайттағы калькулятормен нақтырақ есептеуге болады: ' + SITE + '#prices',
    days: 'күн',
    demos_h: 'Әртүрлі салаларға арналған үлгілер. Өз салаңызды ашып, сайтыңыз қалай көрінетінін қараңыз:',
    process: 'Жұмыс барысы:\n\n1. Танысу. WhatsApp-та немесе қоңырау арқылы жарты сағат: немен айналысатыныңыз және клиенттер қайдан келетіні.\n2. Жоспар және баға. Сайт құрылымын, нақты бағаны және мерзімді жіберемін. Келіскеннен кейін 50% алдын ала төлем.\n3. Дизайн. Бірінші экран мен жалпы стильді көрсетемін, сізге ұнағанша түзетеміз.\n4. Жинақтау. Сайтты жинап, өтінімдерді, домен мен хостингті қосамын.\n5. Іске қосу. Сайт интернетте, төлемнің екінші жартысы және 14 күн тегін түзету.',
    faq_h: 'Сұрақты таңдаңыз:',
    order_niche: 'Сайт қандай бизнеске керек?',
    other: 'Басқа',
    order_phone: 'Керемет! Атыңыз бен телефон нөміріңізді жазыңыз (немесе төмендегі батырманы басыңыз). Нұрболат бүгін сізбен байланысады.',
    share_phone: '📱 Нөмірімді жіберу',
    order_done: 'Рахмет! Өтінім Нұрболатқа жіберілді, ол жақында жазады. Бірден ыңғайлы болса, WhatsApp: ' + WHATSAPP,
    contact: 'Нұрболатқа тікелей жазыңыз:',
    forwarded: 'Сұрағыңызды Нұрболатқа жібердім, ол осында жақын арада жауап береді. Әзірге бағалар мен үлгілерді қарауға болады 👇',
    hi_back: 'Сәлеметсіз бе! Немен көмектесейін? Төменнен таңдаңыз немесе сұрағыңызды жазыңыз.',
    bot_info: 'Telegram-бот 35 000 ₸ бастап, 3–5 күн: қызметтер мен бағалар мәзірі, жиі сұрақтарға жауап, өтінім қабылдау және сізге хабарлама. Уақытқа жазылу немесе тапсырыс каталогы бар бот 90 000 ₸ бастап, 7–12 күн. Бот серверіне бөлек төленеді.',
    term: 'Мерзімі: бір беттік сайт 3–5 күн, көпбетті сайт 7–14 күн, интернет-дүкен 14–21 күн. Нақты мерзімді тапсырма туралы қысқа әңгімеден кейін айтамын.'
  }
};

// Marker inside the bot's "send your phone" message: a reply to it is an order.
const ORDER_MARK = '📝';

const fmt = n => n.toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₸';
const isKk = text => /[әғқңөұүһі]/i.test(text || '');

function menu(lang) {
  const b = T[lang].btn;
  return { inline_keyboard: [
    [{ text: b.prices, callback_data: lang + ':prices' }, { text: b.demos, callback_data: lang + ':demos' }],
    [{ text: b.process, callback_data: lang + ':process' }, { text: b.faq, callback_data: lang + ':faq' }],
    [{ text: b.order, callback_data: lang + ':order' }],
    [{ text: b.contact, callback_data: lang + ':contact' }, { text: b.lang, callback_data: (lang === 'ru' ? 'kk' : 'ru') + ':start' }]
  ] };
}

function pricesText(lang) {
  const t = T[lang];
  const packs = PACKS.map(p => `• ${p[lang][0]}: от ${fmt(p.price)}, ${p.days} ${t.days}\n   ${p[lang][1]}`);
  const addons = ADDONS.map(a => `• ${a[lang]}: +${fmt(a.price)}`);
  let text = `${t.prices_h}\n\n${packs.join('\n')}\n\n${t.addons_h}\n${addons.join('\n')}\n\n${t.support}\n\n${t.calc}`;
  if (lang === 'kk') text = text.replace(/: от ([\d ]+ ₸)/g, ': $1 бастап');
  return text;
}

// Free-text questions: the first rule whose pattern matches answers.
const RULES = [
  { re: /домен|хостинг|hosting|domain/i, faq: 0 },
  { re: /crm|битрикс|bitrix|amo/i, faq: 1 },
  { re: /оплат|предоплат|kaspi|каспи|төле|рассроч/i, faq: 2 },
  { re: /что нужно от|что от меня|не қажет|не керек/i, faq: 3 },
  { re: /правк|поменять|изменить|поддержк|өзгерт|түзет/i, faq: 4 },
  { re: /город|алмат|астан|қала|удал[её]нн/i, faq: 5 },
  { re: /(^|[^а-яёa-z])(бот|bot)|телеграм|telegram/i, key: 'bot_info' },
  { re: /срок|сколько дней|как быстро|когда будет|мерзім|қанша күн/i, key: 'term' },
  { re: /цен|стоим|сколько|прайс|тариф|дорог|баға|қанша|price/i, action: 'prices' },
  { re: /пример|демо|портфолио|работ[ыа]|посмотреть|үлгі|demo/i, action: 'demos' },
  { re: /заказ|хочу сайт|нужен сайт|заявк|тапсырыс|өтінім|керек/i, action: 'order' },
  { re: /^\s*(привет|здравств|добрый|салам|сәлем|салем|hi|hello|ассалам)/i, key: 'hi_back' }
];

export function match(text) {
  return RULES.find(r => r.re.test(text)) || null;
}

async function tg(env, method, body) {
  const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json().catch(() => ({}));
}

const send = (env, chat_id, text, reply_markup) =>
  tg(env, 'sendMessage', { chat_id, text, reply_markup, disable_web_page_preview: true });

function who(from) {
  const name = [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Без имени';
  return from.username ? `${name} (@${from.username})` : name;
}

// Everything the owner receives carries "#id<chat>" so a reply can be routed back.
async function notifyAdmin(env, from, chatId, title, body) {
  if (!env.ADMIN_CHAT_ID) return;
  const text = `${title}\n👤 ${who(from)}\n#id${chatId}\n\n${body}\n\n↩️ Ответьте на это сообщение, и бот перешлёт ответ клиенту.`;
  await send(env, env.ADMIN_CHAT_ID, text);
}

async function show(env, chatId, lang, action) {
  const t = T[lang];
  if (action === 'start') return send(env, chatId, t.hello, menu(lang));
  if (action === 'prices') return send(env, chatId, pricesText(lang), menu(lang));
  if (action === 'process') return send(env, chatId, t.process, menu(lang));
  if (action === 'demos') {
    const rows = DEMOS.map(d => [{ text: d[lang], url: d.url }]);
    rows.push([{ text: lang === 'ru' ? 'Все работы и цены' : 'Барлық жұмыстар мен бағалар', url: SITE }]);
    return send(env, chatId, t.demos_h, { inline_keyboard: rows });
  }
  if (action === 'faq') {
    const rows = FAQ[lang].map((q, i) => [{ text: q[0], callback_data: `${lang}:q${i}` }]);
    return send(env, chatId, t.faq_h, { inline_keyboard: rows });
  }
  if (action === 'contact') {
    return send(env, chatId, t.contact, { inline_keyboard: [
      [{ text: 'WhatsApp', url: WHATSAPP }, { text: 'Telegram', url: TELEGRAM }],
      [{ text: 'Instagram', url: INSTAGRAM }]
    ] });
  }
  if (action === 'order') {
    const rows = [];
    for (let i = 0; i < DEMOS.length; i += 2) {
      rows.push(DEMOS.slice(i, i + 2).map(d => ({ text: d[lang], callback_data: `${lang}:n_${d.id}` })));
    }
    rows.push([{ text: t.other, callback_data: `${lang}:n_other` }]);
    return send(env, chatId, t.order_niche, { inline_keyboard: rows });
  }
  if (/^q\d$/.test(action)) {
    const q = FAQ[lang][Number(action.slice(1))];
    if (q) return send(env, chatId, `${q[0]}\n\n${q[1]}`, menu(lang));
  }
  if (action.startsWith('n_')) {
    const demo = DEMOS.find(d => d.id === action.slice(2));
    const niche = demo ? demo[lang] : t.other;
    return send(env, chatId, `${ORDER_MARK} ${niche}\n\n${t.order_phone}`, {
      keyboard: [[{ text: t.share_phone, request_contact: true }]],
      resize_keyboard: true, one_time_keyboard: true, input_field_placeholder: '+7 7__ ___ __ __'
    });
  }
}

async function onCallback(env, cq) {
  await tg(env, 'answerCallbackQuery', { callback_query_id: cq.id });
  const [lang, action] = String(cq.data || '').split(':');
  if (!T[lang] || !action || !cq.message) return;
  await show(env, cq.message.chat.id, lang, action);
}

// The owner answers a client by replying to a forwarded message.
async function onAdmin(env, msg) {
  const quoted = msg.reply_to_message && (msg.reply_to_message.text || '');
  const target = quoted && quoted.match(/#id(-?\d+)/);
  if (!target) {
    return send(env, msg.chat.id, 'Чтобы ответить клиенту, ответьте (Reply) на его сообщение с #id. Команды: /myid, /start.');
  }
  if (msg.text) {
    const r = await send(env, target[1], msg.text);
    return send(env, msg.chat.id, r.ok ? '✅ Отправлено клиенту' : `⚠️ Не отправилось: ${r.description || 'ошибка Telegram'}`);
  }
  const r = await tg(env, 'copyMessage', { chat_id: target[1], from_chat_id: msg.chat.id, message_id: msg.message_id });
  return send(env, msg.chat.id, r.ok ? '✅ Отправлено клиенту' : `⚠️ Не отправилось: ${r.description || 'ошибка Telegram'}`);
}

async function onMessage(env, msg) {
  const chatId = msg.chat.id;
  if (msg.chat.type !== 'private') return;
  const text = msg.text || msg.caption || '';

  if (text.startsWith('/myid')) return send(env, chatId, `Ваш chat id: ${chatId}`);

  const isAdmin = env.ADMIN_CHAT_ID && String(chatId) === String(env.ADMIN_CHAT_ID);
  if (isAdmin && !text.startsWith('/start')) return onAdmin(env, msg);

  const lang = isKk(text) || (msg.from.language_code === 'kk' && !text) ? 'kk' : 'ru';
  if (text.startsWith('/start')) return show(env, chatId, msg.from.language_code === 'kk' ? 'kk' : 'ru', 'start');

  // An order: a shared contact, a reply to the "send your phone" prompt, or a phone number.
  const prompt = msg.reply_to_message && msg.reply_to_message.from && msg.reply_to_message.from.is_bot
    ? msg.reply_to_message.text || '' : '';
  const hasPhone = /(\+?7|8)[\s\-()]*\d{3}[\s\-()]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}/.test(text);
  if (msg.contact || prompt.startsWith(ORDER_MARK) || hasPhone) {
    const niche = prompt.startsWith(ORDER_MARK) ? prompt.split('\n')[0].slice(ORDER_MARK.length).trim() : '—';
    const phone = msg.contact ? msg.contact.phone_number : '';
    await notifyAdmin(env, msg.from, chatId, '🔥 Новая заявка', `Ниша: ${niche}\nТелефон: ${phone || '—'}\nСообщение: ${text || '—'}`);
    return send(env, chatId, T[lang].order_done, { remove_keyboard: true });
  }

  const rule = text ? match(text) : null;
  if (rule && rule.faq !== undefined) {
    const q = FAQ[lang][rule.faq];
    return send(env, chatId, q[1], menu(lang));
  }
  if (rule && rule.key) return send(env, chatId, T[lang][rule.key], menu(lang));
  if (rule && rule.action) return show(env, chatId, lang, rule.action);

  // Unknown question, photo or voice message: the owner answers it personally.
  await notifyAdmin(env, msg.from, chatId, '💬 Вопрос от клиента', text || '(фото, голосовое или файл)');
  if (!text && env.ADMIN_CHAT_ID) {
    await tg(env, 'forwardMessage', { chat_id: env.ADMIN_CHAT_ID, from_chat_id: chatId, message_id: msg.message_id });
  }
  return send(env, chatId, T[lang].forwarded, menu(lang));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Open https://<worker>/setup?secret=<WEBHOOK_SECRET> once in a browser.
    if (url.pathname === '/setup') {
      if (!env.WEBHOOK_SECRET || url.searchParams.get('secret') !== env.WEBHOOK_SECRET) {
        return new Response('Wrong secret', { status: 403 });
      }
      const hook = await tg(env, 'setWebhook', {
        url: `${url.origin}/webhook`,
        secret_token: env.WEBHOOK_SECRET,
        allowed_updates: ['message', 'callback_query']
      });
      await tg(env, 'setMyCommands', { commands: [{ command: 'start', description: 'Меню / Мәзір' }] });
      return new Response(JSON.stringify(hook, null, 2), { headers: { 'content-type': 'application/json' } });
    }

    if (url.pathname === '/webhook' && request.method === 'POST') {
      if (request.headers.get('x-telegram-bot-api-secret-token') !== env.WEBHOOK_SECRET) {
        return new Response('Forbidden', { status: 403 });
      }
      const update = await request.json().catch(() => ({}));
      try {
        if (update.callback_query) await onCallback(env, update.callback_query);
        else if (update.message) await onMessage(env, update.message);
      } catch (err) {
        console.log('update failed', err && err.stack);
      }
      return new Response('ok');
    }

    return new Response('Bot is running');
  }
};
