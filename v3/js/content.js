/* Содержимое сайта — из файлов content/*.json, которые отель правит через админку (/admin/).
   Здесь только шаблоны: данные → разметка карточек. Оформление и анимации — в css/ и js/mockup.js.

   Правила для текста из админки:
   • весь текст выводится как текст (HTML и скрипты не выполняются);
   • [[текст в двойных скобках]] подсвечивается как «ещё не заполнено»;
   • записи с «Показывать на сайте» = нет и спецпредложения вне дат действия не выводятся. */
(function () {
  'use strict';

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
  const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const list = (value) => Array.isArray(value) ? value : [];
  const published = (value) => list(value).filter((item) => isRecord(item) && item.published !== false);
  // безопасная ссылка: только http(s), tel:, mailto:, якорь или путь сайта
  const href = (u) => {
    const s = String(u || '').trim();
    return /^(https?:\/\/|tel:|mailto:|#|[\w./-]+$)/i.test(s) ? esc(s) : '#';
  };
  const plural = (n, one, few, many) => (n % 10 === 1 && n % 100 !== 11 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many);
  // уменьшенная копия старых фото номеров для карточки (новые фото из админки уже сжаты)
  const roomCardImg = (p) => { const m = /^images\/rooms\/(\d+)\.webp$/.exec(img(p)); return m ? `images/cards/rooms-${m[1]}.webp` : img(p); };
  const hasPrice = (value) => Boolean(String(value ?? '').trim()) && !String(value).includes('[[');
  const roomPrice = (value) => hasPrice(value) ? `от ${txt(value)} / ночь` : 'Цена уточняется';
  const TEMP = '<span class="rc__badge">Временное фото</span>';

  // ---------- шаблоны ----------
  function offer(o) {
    return `<article class="offer${o.featured ? ' offer--hero' : ''}">
          <div class="offer__media"><img src="${esc(img(o.image))}" alt="" loading="lazy" decoding="async" style="object-position:${pos(o.image_position)}">${o.badge ? `<span class="rc__badge">${txt(o.badge)}</span>` : ''}</div>
          <div class="offer__body">
            <h3 class="offer__title">${txt(o.title)}</h3>
            <ul class="offer__list">${list(o.lines).map((l) => `<li>${txt(l)}</li>`).join('')}</ul>
            <div class="rc__foot"><p class="rc__price">${hasPrice(o.price) ? `от ${txt(o.price)}` : 'Цена уточняется'}</p><button class="rc__btn" type="button" data-room-name="${esc(plain(o.booking_name || o.title))}">${txt(o.button_text || 'Забронировать')}</button></div>
          </div>
        </article>`;
  }

  function room(r) {
    const chips = ['guests', 'area', 'feature']
      .filter((key) => r[key])
      .map((key) => `<li data-room-fact="${key}">${txt(r[key])}</li>`)
      .join('');
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
                <p class="rc__price">${roomPrice(r.price)}</p>
                <div class="rt-room__actions">
                  <button class="btn-glass btn-glass--sm" type="button" data-room-more>Подробнее</button>
                  <button class="rc__btn" type="button" data-room-name="${esc(plain(r.name))}" data-exely-room="${esc(r.exely_code || '')}">Выбрать</button>
                </div>
              </div>
            </li>`;
  }

  function roomTab(c) {
    const list = c.rooms;
    const n = list.length;
    const id = esc(c.id);
    return `<article class="room-tab" data-group="${id}">
        <img class="room-tab__bg" src="${esc(img(c.cover))}" alt="" loading="lazy" decoding="async" style="object-position:${pos(c.cover_position)}">
        <button class="room-tab__head" type="button" aria-expanded="false" aria-controls="room-tab-${id}">
          <span class="room-tab__title">${txt(c.title)} <span>${n}</span></span>
          <span class="room-tab__facts">${txt(c.facts)} · ${hasPrice(c.price) ? `от ${txt(c.price)}` : 'Цена уточняется'}</span>
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
    const n = Math.max(1, Math.min(5, Math.round(Number(r.rating)) || 5));
    const who = [txt(r.author), txt(r.date), r.link ? `<a href="${href(r.link)}" target="_blank" rel="noopener">${txt(r.source)}</a>` : txt(r.source)].filter(Boolean).join(' · ');
    return `<article class="review"><p class="review__stars" aria-label="Оценка ${n} из 5">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</p><p class="review__text">${txt(r.text)}</p><p class="review__who">${who}</p></article>`;
  }

  // ---------- вставка в страницу ----------
  const put = (sel, html) => { const el = document.querySelector(sel); if (el) el.innerHTML = html; return el; };

  function renderOffers(data) {
    const today = window.hotelToday();
    const offers = published(data).filter((offer) =>
      (!offer.active_from || offer.active_from <= today) && (!offer.active_to || offer.active_to >= today));
    put('.offers__grid', offers.map(offer).join('\n'));
    // нет действующих акций — блок не показываем вовсе
    document.getElementById('offers').hidden = !offers.length;
    document.querySelectorAll('a[href="#offers"]').forEach((link) => { link.hidden = !offers.length; });
  }

  function renderRooms(data) {
    const roomsLoaded = Array.isArray(data);
    const groups = published(data)
      .map((group) => ({ ...group, rooms: published(group.rooms) }))
      .filter((group) => group.rooms.length);
    const roomsTotal = groups.reduce((sum, group) => sum + group.rooms.length, 0);
    const roomsStatus = document.getElementById('rooms-status');
    const roomsRetry = document.getElementById('rooms-retry');
    roomsStatus.hidden = roomsTotal > 0;
    roomsStatus.textContent = roomsLoaded ? 'Список категорий пока пуст.' : 'Не удалось загрузить номера. Попробуйте ещё раз.';
    roomsRetry.hidden = roomsLoaded;
    roomsRetry.addEventListener('click', () => location.reload());
    document.getElementById('rooms-category-count').textContent = roomsTotal
      ? ` · ${roomsTotal} ${plural(roomsTotal, 'категория', 'категории', 'категорий')}`
      : '';
    put('.room-tabs', groups.map(roomTab).join('\n'));
    const cmp = document.querySelector('.rooms-compare__toggle');
    cmp.parentElement.hidden = roomsTotal === 0;
    cmp.textContent = `Сравнить все ${roomsTotal} ${plural(roomsTotal, 'номер', 'номера', 'номеров')}`;
  }

  function renderList(selector, data, template) {
    put(selector, published(data).map(template).join('\n'));
  }

  function renderReviews(data) {
    const reviews = isRecord(data) ? data : {};
    put('.reviews__rating', reviews.rating ? `<b>${txt(reviews.rating)} / 5</b> · ${txt(reviews.sources)}` : '');
    renderList('.reviews__grid', reviews.items, review);
  }

  function httpsUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
    } catch {
      return '';
    }
  }

  function renderSettings(data) {
    const s = isRecord(data) ? data : {};
    const c = isRecord(s.contacts) ? s.contacts : {};
    const rq = isRecord(s.requisites) ? s.requisites : {};
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
    // Соцсети показываем только с корректной HTTPS-ссылкой.
    const social = isRecord(s.social) ? s.social : {};
    document.querySelectorAll('[data-social]').forEach((link) => {
      const url = httpsUrl(social[link.dataset.social]);
      link.hidden = !url;
      if (url) link.href = url;
    });
  }

  const renderers = {
    settings: renderSettings,
    offers: renderOffers,
    rooms: renderRooms,
    restaurant: (data) => renderList('#restaurant-cards', data, (item) => card(item)),
    fitness: (data) => renderList('#services-track', data, (item) => `<div class="services__slide">${card(item)}</div>`),
    business: (data) => renderList('#business-cards', data, (item) => card(item)),
    tours: (data) => renderList('#discover-track', data, (item) => card(item, 'discover__card ')),
    reviews: renderReviews,
    faq: (data) => renderList('.faq__list', data, (item) =>
      `<details class="faq__item"><summary>${txt(item.question)}</summary><p>${txt(item.answer)}</p></details>`),
    documents: (data) => renderList('[data-content="documents"]', data, (doc) =>
      `<a href="doc.html?d=${encodeURIComponent(doc.slug)}">${txt(doc.title)}</a>`),
  };

  // ---------- загрузка ----------
  const base = document.currentScript?.dataset.contentBase || 'content/';
  async function load(name) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`${base}${name}.json`, { cache: 'no-cache', signal: controller.signal });
      if (!response.ok) throw new Error(`${name}.json: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('[content]', err);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  const domReady = document.readyState === 'loading'
    ? new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }))
    : Promise.resolve();

  const sections = Object.entries(renderers).map(([name, render]) => [
    name,
    Promise.all([load(name), domReady]).then(([data]) => {
      try {
        render(data);
      } catch (err) {
        console.error(`[content] ${name}`, err);
      }
      return data;
    }),
  ]);
  window.contentSections = Object.fromEntries(sections);
  window.contentReady = Promise.all(sections.map(async ([name, ready]) => [name, await ready])).then((entries) => {
    const data = Object.fromEntries(entries);
    window.SITE_CONTENT = data;
    document.documentElement.classList.add('content-ready');
    return data;
  });
})();
