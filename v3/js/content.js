/* Содержимое сайта — из файлов content/*.json, которые отель правит через админку (/admin/).
   Здесь только шаблоны: данные → разметка карточек. Оформление и анимации — в css/ и js/mockup.js.

   Правила для текста из админки:
   • весь текст выводится как текст (HTML и скрипты не выполняются);
   • [[текст в двойных скобках]] подсвечивается как «ещё не заполнено»;
   • записи с «Показывать на сайте» = нет и спецпредложения вне дат действия не выводятся. */
(function () {
  'use strict';

  const FILES = ['settings', 'offers', 'rooms', 'restaurant', 'fitness', 'business', 'tours', 'reviews', 'faq', 'documents'];
  const ARROW = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  // ---------- помощники ----------
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // текст из админки → безопасный HTML: [[…]] — заглушка, перенос строки — <br>
  const txt = (v) => esc(v).replace(/\[\[(.+?)\]\]/g, '<span class="ph">$1</span>').replace(/\n/g, '<br>');
  const plain = (v) => String(v ?? '').replace(/\[\[|\]\]/g, '');
  // те же правила текста — для других скриптов сайта (таблица сравнения номеров и т. п.)
  window.contentText = txt;
  // путь к фото: из админки может прийти «/папка-сайта/images/…» — приводим к «images/…», чтобы работало на любом адресе
  const img = (p) => {
    const s = String(p || '').trim();
    if (!s) return '';
    if (/^https?:\/\//.test(s)) return s;
    const i = s.indexOf('images/');
    return i >= 0 ? s.slice(i) : s.replace(/^\/+/, '');
  };
  const pos = (p) => esc(p || '50% 50%');
  const shown = (x) => x && x.published !== false;
  const today = new Date().toISOString().slice(0, 10);
  const inDates = (x) => (!x.active_from || x.active_from <= today) && (!x.active_to || x.active_to >= today);
  // безопасная ссылка: только http(s), tel:, mailto:, якорь или путь сайта
  const href = (u) => {
    const s = String(u || '').trim();
    return /^(https?:\/\/|tel:|mailto:|#|[\w./-]+$)/i.test(s) ? esc(s) : '#';
  };
  const plural = (n, one, few, many) => (n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many);
  // уменьшенная копия старых фото номеров для карточки (новые фото из админки уже сжаты)
  const roomCardImg = (p) => { const m = /^images\/rooms\/(\d+)\.webp$/.exec(img(p)); return m ? `images/cards/rooms-${m[1]}.webp` : img(p); };
  const TEMP = '<span class="rc__badge">Временное фото</span>';

  // ---------- шаблоны ----------
  function offer(o) {
    return `<article class="offer${o.featured ? ' offer--hero' : ''}">
          <div class="offer__media"><img src="${esc(img(o.image))}" alt="" loading="lazy" decoding="async" style="object-position:${pos(o.image_position)}">${o.badge ? `<span class="rc__badge">${txt(o.badge)}</span>` : ''}</div>
          <div class="offer__body">
            <h3 class="offer__title">${txt(o.title)}</h3>
            <ul class="offer__list">${(o.lines || []).map((l) => `<li>${txt(l)}</li>`).join('')}</ul>
            <div class="rc__foot"><p class="rc__price">от ${txt(o.price)}</p><button class="rc__btn" type="button" data-room-name="${esc(plain(o.booking_name || o.title))}">${txt(o.button_text || 'Забронировать')}</button></div>
          </div>
        </article>`;
  }

  function room(r) {
    const chips = [r.guests, r.area, r.feature].filter(Boolean).map((c) => `<li>${txt(c)}</li>`).join('');
    return `<li class="rt-room" data-img="${esc(img(r.photo))}" data-pos="${pos(r.photo_position)}" data-view="${esc(r.view || '')}">
              <button class="rt-room__photo" type="button" data-room-more aria-label="Фото и описание номера"><img src="${esc(roomCardImg(r.photo))}" alt="" loading="lazy" decoding="async" style="object-position:${pos(r.photo_position)}">${r.temp_photo ? TEMP : ''}</button>
              <div class="rt-room__info">
                <p class="rc__en">${txt(r.name_en)}</p>
                <h4 class="rt-room__title">${txt(r.name)}</h4>
                <ul class="rc__chips">${chips}</ul>
                <p class="rt-room__text">${txt(r.short)}</p>
                <template class="rc3__full">${esc(plain(r.description))}</template>
              </div>
              <div class="rt-room__side">
                <p class="rc__price">от ${txt(r.price)} / ночь</p>
                <div class="rt-room__actions">
                  <button class="btn-glass btn-glass--sm" type="button" data-room-more>Подробнее</button>
                  <button class="rc__btn" type="button" data-room-name="${esc(plain(r.name))}" data-exely-room="${esc(r.exely_code || '')}">Выбрать</button>
                </div>
              </div>
            </li>`;
  }

  function roomTab(c) {
    const list = (c.rooms || []).filter(shown);
    const n = list.length;
    const id = esc(c.id);
    return `<article class="room-tab" data-group="${id}">
        <img class="room-tab__bg" src="${esc(img(c.cover))}" alt="" loading="lazy" decoding="async" style="object-position:${pos(c.cover_position)}">
        <button class="room-tab__head" type="button" aria-expanded="false" aria-controls="room-tab-${id}">
          <span class="room-tab__title">${txt(c.title)} <span>${n}</span></span>
          <span class="room-tab__facts">${txt(c.facts)} · от ${txt(c.price)}</span>
          <span class="room-tab__sub">${txt(c.subtitle)}</span>
          <span class="room-tab__cta">Смотреть ${n} ${plural(n, 'номер', 'номера', 'номеров')} ${ARROW}</span>
          ${c.temp_photo ? '<span class="rc__badge room-tab__badge">Временное фото</span>' : ''}
        </button>
        <div class="room-tab__body" id="room-tab-${id}">
          <div class="room-tab__inner">
          <ul class="rt-list">
            ${list.map(room).join('\n            ')}
          </ul>
          <button class="btn-glass btn-glass--sm room-tab__close" type="button">Свернуть</button>
          </div>
        </div>
      </article>`;
  }

  function card(c, extraClass = '') {
    const btn = c.button_text ? `<a class="btn-glass btn-glass--sm discover__card-btn" href="${href(c.button_link || '#')}">${txt(c.button_text)}</a>` : '';
    return `<article class="${extraClass}icard" tabindex="0">
              <img class="icard__bg" src="${esc(img(c.image))}" alt="" loading="lazy" decoding="async" style="object-position:${pos(c.image_position)}">
              <div class="icard__shade" aria-hidden="true"></div>
              ${c.temp_photo ? '<span class="rc__badge icard__badge">Временное фото</span>' : ''}<span class="icard__plus" aria-hidden="true"></span>
              <div class="icard__body">
                <h3 class="icard__title">${txt(c.title)}</h3>
                <div class="icard__desc"><p>${txt(c.description)}</p></div>
                <p class="icard__meta">${txt(c.meta)}</p>${btn}
              </div>
            </article>`;
  }

  function review(r) {
    const n = Math.max(1, Math.min(5, Number(r.rating) || 5));
    const who = [txt(r.author), txt(r.date), r.link ? `<a href="${href(r.link)}" target="_blank" rel="noopener">${txt(r.source)}</a>` : txt(r.source)].filter(Boolean).join(' · ');
    return `<article class="review"><p class="review__stars" aria-label="Оценка ${n} из 5">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</p><p class="review__text">${txt(r.text)}</p><p class="review__who">${who}</p></article>`;
  }

  // ---------- вставка в страницу ----------
  const put = (sel, html) => { const el = document.querySelector(sel); if (el) el.innerHTML = html; return el; };

  function render(d) {
    const offers = (d.offers || []).filter((o) => shown(o) && inDates(o));
    put('.offers__grid', offers.map(offer).join('\n'));
    // нет действующих акций — блок не показываем вовсе
    document.getElementById('offers')?.toggleAttribute('hidden', !offers.length);

    put('.room-tabs', (d.rooms || []).filter(shown).map(roomTab).join('\n'));
    const roomsTotal = (d.rooms || []).filter(shown).reduce((a, c) => a + (c.rooms || []).filter(shown).length, 0);
    const cmp = document.querySelector('.rooms-compare__toggle');
    if (cmp) cmp.textContent = `Сравнить все ${roomsTotal} ${plural(roomsTotal, 'номер', 'номера', 'номеров')}`;

    put('#restaurant-cards', (d.restaurant || []).filter(shown).map((c) => card(c)).join('\n'));
    put('#services-track', (d.fitness || []).filter(shown).map((c) => `<div class="services__slide">${card(c)}</div>`).join('\n'));
    put('#business-cards', (d.business || []).filter(shown).map((c) => card(c)).join('\n'));
    put('#discover-track', (d.tours || []).filter(shown).map((c) => card(c, 'discover__card ')).join('\n'));

    const rv = d.reviews || {};
    put('.reviews__rating', `<b>${txt(rv.rating)} / 5</b> · ${txt(rv.sources)}`);
    put('.reviews__grid', (rv.items || []).filter(shown).map(review).join('\n'));

    put('.faq__list', (d.faq || []).filter(shown).map((f) => `<details class="faq__item"><summary>${txt(f.question)}</summary><p>${txt(f.answer)}</p></details>`).join('\n'));

    // контакты, адрес, реквизиты, документы, соцсети
    const s = d.settings || {};
    const c = s.contacts || {};
    const rq = s.requisites || {};
    window.HOTEL_CONTACTS = { whatsapp: String(c.whatsapp || '').replace(/\D/g, ''), phone: c.phone || '', email: c.email || '' };
    document.querySelectorAll('[data-content="address"]').forEach((el) => { el.innerHTML = txt(c.address); });
    document.querySelectorAll('[data-content="airport"]').forEach((el) => { el.innerHTML = txt(c.airport_time); });
    document.querySelectorAll('[data-content="parking"]').forEach((el) => { el.innerHTML = txt(c.parking); });
    put('[data-content="requisites"]', [
      `<p>${txt(rq.company)}</p>`,
      `<p>БИН/ИИН: ${txt(rq.bin)}</p>`,
      `<p>Юр. адрес: ${txt(rq.legal_address)}</p>`,
      `<p>Банк: ${txt(rq.bank)}, БИК ${txt(rq.bik)}, ИИК ${txt(rq.iik)}</p>`,
      c.email ? `<p><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></p>` : '',
    ].join(''));
    put('[data-content="documents"]', (d.documents || []).filter(shown).map((doc) => `<a href="doc.html?d=${encodeURIComponent(doc.slug)}">${txt(doc.title)}</a>`).join(''));
    // соцсети: без ссылки — значок не показываем
    const social = s.social || {};
    document.querySelectorAll('[data-social]').forEach((a) => {
      const url = social[a.dataset.social];
      if (url) { a.href = url; a.hidden = false; } else { a.hidden = true; }
    });
  }

  // ---------- загрузка ----------
  const base = document.currentScript?.dataset.contentBase || 'content/';
  const load = (name) => fetch(`${base}${name}.json`, { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${name}.json: ${r.status}`))))
    .catch((err) => { console.error('[content]', err); return null; });

  const data = Promise.all(FILES.map(load)).then((list) => Object.fromEntries(FILES.map((f, i) => [f, list[i]])));
  const domReady = new Promise((ok) => (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', ok, { once: true }) : ok()));

  // остальные скрипты сайта ждут, пока содержимое встанет на место
  window.contentReady = Promise.all([data, domReady]).then(([d]) => {
    window.SITE_CONTENT = d;
    try { render(d); } catch (err) { console.error('[content] render', err); }
    document.documentElement.classList.add('content-ready');
    return d;
  });
})();
