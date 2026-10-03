/* Общий движок демо-сайтов: страницы по адресу (#/catalog), три языка, формы, плашка «демо».
   Каждый сайт вызывает Kit.init({...}) и описывает свои страницы и тексты. */
window.Kit = (function () {
  'use strict';
  var WA = '77471541449', NB = ' ', IDX = { ru: 0, kz: 1, en: 2 }, CODE = { ru: 'ru', kz: 'kk', en: 'en' };
  var C = {
    bar: ['Это демо-сайт. Названия, цены и данные условные.', 'Бұл демо-сайт. Атаулар, бағалар мен деректер шартты.', 'This is a demo site. Names, prices and data are placeholders.'],
    want: ['Хочу такой сайт', 'Осындай сайт керек', 'I want a site like this'],
    all: ['Все демо', 'Барлық демо', 'All demos'],
    from: ['от {p} ₸', '{p} ₸ бастап', 'from {p} ₸'],
    name: ['Ваше имя', 'Атыңыз', 'Your name'],
    phone: ['Телефон', 'Телефон', 'Phone'],
    send: ['Отправить заявку', 'Өтінім жіберу', 'Send request'],
    sentT: ['Заявка принята', 'Өтінім қабылданды', 'Request received'],
    sentD: ['Это демонстрация: заявка никуда не отправляется. На настоящем сайте она сразу придёт вам в Telegram, WhatsApp или CRM.', 'Бұл демонстрация: өтінім ешқайда жіберілмейді. Нақты сайтта ол бірден Telegram-ға, WhatsApp-қа немесе CRM-ге келеді.', 'This is a demo: nothing is actually sent. On a real site the request would arrive in your Telegram, WhatsApp or CRM right away.'],
    req: ['Заполните обязательные поля', 'Міндетті өрістерді толтырыңыз', 'Please fill in the required fields'],
    foot: ['Демонстрационный сайт. Разработка: Nurbolat.', 'Демонстрациялық сайт. Әзірлеуші: Nurbolat.', 'Demo website. Built by Nurbolat.'],
    addr: ['г. Шымкент, адрес для примера', 'Шымкент қ., мекенжай үлгі ретінде', 'Shymkent, sample address'],
    hours: ['Ежедневно с 9:00 до 20:00', 'Күн сайын 9:00–20:00', 'Daily, 9:00 to 20:00'],
    home: ['Главная', 'Басты бет', 'Home'],
    contacts: ['Контакты', 'Байланыс', 'Contacts'],
    comment: ['Комментарий', 'Түсініктеме', 'Comment'],
    date: ['Дата', 'Күні', 'Date'],
    time: ['Время', 'Уақыты', 'Time'],
    more: ['Подробнее', 'Толығырақ', 'Details'],
    allF: ['Все', 'Барлығы', 'All'],
    waMsg: ['Здравствуйте! Меня интересует сайт для {n}. Хотел бы узнать подробности.', 'Сәлеметсіз бе! Мені {n} арналған сайт қызықтырады. Толығырақ ақпарат алғым келеді.', 'Hello! I’m interested in a website for {n}. I would like to learn more.']
  };
  var cfg, lang = 'ru', view, toastEl, toastT;

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function L(v) { return Array.isArray(v) ? v[IDX[lang]] : v; }
  function s(k, vars) {
    var v = (cfg.S && cfg.S[k]) || C[k];
    v = v == null ? k : L(v);
    v = vars ? String(v).replace(/\{(\w+)\}/g, function (m, x) { return vars[x] == null ? '' : vars[x]; }) : v;
    return typeof v === 'string' ? v.replace(/ ₸/g, NB + '₸') : v;
  }
  function money(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : NB); }
  function tg(n) { return money(n) + NB + '₸'; }
  function from(n) { return s('from', { p: money(n) }); }
  function q(sel, root) { return (root || document).querySelector(sel); }
  function qa(sel, root) { return [].slice.call((root || document).querySelectorAll(sel)); }
  function route() { var p = location.hash.replace(/^#\/?/, '').split('/'); return { name: cfg.routes[p[0]] ? p[0] : 'home', args: p.slice(1).map(decodeURIComponent) }; }
  function go(path) { location.hash = '#/' + path; }
  function ph(id, ar, label) { return '<div class="ph" role="img" aria-label="' + esc(label || '') + '" style="--ar:' + (ar || '4/3') + ';background-image:url(https://images.unsplash.com/photo-' + id + '?w=1200&q=70&auto=format&fit=crop)"></div>'; }
  function fl(label, input) { return '<label class="fl"><span>' + esc(label) + '</span>' + input + '</label>'; }
  function np() { return '<div class="f2">' + fl(s('name'), '<input name="name" autocomplete="name" required>') + fl(s('phone'), '<input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 700 000 00 00" required>') + '</div>'; }
  function form(name, inner, btn) { return '<form class="f" data-form="' + name + '" novalidate>' + inner + '<p class="err" role="alert" hidden></p><div><button class="btn" type="submit">' + esc(btn || s('send')) + '</button></div></form>'; }
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 2600);
  }

  function chrome() {
    var r = route().name, text = cfg.brand.replace(/<[^>]+>/g, '');
    document.documentElement.lang = CODE[lang];
    var label = '';
    q('#kbar').innerHTML = '<div class="wrap"><span>' + esc(s('bar')) + '</span><a target="_blank" rel="noopener" href="https://wa.me/' + WA + '?text=' + encodeURIComponent(s('waMsg', { n: L(cfg.niche) })) + '">' + esc(s('want')) + '</a><a href="index.html#portfolio">' + esc(s('all')) + '</a></div>';
    q('#ktop').innerHTML = '<div class="wrap"><a class="brand" href="#/">' + cfg.brand + '</a><nav class="nav">' + cfg.nav.map(function (n) {
      if (n[0] === r) label = s(n[1]);
      return '<a href="#/' + n[0] + '"' + (n[0] === r ? ' aria-current="page"' : '') + '>' + esc(s(n[1])) + (n[2] ? n[2]() : '') + '</a>';
    }).join('') + '</nav><div class="lang" role="group">' + ['ru', 'kz', 'en'].map(function (l) { return '<button type="button" data-lang="' + l + '" aria-pressed="' + (l === lang) + '">' + l.toUpperCase() + '</button>'; }).join('') + '</div>' + (cfg.cta ? '<a class="btn s" href="#/' + cfg.cta[0] + '">' + esc(s(cfg.cta[1])) + '</a>' : '') + '</div>';
    q('#kfoot').innerHTML = '<div class="wrap"><span>' + esc(s('foot')) + '</span><span>' + esc(s('addr')) + ', +7 (700) 000-00-00</span></div>';
    document.title = text + (label ? ' | ' + label : '');
  }
  function render(top) {
    var r = route();
    view.innerHTML = cfg.routes[r.name].apply(null, r.args);
    chrome();
    if (cfg.after) cfg.after(r.name, r.args);
    if (top) { window.scrollTo(0, 0); view.classList.remove('in'); void view.offsetWidth; view.classList.add('in'); }
  }

  function submit(e) {
    var f = e.target; if (!f.getAttribute || !f.getAttribute('data-form')) return;
    e.preventDefault();
    var data = {}, rows = [], bad = false;
    qa('[name]', f).forEach(function (el) {
      if ((el.type === 'radio' || el.type === 'checkbox') && !el.checked) return;
      var v = el.tagName === 'SELECT' ? (el.selectedOptions[0] ? el.selectedOptions[0].textContent : '') : el.value.trim();
      if (el.required && !v) bad = true;
      data[el.name] = el.tagName === 'SELECT' ? el.value : v;
      var lab = el.getAttribute('data-l') || (el.closest('label') && q('span', el.closest('label')) ? q('span', el.closest('label')).textContent : el.name);
      if (v && el.type !== 'hidden') rows.push([lab, v]);
      if (el.type === 'hidden' && el.getAttribute('data-l') && v) rows.push([lab, v]);
    });
    var err = q('.err', f);
    if (bad) { err.textContent = s('req'); err.hidden = false; return; }
    var extra = cfg.onSubmit ? cfg.onSubmit(f.getAttribute('data-form'), data) : '';
    f.outerHTML = '<div class="ok in"><h3>' + esc(s('sentT')) + '</h3><dl>' + rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') + '</dl><p class="mu sm">' + esc(s('sentD')) + '</p>' + (extra || '') + '</div>';
  }

  function init(c) {
    cfg = c;
    var m = /[?&]lang=(ru|kz|en)/.exec(location.search), saved = store.get('demoLang', null);
    try { if (!saved) saved = localStorage.getItem('lang'); } catch (e) {}
    lang = m ? m[1] : (IDX[saved] != null ? saved : 'ru');
    document.body.innerHTML = '<div class="dbar" id="kbar"></div><header class="top" id="ktop"></header><main id="view"></main><footer id="kfoot"></footer><div class="toast" id="ktoast" role="status"></div>';
    view = q('#view'); toastEl = q('#ktoast');
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-lang]');
      if (b) { lang = b.getAttribute('data-lang'); store.set('demoLang', lang); try { history.replaceState(null, '', location.pathname + '?lang=' + lang + location.hash); } catch (err) {} render(false); return; }
      var sc = e.target.closest('[data-scroll]');
      if (sc) { var el = document.getElementById(sc.getAttribute('data-scroll')); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
    document.addEventListener('submit', submit);
    window.addEventListener('hashchange', function () { render(true); });
    render(true);
  }

  return { init: init, L: L, s: s, esc: esc, money: money, tg: tg, from: from, store: store, go: go, q: q, qa: qa, ph: ph, fl: fl, np: np, form: form, toast: toast, refresh: function () { render(false); }, lang: function () { return lang; } };
})();
