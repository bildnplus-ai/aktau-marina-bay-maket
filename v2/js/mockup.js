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

  // Контакты отеля — в одном месте. Номер +7 778 239-59-86 из старого сайта оказался чужим,
  // поэтому пока поля пустые: кнопки WhatsApp и телефон показывают подсказку.
  // Когда отель даст номера, достаточно вписать их сюда.
  const HOTEL_WA = '';      // номер WhatsApp только цифрами, например '77010000000'
  const HOTEL_PHONE = '';   // телефон для показа, например '+7 (701) 000-00-00'

  function setWaLink(a) {
    if (!HOTEL_WA) return;
    const text = a.dataset.waText;
    a.href = `https://wa.me/${HOTEL_WA}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
    a.target = '_blank';
    a.rel = 'noopener';
  }

  function initContacts() {
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
    }
    setOpenWidth();
    window.addEventListener('resize', setOpenWidth);

    function open(tab) {
      tabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle('is-open', on);
        t.querySelector('.room-tab__head').setAttribute('aria-expanded', on ? 'true' : 'false');
      });
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
      tab.addEventListener('mouseenter', () => { if (hover.matches) open(tab); });
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
    wrap.addEventListener('mouseleave', () => { if (hover.matches && !dialog?.open) open(null); });
    dialog?.addEventListener('close', () => {
      setTimeout(() => { if (hover.matches && !wrap.matches(':hover')) open(null); }, 50);
    });
    wrap.addEventListener('focusout', (e) => {
      if (hover.matches && !wrap.contains(e.relatedTarget) && !dialog?.open) open(null);
    });

    // телефон: нажатие вне вкладышей сворачивает открытый и возвращает к нему
    document.addEventListener('click', (e) => {
      // шапка, нижняя панель, меню, выбор дат и окна — не «нажатие мимо», страницу не дёргаем
      if (hover.matches || wrap.contains(e.target)
        || e.target.closest('dialog, .toast, .stickybar, .mobile-bar, .booking, .sheet-overlay, .site-menu, .menu-overlay, .demo-badge, .hero')) return;
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
        nav.hidden = max <= 2;
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
      if (e.target.closest('input, textarea, select')) return;
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

  // Документы в подвале — пока заглушки: не прыгаем наверх страницы, а показываем подсказку
  function initDocLinks() {
    document.querySelectorAll('.footer-req a[href="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        notify(`«${a.textContent.trim()}» — документ предоставит отель (макет)`);
      });
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

  document.addEventListener('DOMContentLoaded', () => {
    [initStickyBar, initDatesSheet, initRoomTabs, initRoomDialog, initBookButtons, initShimmer, initFindUs, initCarousels, initDocLinks, initContacts, initSwipeClose, initSlides].forEach((init) => {
      try {
        init();
      } catch (err) {
        console.error(`[${init.name}]`, err);
      }
    });
  });
})();
