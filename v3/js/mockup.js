/* МАКЕТ v2 (предложения директора от 14.11.2026): закреплённая шапка, выбор дат на телефоне,
   номера тремя вкладышами, окно номера, слайд-шоу на первом экране (вариант). */
(function () {
  'use strict';

  const mobile = window.matchMedia('(max-width: 900px)');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function notify(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    // открытое окно перекрывает страницу — подсказку показываем внутри него
    const host = document.querySelector('dialog[open]') || document.body;
    if (toast.parentElement !== host) host.appendChild(toast);
    toast.textContent = message;
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    clearTimeout(notify._timer);
    notify._timer = setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => { toast.hidden = true; }, 300);
    }, 3200);
  }

  // Контакты отеля — из админки (Настройки → Контакты), их подставляет js/content.js.
  // Пока номера не заполнены, кнопки WhatsApp и телефон показывают подсказку.
  // (Номер +7 778 239-59-86 из старого сайта оказался чужим — не использовать.)
  let HOTEL_WA = '';
  let HOTEL_PHONE = '';

  function setWaLink(a) {
    if (!HOTEL_WA) return;
    const text = a.dataset.waText;
    a.href = `https://wa.me/${HOTEL_WA}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
    a.target = '_blank';
    a.rel = 'noopener';
  }

  function initContacts() {
    HOTEL_WA = window.HOTEL_CONTACTS?.whatsapp || '';
    HOTEL_PHONE = window.HOTEL_CONTACTS?.phone || '';
    document.querySelectorAll('[data-wa]').forEach(setWaLink);
    if (HOTEL_PHONE) {
      document.querySelectorAll('[data-tel]').forEach((a) => {
        a.href = `tel:${HOTEL_PHONE.replace(/[^\d+]/g, '')}`;
        a.textContent = HOTEL_PHONE;
      });
    }
    document.addEventListener('click', (e) => {
      if (!HOTEL_WA && e.target.closest('[data-wa]')) {
        e.preventDefault();
        notify('Номер WhatsApp отеля уточняется (макет)');
      } else if (!HOTEL_PHONE && e.target.closest('[data-tel]')) {
        e.preventDefault();
        notify('Телефон отеля уточняется (макет)');
      }
    });
  }

  // Закреплённая шапка появляется, когда первый экран ушёл из вида
  function initStickyBar() {
    const bar = document.getElementById('stickybar');
    const hero = document.getElementById('hero');
    if (!bar || !hero) return;
    const observer = new IntersectionObserver(([entry]) => {
      const visible = !entry.isIntersecting;
      bar.classList.toggle('is-visible', visible);
      bar.setAttribute('aria-hidden', visible ? 'false' : 'true');
      // спрятанная шапка недоступна и для клавиатуры: Tab не уходит в невидимые ссылки
      bar.inert = !visible;
    }, { rootMargin: '-120px 0px 0px 0px' });
    observer.observe(hero);

    // кнопка меню в закреплённой шапке открывает то же меню, что и на первом экране
    bar.querySelector('[data-open-menu]')?.addEventListener('click', () => {
      document.querySelector('.hero .menu-btn')?.click();
    });
  }

  // «Выбрать даты» / «Забронировать»: на телефоне — панель снизу, на компьютере — форма на первом экране
  function initDatesSheet() {
    const sheet = document.getElementById('booking-sheet');
    const overlay = document.getElementById('sheet-overlay');
    if (!sheet || !overlay) return;

    function open() {
      if (mobile.matches) {
        sheet.classList.add('is-open');
        overlay.hidden = false;
        document.body.classList.add('menu-open', 'dates-open');
        sheet.querySelector('[data-booking-trigger="checkin"]')?.focus({ preventScroll: true });
      } else {
        document.getElementById('hero').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
        setTimeout(() => sheet.querySelector('[data-booking-trigger="checkin"]')?.focus({ preventScroll: true }), 500);
      }
    }

    function close() {
      sheet.classList.remove('is-open');
      overlay.hidden = true;
      document.body.classList.remove('menu-open', 'dates-open');
    }

    document.querySelectorAll('[data-open-dates]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        open();
      });
    });
    document.querySelectorAll('[data-close-dates]').forEach((el) => el.addEventListener('click', close));

    // нижняя панель на телефоне: появляется, как только кнопка первого экрана ушла из вида, и дальше всегда на месте
    const heroBtn = document.querySelector('.hero__dates-btn');
    if (heroBtn) {
      new IntersectionObserver(([entry]) => {
        document.body.classList.toggle('bar-on', !entry.isIntersecting);
      }).observe(heroBtn);
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sheet.classList.contains('is-open')) close();
    });
    mobile.addEventListener('change', () => { if (!mobile.matches) close(); });
  }

  // Высота закреплённой шапки — чтобы при прокрутке к блоку он не прятался под ней
  function topOffset() {
    const bar = document.getElementById('stickybar');
    return (bar && bar.classList.contains('is-visible') ? bar.offsetHeight : 0) + 12;
  }

  // Свернуть блок, ушедший выше экрана, не сдвигая то, что гость сейчас видит.
  // Chrome сам компенсирует такой сдвиг, Safari — нет; поэтому на время изменения браузерная
  // компенсация выключается, а сдвиг видимого элемента замеряется и поправляется ровно на разницу.
  function keepView(block, change) {
    const root = document.documentElement;
    const ref = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    const useRef = ref && !block.contains(ref);
    const before = useRef ? ref.getBoundingClientRect().top : 0;
    root.style.overflowAnchor = 'none';
    change();
    if (useRef) {
      const delta = ref.getBoundingClientRect().top - before;
      if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: 'instant' });
    }
    requestAnimationFrame(() => requestAnimationFrame(() => { root.style.overflowAnchor = ''; }));
  }

  // Переход по ссылке внутри страницы (меню, подвал): открытый блок сворачиваем до начала прокрутки,
  // иначе он схлопнется по дороге и прокрутка не доедет до цели
  function beforeAnchorJump(handler) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a || a.matches('[data-open-dates]') || a.getAttribute('href').length < 2) return;
      const target = document.querySelector(a.getAttribute('href'));
      if (target) handler(target);
    }, true);
  }

  // Номера: три вкладыша. На компьютере раскрываются при наведении и сворачиваются, когда мышь ушла;
  // на телефоне — по нажатию. При сворачивании страница возвращается к этому вкладышу.
  function initRoomTabs() {
    const wrap = document.querySelector('.room-tabs');
    const tabs = [...document.querySelectorAll('.room-tab')];
    if (!wrap || !tabs.length) return;
    const hover = window.matchMedia('(hover: hover) and (min-width: 901px)');
    const dialog = document.getElementById('room-dialog');
    let switching = false;

    // ширина раскрытого вкладыша (flex-grow 3.4 против 1) — список сразу такой ширины и не перестраивается
    function setOpenWidth() {
      const gap = parseFloat(getComputedStyle(wrap).columnGap) || 0;
      const free = wrap.clientWidth - gap * (tabs.length - 1);
      wrap.style.setProperty('--rt-open-w', `${free * 3.4 / (tabs.length - 1 + 3.4)}px`);
      wrap.style.setProperty('--rt-narrow-w', `${free / (tabs.length - 1 + 3.4)}px`);
    }
    setOpenWidth();
    window.addEventListener('resize', setOpenWidth);

    function open(tab) {
      // запоминаем, где был заголовок у вкладышей, которые меняют состояние
      const moving = tabs.filter((t) => t.classList.contains('is-open') !== (t === tab));
      const headTop = (t) => t.querySelector('.room-tab__title').getBoundingClientRect().top - t.getBoundingClientRect().top;
      const before = new Map(moving.map((t) => [t, headTop(t)]));
      tabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle('is-open', on);
        t.querySelector('.room-tab__head').setAttribute('aria-expanded', on ? 'true' : 'false');
      });
      // компьютер: заголовок плавно поднимается снизу вверх (при сворачивании — опускается), как текст в турах
      if (!hover.matches || reduceMotion) return;
      moving.forEach((t) => {
        const head = t.querySelector('.room-tab__head');
        const dy = before.get(t) - headTop(t);
        if (Math.abs(dy) < 2 || typeof head.animate !== 'function') return;
        head.getAnimations?.().forEach((a) => a.cancel());
        head.animate(
          [{ transform: `translateY(${dy}px)`, opacity: 0.35 }, { transform: 'none', opacity: 1 }],
          { duration: 750, easing: 'cubic-bezier(0.45, 0, 0.2, 1)' },
        );
      });
    }

    // компьютер: вкладыш раскрывается, только если курсор задержался на нём,
    // и сворачивается с небольшой паузой — проведённая поперёк мышь не дёргает все три
    let hoverTimer = null;
    function hoverOpen(tab) {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => open(tab), tab.classList.contains('is-open') ? 0 : 140);
    }
    function hoverCloseAll() {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => open(null), 260);
    }

    // свернуть и вернуть пользователя к началу этого вкладыша
    function closeAndReturn(tab) {
      open(null);
      const top = tab.getBoundingClientRect().top;
      if (top < topOffset() || top > window.innerHeight * 0.6) {
        window.scrollTo({ top: top + window.scrollY - topOffset(), behavior: 'instant' });
      }
    }

    tabs.forEach((tab) => {
      const head = tab.querySelector('.room-tab__head');
      tab.addEventListener('mouseenter', () => { if (hover.matches) hoverOpen(tab); });
      head.addEventListener('focus', () => { if (hover.matches) open(tab); });
      head.addEventListener('click', () => {
        if (hover.matches) {
          open(tab);
          return;
        }
        if (tab.classList.contains('is-open')) {
          closeAndReturn(tab);
          return;
        }
        // телефон: соседний открытый вкладыш сворачивается, и всё ниже него уезжает вверх.
        // Держим нажатый заголовок под пальцем, а потом плавно подводим вкладыш к верху экрана.
        // Пока идёт переключение, автосворачивание «ушедшего с экрана» вкладыша не срабатывает.
        switching = true;
        const before = head.getBoundingClientRect().top;
        open(tab);
        window.scrollBy({ top: head.getBoundingClientRect().top - before, behavior: 'instant' });
        requestAnimationFrame(() => {
          window.scrollTo({
            top: tab.getBoundingClientRect().top + window.scrollY - topOffset(),
            behavior: reduceMotion ? 'auto' : 'smooth',
          });
          setTimeout(() => { switching = false; }, 900);
        });
      });
      tab.querySelector('.room-tab__close')?.addEventListener('click', () => closeAndReturn(tab));

      // телефон: вкладыш целиком ушёл с экрана — сворачиваем, не сдвигая то, что сейчас на экране
      new IntersectionObserver(([entry]) => {
        if (switching || hover.matches || entry.isIntersecting || !tab.classList.contains('is-open')) return;
        if (entry.boundingClientRect.bottom <= 0) keepView(tab, () => open(null));
        else open(null);
      }).observe(tab);
    });

    beforeAnchorJump((target) => {
      const current = tabs.find((t) => t.classList.contains('is-open'));
      if (!hover.matches && current && !current.contains(target)) open(null);
    });

    // компьютер: мышь или фокус ушли с вкладышей — все три возвращаются в исходное положение
    wrap.addEventListener('mouseleave', () => { if (hover.matches && !dialog?.open) hoverCloseAll(); });
    dialog?.addEventListener('close', () => {
      setTimeout(() => { if (hover.matches && !wrap.matches(':hover')) open(null); }, 50);
    });
    wrap.addEventListener('focusout', (e) => {
      if (hover.matches && !wrap.contains(e.relatedTarget) && !dialog?.open) open(null);
    });

    // телефон: нажатие вне вкладышей сворачивает открытый и возвращает к нему
    document.addEventListener('click', (e) => {
      // шапка, нижняя панель, меню, выбор дат и окна — не «нажатие мимо», страницу не дёргаем
      // только нажатия внутри блока номеров (мимо вкладышей); остальная страница вкладыш не трогает —
      // ушедший с экрана вкладыш и так сворачивается сам
      if (hover.matches || wrap.contains(e.target) || !e.target.closest('#rooms')
        || e.target.closest('dialog, .rooms-compare-bar, .rooms-compare')) return;
      const current = tabs.find((t) => t.classList.contains('is-open'));
      if (current) closeAndReturn(current);
    });
  }

  // Все ленты (спецпредложения, услуги, туры, отзывы) — одинаковые стрелки «назад / вперёд» под лентой
  // со счётчиком. Если всё помещается на экране, стрелки скрываются. Пальцем листать тоже можно.
  function initCarousels() {
    const arrow = (d) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="${d}"/></svg>`;
    const list = [
      { scroller: '.offers__grid', items: '.offers__grid', after: '.offers__grid', label: 'спецпредложения' },
      { scroller: '.services__viewport', items: '.services__track', after: '#services-carousel', label: 'услуги' },
      { scroller: '.discover__viewport', items: '.discover__track', after: '#discover-carousel', label: 'туры', inContainer: true },
      { scroller: '.reviews__grid', items: '.reviews__grid', after: '.reviews__grid', label: 'отзывы' },
      { scroller: '#restaurant-cards', items: '#restaurant-cards', after: '#restaurant-cards', label: 'ресторан' },
      { scroller: '#business-cards', items: '#business-cards', after: '#business-cards', label: 'для бизнеса' },
      // номера — во всех категориях, сколько бы их ни завёл отель в админке
      ...[...document.querySelectorAll('.room-tab')].map((tab) => {
        const sel = `.room-tab[data-group="${CSS.escape(tab.dataset.group)}"] .rt-list`;
        return { scroller: sel, items: sel, after: sel, label: 'номера', keepSpace: true };
      }),
    ];

    list.forEach((cfg) => {
      const scroller = document.querySelector(cfg.scroller);
      const track = document.querySelector(cfg.items);
      const anchor = document.querySelector(cfg.after);
      if (!scroller || !track || !anchor) return;
      const items = [...track.children];

      const nav = document.createElement('div');
      nav.className = 'cnav';
      nav.innerHTML = `<button class="cnav__btn" type="button" data-dir="-1" aria-label="Назад: ${cfg.label}">${arrow('M15 6l-6 6 6 6')}</button>`
        + '<span class="cnav__count" aria-live="polite"></span>'
        + `<button class="cnav__btn" type="button" data-dir="1" aria-label="Вперёд: ${cfg.label}">${arrow('M9 6l6 6-6 6')}</button>`;
      if (cfg.inContainer) {
        const box = document.createElement('div');
        box.className = 'container';
        box.appendChild(nav);
        anchor.after(box);
      } else {
        anchor.after(nav);
      }
      const [prev, next] = nav.querySelectorAll('.cnav__btn');
      const count = nav.querySelector('.cnav__count');

      function step() {
        return items.length > 1 ? items[1].offsetLeft - items[0].offsetLeft : scroller.clientWidth;
      }

      function update() {
        const max = scroller.scrollWidth - scroller.clientWidth;
        // во вкладышах номеров место под стрелки остаётся, чтобы все вкладыши были одной высоты
        if (cfg.keepSpace) nav.classList.toggle('is-static', max <= 2);
        else nav.hidden = max <= 2;
        const s = step();
        const visible = Math.max(1, Math.round(scroller.clientWidth / s));
        const pages = Math.max(1, items.length - visible + 1);
        const page = Math.min(pages, Math.round(scroller.scrollLeft / s) + 1);
        count.textContent = `${page} / ${pages}`;
        prev.disabled = scroller.scrollLeft <= 2;
        next.disabled = scroller.scrollLeft >= max - 2;
      }

      [prev, next].forEach((btn) => btn.addEventListener('click', () => {
        scroller.scrollBy({ left: Number(btn.dataset.dir) * step(), behavior: reduceMotion ? 'auto' : 'smooth' });
      }));
      scroller.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
      window.addEventListener('resize', update);
      if ('ResizeObserver' in window) new ResizeObserver(() => update()).observe(scroller);
      update();
    });
  }

  // «Как нас найти»: места подсвечиваются на схеме; «Открыть карту» раскрывает Яндекс-карту.
  // Карта остаётся открытой, пока её не свернули или пока блок не ушёл с экрана.
  function initFindUs() {
    const box = document.querySelector('.findus');
    if (!box) return;
    const toggle = box.querySelector('.findus__toggle');
    const mapWrap = box.querySelector('.findus__map');
    const frame = box.querySelector('.findus__frame');
    const places = [...box.querySelectorAll('.findus__place')];
    const points = [...box.querySelectorAll('.sch-point')];
    const hotel = `${box.dataset.hotelLon},${box.dataset.hotelLat}`;
    const pins = [`${hotel},pm2rdl`, ...places.map((p) => `${p.dataset.lon},${p.dataset.lat},pm2wtm`)].join('~');

    function mapUrl(ll, z) {
      return `https://yandex.ru/map-widget/v1/?${new URLSearchParams({ ll, z: String(z), pt: pins, lang: 'ru_RU' })}`;
    }

    function select(place) {
      places.forEach((p) => {
        const on = p === place;
        p.classList.toggle('is-active', on);
        p.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      points.forEach((g) => g.classList.toggle('is-active', place && g.dataset.place === place.dataset.place));
    }

    function setOpen(on) {
      box.classList.toggle('is-open', on);
      mapWrap.inert = !on;
      toggle.setAttribute('aria-expanded', on ? 'true' : 'false');
      toggle.textContent = on ? 'Свернуть карту' : 'Открыть карту';
      if (on && !frame.src) {
        const active = places.find((p) => p.classList.contains('is-active'));
        frame.src = active ? mapUrl(`${active.dataset.lon},${active.dataset.lat}`, 16) : mapUrl(hotel, 14);
      }
    }

    toggle.addEventListener('click', () => {
      const on = !box.classList.contains('is-open');
      setOpen(on);
      if (on) setTimeout(() => mapWrap.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' }), 350);
    });

    let pinned = null;
    places.forEach((place) => {
      place.addEventListener('mouseenter', () => select(place));
      place.addEventListener('click', () => {
        pinned = place;
        select(place);
        if (box.classList.contains('is-open')) frame.src = mapUrl(`${place.dataset.lon},${place.dataset.lat}`, 16);
      });
    });
    box.querySelector('.findus__list').addEventListener('mouseleave', () => select(pinned));

    // блок ушёл с экрана — карта сворачивается, видимая часть страницы не сдвигается
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting || !box.classList.contains('is-open')) return;
      if (entry.boundingClientRect.top < 0) {
        mapWrap.style.transition = 'none';
        keepView(box, () => setOpen(false));
        requestAnimationFrame(() => { mapWrap.style.transition = ''; });
      } else {
        setOpen(false);
      }
    }).observe(box);

    beforeAnchorJump((target) => {
      if (box.classList.contains('is-open') && !box.contains(target)) {
        mapWrap.style.transition = 'none';
        setOpen(false);
        requestAnimationFrame(() => { mapWrap.style.transition = ''; });
      }
    });
  }

  // Карточки ресторана, Fit Revolution, бизнеса и туров: на компьютере описание проявляется при наведении,
  // на телефоне — по нажатию на карточку (повторное нажатие или нажатие мимо — скрывает)
  function initInfoCards() {
    const cards = [...document.querySelectorAll('.icard')];
    if (!cards.length) return;
    const hoverDevice = window.matchMedia('(hover: hover)');
    // описание занимает место от верха карточки до блока с названием — знаем высоту этого блока
    // предел высоты описания: при подъёме текст не уходит за верх карточки (длинное — листается внутри)
    function fitDesc(card) {
      const body = card.querySelector('.icard__body');
      const desc = card.querySelector('.icard__desc');
      if (!body || !desc) return;
      const base = body.offsetHeight - desc.offsetHeight;
      const topRoom = hoverDevice.matches ? 24 : 60;
      const max = Math.max(60, card.clientHeight - base - topRoom);
      card.style.setProperty('--icard-desc-max', `${max}px`);
      // текст длиннее места — последняя строка плавно гаснет (без прокрутки и ползунка)
      desc.classList.toggle('is-clipped', (desc.firstElementChild?.scrollHeight || 0) > max + 1);
    }
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver((entries) => entries.forEach(({ target }) => fitDesc(target)));
      cards.forEach((card) => ro.observe(card));
    }
    cards.forEach(fitDesc);
    cards.forEach((card) => {
      card.addEventListener('click', (e) => {
        if (hoverDevice.matches || e.target.closest('a, button')) return;
        const on = !card.classList.contains('is-open');
        cards.forEach((c) => c.classList.toggle('is-open', c === card && on));
      });
      card.addEventListener('keydown', (e) => {
        if (e.target !== card || (e.key !== 'Enter' && e.key !== ' ')) return;
        e.preventDefault();
        card.classList.toggle('is-open');
      });
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.icard')) cards.forEach((c) => c.classList.remove('is-open'));
    });
  }

  // Блик при наведении — у всех активных кнопок, как у «Найти номер» и «У меня есть промокод»
  function initShimmer() {
    document.querySelectorAll('.rc__btn, .btn-glass, .mobile-bar__book, .booking-dropdown__done')
      .forEach((btn) => btn.classList.add('btn-shimmer'));
  }

  // «Подробнее» — окно с полным описанием номера из ТЗ отеля
  function initRoomDialog() {
    const dialog = document.getElementById('room-dialog');
    if (!dialog || typeof dialog.showModal !== 'function') return;
    let opener = null;
    const q = (sel) => dialog.querySelector(sel);

    document.querySelectorAll('[data-room-more]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.rt-room');
        const name = card.querySelector('.rt-room__title').textContent.trim();
        opener = btn;
        q('.room-dialog__img').src = card.dataset.img;
        q('.room-dialog__img').style.objectPosition = card.dataset.pos;
        q('.room-dialog__en').textContent = card.querySelector('.rc__en').textContent;
        q('.room-dialog__title').textContent = name;
        q('.room-dialog__chips').innerHTML = card.querySelector('.rc__chips').innerHTML;
        // текст берём как текст, а не как HTML — иначе &nbsp; и кавычки показались бы кодом
        q('.room-dialog__text').textContent = card.querySelector('.rc3__full').content.textContent.trim();
        q('.room-dialog__book').dataset.roomName = name;
        q('.room-dialog__ask').dataset.waText = `Здравствуйте! Вопрос по номеру «${name}» в Aktau Marina Bay.`;
        setWaLink(q('.room-dialog__ask'));
        q('.room-dialog__body').scrollTop = 0;
        dialog.showModal();
        document.body.classList.add('menu-open');
      });
    });

    q('[data-close-room]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => {
      document.body.classList.remove('menu-open');
      opener?.focus({ preventScroll: true });
    });
  }

  // Телефон: всплывающие окна закрываются смахиванием вниз (меню — ещё и вправо), а не только крестиком.
  // Окно едет за пальцем; если отпустить раньше порога — возвращается на место.
  // Если содержимое окна прокручено вниз, палец сначала прокручивает его, а смахивание работает от самого верха.
  function addSwipeClose(panel, { isActive, close, axes = ['down'] }) {
    const THRESHOLD = 90;
    let x0 = 0;
    let y0 = 0;
    let t0 = 0;
    let dx = 0;
    let dy = 0;
    let axis = null;
    let tracking = false;
    let scrolled = false;

    // внутри окна есть прокрученный блок — тогда движение вниз отдаём прокрутке
    function insideScrolled(el) {
      for (let n = el; n && n !== panel.parentElement; n = n.parentElement) {
        if (n.scrollTop > 0 && n.scrollHeight > n.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(n).overflowY)) return true;
        if (n === panel) break;
      }
      return false;
    }

    function reset(delay) {
      setTimeout(() => {
        panel.style.transition = '';
        panel.style.transform = '';
      }, delay);
    }

    panel.addEventListener('touchstart', (e) => {
      if (!mobile.matches || !isActive() || e.touches.length !== 1) return;
      if (e.target.closest('input, textarea, select, .booking-dropdown')) return;
      tracking = true;
      axis = null;
      dx = 0;
      dy = 0;
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
      t0 = performance.now();
      scrolled = insideScrolled(e.target);
    }, { passive: true });

    panel.addEventListener('touchmove', (e) => {
      if (!tracking) return;
      dx = e.touches[0].clientX - x0;
      dy = e.touches[0].clientY - y0;
      if (!axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (Math.abs(dy) >= Math.abs(dx)) axis = dy > 0 && axes.includes('down') && !scrolled ? 'y' : 'none';
        else axis = dx > 0 && axes.includes('right') ? 'x' : 'none';
        if (axis === 'none') {
          tracking = false;
          return;
        }
        panel.style.transition = 'none';
      }
      e.preventDefault();
      const d = Math.max(0, axis === 'y' ? dy : dx);
      panel.style.transform = axis === 'y' ? `translateY(${d}px)` : `translateX(${d}px)`;
    }, { passive: false });

    function end() {
      if (!tracking) return;
      tracking = false;
      if (!axis || axis === 'none') return;
      const d = Math.max(0, axis === 'y' ? dy : dx);
      const speed = d / Math.max(1, performance.now() - t0);
      panel.style.transition = 'transform 0.25s ease';
      if (d > THRESHOLD || (d > 30 && speed > 0.6)) {
        panel.style.transform = axis === 'y' ? 'translateY(110%)' : 'translateX(110%)';
        setTimeout(close, 200);
        reset(600);
      } else {
        panel.style.transform = '';
        reset(260);
      }
    }

    panel.addEventListener('touchend', end);
    panel.addEventListener('touchcancel', end);
  }

  function initSwipeClose() {
    const dialog = document.getElementById('room-dialog');
    if (dialog) {
      addSwipeClose(dialog, { isActive: () => dialog.open, close: () => dialog.close() });
    }

    const sheet = document.getElementById('booking-sheet');
    if (sheet) {
      addSwipeClose(sheet, {
        isActive: () => sheet.classList.contains('is-open'),
        close: () => sheet.querySelector('[data-close-dates]')?.click(),
      });
    }

    const menu = document.getElementById('site-menu');
    if (menu) {
      addSwipeClose(menu, {
        isActive: () => menu.classList.contains('is-open'),
        close: () => menu.querySelector('.site-menu__close')?.click(),
        axes: ['down', 'right'],
      });
    }
  }

  // Календарь заезда и выезда в стиле сайта (вместо встроенного календаря браузера).
  // Даты пишутся в те же поля, что и раньше, — логика бронирования не меняется.
  function initDateCalendar() {
    const booking = document.getElementById('booking-sheet');
    const inInput = document.getElementById('checkin-input');
    const outInput = document.getElementById('checkout-input');
    if (!booking || !inInput || !outInput) return;
    const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'нояб', 'дек'];
    const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
    const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
    const nights = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
    const nightWord = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'ночь' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'ночи' : 'ночей');
    const label = (s) => { const d = parse(s); return `${d.getDate()} ${SHORT[d.getMonth()]}`; };
    const today = iso(new Date());
    const maxDate = addDays(today, 365);
    const twoMonths = window.matchMedia('(min-width: 901px)');

    const pop = document.createElement('div');
    pop.className = 'booking-dropdown booking-dropdown--dates cal';
    pop.id = 'dates-dropdown';
    pop.hidden = true;
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'Выбор дат заезда и выезда');
    pop.innerHTML = '<div class="cal__head"><button class="cal__nav" type="button" data-dir="-1" aria-label="Предыдущий месяц"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>'
      + '<p class="cal__hint"></p><button class="cal__nav" type="button" data-dir="1" aria-label="Следующий месяц"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button></div>'
      + '<div class="cal__months"></div>'
      + '<div class="cal__foot"><p class="cal__summary" aria-live="polite"></p><button class="btn-primary btn-primary--sm cal__done" type="button">Готово</button></div>';
    booking.appendChild(pop);
    const monthsBox = pop.querySelector('.cal__months');
    const hint = pop.querySelector('.cal__hint');
    const summary = pop.querySelector('.cal__summary');
    let start = inInput.value;
    let end = outInput.value;
    let mode = 'start';
    let view = null;
    let hoverDay = null;
    let trigger = null;

    function render() {
      const count = twoMonths.matches ? 2 : 1;
      const rangeEnd = end || (mode === 'end' && hoverDay && hoverDay > start ? hoverDay : null);
      let html = '';
      for (let m = 0; m < count; m += 1) {
        const first = new Date(view.getFullYear(), view.getMonth() + m, 1);
        const offset = (first.getDay() + 6) % 7;
        const daysIn = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
        html += `<div class="cal__month"><p class="cal__title">${MONTHS[first.getMonth()]} ${first.getFullYear()}</p><div class="cal__grid">`;
        html += DAYS.map((d) => `<span class="cal__wd">${d}</span>`).join('');
        html += '<span class="cal__cell"></span>'.repeat(offset);
        for (let d = 1; d <= daysIn; d += 1) {
          const day = iso(new Date(first.getFullYear(), first.getMonth(), d));
          const off = day < today || day > maxDate;
          const cls = ['cal__cell'];
          if (day === start) cls.push('is-start');
          if (rangeEnd && day === rangeEnd) cls.push(end ? 'is-end' : 'is-end is-preview');
          if (rangeEnd && day > start && day < rangeEnd) cls.push(end ? 'in-range' : 'in-range is-preview');
          if (start && rangeEnd) cls.push('has-range');
          html += `<span class="${cls.join(' ')}"><button class="cal__day${day === today ? ' is-today' : ''}" type="button" data-day="${day}"${off ? ' disabled' : ''} aria-label="${d} ${SHORT[first.getMonth()]}"${day === start || day === end ? ' aria-pressed="true"' : ''}>${d}</button></span>`;
        }
        html += '</div></div>';
      }
      monthsBox.innerHTML = html;
      hint.textContent = mode === 'start' ? 'Выберите дату заезда' : 'Выберите дату выезда';
      summary.textContent = end ? `${label(start)} — ${label(end)} · ${nights(start, end)} ${nightWord(nights(start, end))}` : `Заезд ${label(start)} · выберите выезд`;
      const firstView = new Date(view.getFullYear(), view.getMonth(), 1);
      pop.querySelector('[data-dir="-1"]').disabled = iso(firstView) <= today.slice(0, 8) + '01';
    }

    function apply() {
      inInput.value = start;
      outInput.value = end || addDays(start, 1);
      // основная логика бронирования пересчитывает выезд и подписи полей по событию change
      outInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function open(which, btn) {
      start = inInput.value;
      end = outInput.value;
      mode = which;
      const base = parse(which === 'end' ? end : start);
      view = new Date(base.getFullYear(), base.getMonth(), 1);
      trigger = btn;
      // закрыть выбор гостей и промокод
      booking.querySelectorAll('.booking-dropdown').forEach((d) => { if (d !== pop) d.hidden = true; });
      booking.querySelectorAll('[data-booking-trigger]').forEach((b) => { b.classList.toggle('is-active', b === btn); });
      // на компьютере календарь открывается над полем «Заезд»
      if (twoMonths.matches) {
        const field = booking.querySelector('[data-booking-trigger="checkin"]');
        pop.style.left = `${field.getBoundingClientRect().left - booking.getBoundingClientRect().left}px`;
      } else {
        pop.style.left = '';
      }
      render();
      pop.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      pop.querySelector(`[data-day="${which === 'end' ? end : start}"]`)?.focus({ preventScroll: true });
    }

    function close() {
      if (pop.hidden) return;
      if (!end) end = addDays(start, 1);
      apply();
      pop.hidden = true;
      booking.querySelectorAll('[data-booking-trigger]').forEach((b) => b.classList.remove('is-active'));
      trigger?.setAttribute('aria-expanded', 'false');
    }

    // поля «Заезд» и «Выезд» открывают этот календарь вместо встроенного
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-booking-trigger="checkin"], [data-booking-trigger="checkout"]');
      if (!btn) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      if (!pop.hidden && trigger === btn) { close(); return; }
      open(btn.dataset.bookingTrigger === 'checkout' ? 'end' : 'start', btn);
    }, true);

    monthsBox.addEventListener('click', (e) => {
      const b = e.target.closest('.cal__day');
      if (!b || b.disabled) return;
      const day = b.dataset.day;
      if (mode === 'start' || day <= start) {
        start = day;
        end = null;
        mode = 'end';
        render();
        monthsBox.querySelector(`[data-day="${day}"]`)?.focus({ preventScroll: true });
      } else {
        end = day;
        mode = 'start';
        render();
        setTimeout(close, 280);
      }
    });
    monthsBox.addEventListener('mouseover', (e) => {
      const b = e.target.closest('.cal__day');
      if (mode !== 'end' || !b || b.dataset.day === hoverDay) return;
      hoverDay = b.dataset.day;
      render();
    });
    pop.querySelectorAll('.cal__nav').forEach((b) => b.addEventListener('click', () => {
      view = new Date(view.getFullYear(), view.getMonth() + Number(b.dataset.dir), 1);
      render();
    }));
    pop.querySelector('.cal__done').addEventListener('click', close);
    // нажатия внутри календаря не уходят наружу: при перерисовке дней старый обработчик
    // бронирования принимал их за «нажатие мимо» и прятал календарь, не сохранив даты
    pop.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    document.addEventListener('click', (e) => { if (!pop.hidden && !e.target.closest('.booking')) close(); });
    twoMonths.addEventListener('change', () => { if (!pop.hidden) render(); });
  }

  // Номера на компьютере: карточки во вкладыше листаются колёсиком мыши (одно движение — одна карточка).
  // На краю ленты колёсико снова листает страницу. На телефоне — кнопками и пальцем.
  function initRoomWheel() {
    const desktop = window.matchMedia('(hover: hover) and (min-width: 901px)');
    document.querySelectorAll('.room-tab .rt-list').forEach((list) => {
      let lock = false;
      list.addEventListener('wheel', (e) => {
        if (!desktop.matches || e.ctrlKey) return;
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        const max = list.scrollWidth - list.clientWidth;
        if (!delta || max <= 2) return;
        if ((delta < 0 && list.scrollLeft <= 2) || (delta > 0 && list.scrollLeft >= max - 2)) return;
        e.preventDefault();
        if (lock) return;
        lock = true;
        const items = list.children;
        const step = items.length > 1 ? items[1].offsetLeft - items[0].offsetLeft : list.clientWidth;
        list.scrollBy({ left: Math.sign(delta) * step, behavior: reduceMotion ? 'auto' : 'smooth' });
        setTimeout(() => { lock = false; }, 450);
      }, { passive: false });
    });
  }

  // «Сравнить все номера»: таблица собирается из тех же карточек номеров, что во вкладышах, —
  // текст не дублируется. «Подробнее» открывает то же окно номера, «Выбрать» — то же бронирование.
  function initRoomCompare() {
    const box = document.getElementById('rooms-compare');
    const toggle = document.querySelector('.rooms-compare__toggle');
    const tbody = box?.querySelector('tbody');
    if (!box || !toggle || !tbody) return;
    const labels = ['Номер', 'Гости', 'Площадь', 'Особенности', 'Вид', 'Цена за ночь', ''];
    const label = (i) => (labels[i] ? ` data-label="${labels[i]}"` : '');

    document.querySelectorAll('.room-tab').forEach((tab) => {
      const group = tab.querySelector('.room-tab__title').firstChild.textContent.trim();
      tbody.insertAdjacentHTML('beforeend', `<tr class="rooms-compare__group"><th colspan="7" scope="rowgroup">${group}</th></tr>`);
      tab.querySelectorAll('.rt-room').forEach((room) => {
        const chips = [...room.querySelectorAll('.rc__chips li')].map((li) => li.innerHTML);
        const name = room.querySelector('.rt-room__title').textContent.trim();
        const row = document.createElement('tr');
        row.innerHTML = `<td class="rooms-compare__cell-name"${label(0)}><span class="rooms-compare__name"><small>${room.querySelector('.rc__en').textContent}</small>${name}</span></td>`
          + `<td${label(1)}>${chips[0] || '—'}</td>`
          + `<td${label(2)}>${chips[1] || '—'}</td>`
          + `<td${label(3)}>${chips[2] || '—'}</td>`
          + `<td${label(4)}>${room.dataset.view ? (window.contentText || ((v) => v))(room.dataset.view) : '—'}</td>`
          + `<td${label(5)}><span>${room.querySelector('.rc__price').innerHTML}</span></td>`
          + `<td class="rooms-compare__cell-actions"><span class="rooms-compare__actions"><button class="btn-glass btn-glass--sm" type="button">Подробнее</button><button class="rc__btn" type="button" data-room-name="${name}">Выбрать</button></span></td>`;
        // «Подробнее» — то же окно, что и у номера во вкладыше
        row.querySelector('.btn-glass').addEventListener('click', () => room.querySelector('.btn-glass[data-room-more]')?.click());
        tbody.appendChild(row);
      });
    });

    toggle.addEventListener('click', () => {
      const on = !box.classList.contains('is-open');
      box.classList.toggle('is-open', on);
      box.inert = !on;
      toggle.setAttribute('aria-expanded', on ? 'true' : 'false');
      toggle.textContent = on ? 'Скрыть сравнение' : 'Сравнить все 9 номеров';
      if (on) {
        setTimeout(() => box.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' }), 450);
      }
    });
  }

  // «Выбрать» / «Забронировать» в карточках: в рабочей версии откроет Exely на нужной категории
  function initBookButtons() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.rc__btn');
      if (!btn) return;
      notify(`Здесь откроется модуль Exely: «${btn.dataset.roomName}» (макет)`);
    });
  }

  // Слайд-шоу на первом экране — вариант для сравнения (п. 2, на рассмотрении)
  function initSlides() {
    const toggle = document.getElementById('slides-toggle');
    const slides = [...document.querySelectorAll('.hero-slides__slide')];
    const caption = document.getElementById('slides-caption');
    if (!toggle || !slides.length || !caption) return;
    let index = 0;
    let timer = null;

    function show(i) {
      slides.forEach((s, n) => s.classList.toggle('is-active', n === i));
      caption.textContent = `${slides[i].dataset.caption} →`;
      caption.href = slides[i].dataset.target;
    }

    function setOn(on) {
      document.body.classList.toggle('slides-on', on);
      toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
      toggle.textContent = `Слайд-шоу: ${on ? 'вкл' : 'выкл'}`;
      caption.hidden = !on;
      clearInterval(timer);
      if (on) {
        show(index);
        if (!reduceMotion) {
          timer = setInterval(() => { index = (index + 1) % slides.length; show(index); }, 6000);
        }
      }
    }

    toggle.addEventListener('click', () => setOn(!document.body.classList.contains('slides-on')));
    setOn(new URLSearchParams(location.search).get('slides') === '1');
  }

  // всё, что работает с карточками, запускаем после того, как js/content.js расставит содержимое
  function start() {
    [initStickyBar, initDatesSheet, initDateCalendar, initRoomTabs, initRoomWheel, initRoomDialog, initRoomCompare, initBookButtons, initShimmer, initFindUs, initInfoCards, initCarousels, initContacts, initSwipeClose, initSlides].forEach((init) => {
      try {
        init();
      } catch (err) {
        console.error(`[${init.name}]`, err);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    (window.contentReady || Promise.resolve()).then(start, start);
  });
})();
