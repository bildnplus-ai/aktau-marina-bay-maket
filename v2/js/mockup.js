/* МАКЕТ v2 (предложения директора от 14.11.2026): закреплённая шапка, выбор дат на телефоне,
   номера тремя вкладышами, окно номера, слайд-шоу на первом экране (вариант). */
(function () {
  'use strict';

  const mobile = window.matchMedia('(max-width: 900px)');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function notify(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    clearTimeout(notify._timer);
    notify._timer = setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => { toast.hidden = true; }, 300);
    }, 3200);
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
        document.body.classList.add('menu-open');
        sheet.querySelector('[data-booking-trigger="checkin"]')?.focus({ preventScroll: true });
      } else {
        document.getElementById('hero').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
        setTimeout(() => sheet.querySelector('[data-booking-trigger="checkin"]')?.focus({ preventScroll: true }), 500);
      }
    }

    function close() {
      sheet.classList.remove('is-open');
      overlay.hidden = true;
      document.body.classList.remove('menu-open');
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

  // Номера: три вкладыша. На компьютере раскрываются при наведении и сворачиваются, когда мышь ушла;
  // на телефоне — по нажатию, сворачиваются при нажатии вне вкладыша или когда вкладыш ушёл с экрана
  function initRoomTabs() {
    const wrap = document.querySelector('.room-tabs');
    const tabs = [...document.querySelectorAll('.room-tab')];
    if (!wrap || !tabs.length) return;
    const hover = window.matchMedia('(hover: hover) and (min-width: 901px)');

    function open(tab) {
      tabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle('is-open', on);
        t.querySelector('.room-tab__head').setAttribute('aria-expanded', on ? 'true' : 'false');
      });
    }

    // свернуть, не сдвигая то, что пользователь сейчас видит на экране
    function closeKeepingView() {
      const current = tabs.find((t) => t.classList.contains('is-open'));
      if (!current) return;
      const anchor = [...document.querySelectorAll('section')].find((sec) => sec.getBoundingClientRect().bottom > 0);
      const before = anchor ? anchor.getBoundingClientRect().top : 0;
      open(null);
      if (anchor && current.getBoundingClientRect().bottom < 0) {
        window.scrollBy(0, anchor.getBoundingClientRect().top - before);
      }
    }

    tabs.forEach((tab) => {
      const head = tab.querySelector('.room-tab__head');
      tab.addEventListener('mouseenter', () => { if (hover.matches) open(tab); });
      head.addEventListener('focus', () => { if (hover.matches) open(tab); });
      head.addEventListener('click', () => {
        if (!hover.matches && tab.classList.contains('is-open')) {
          open(null);
          return;
        }
        open(tab);
        if (!hover.matches) {
          setTimeout(() => tab.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }), 50);
        }
      });

      // телефон: вкладыш полностью ушёл с экрана — сворачиваем
      new IntersectionObserver(([entry]) => {
        if (!hover.matches && !entry.isIntersecting && tab.classList.contains('is-open')) closeKeepingView();
      }).observe(tab);
    });

    // компьютер: мышь ушла с вкладышей, фокус клавиатуры ушёл — все три возвращаются в исходное положение
    const dialog = document.getElementById('room-dialog');
    wrap.addEventListener('mouseleave', () => { if (hover.matches && !dialog?.open) open(null); });
    dialog?.addEventListener('close', () => {
      setTimeout(() => { if (hover.matches && !wrap.matches(':hover')) open(null); }, 50);
    });
    wrap.addEventListener('focusout', (e) => {
      if (hover.matches && !wrap.contains(e.relatedTarget) && !dialog?.open) open(null);
    });

    // телефон: нажатие вне вкладышей сворачивает открытый (окно номера и подсказка не считаются)
    document.addEventListener('click', (e) => {
      if (hover.matches || wrap.contains(e.target) || e.target.closest('dialog, .toast')) return;
      open(null);
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
      const above = entry.boundingClientRect.top < 0;
      const before = document.documentElement.scrollHeight;
      if (above) mapWrap.style.transition = 'none';
      setOpen(false);
      if (above) {
        window.scrollBy(0, document.documentElement.scrollHeight - before);
        requestAnimationFrame(() => { mapWrap.style.transition = ''; });
      }
    }).observe(box);
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

    document.querySelectorAll('[data-room-more]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.rt-room');
        opener = btn;
        dialog.querySelector('.room-dialog__img').src = card.dataset.img;
        dialog.querySelector('.room-dialog__img').style.objectPosition = card.dataset.pos;
        dialog.querySelector('.room-dialog__en').textContent = card.querySelector('.rc__en').textContent;
        dialog.querySelector('.room-dialog__title').textContent = card.querySelector('.rt-room__title').textContent;
        dialog.querySelector('.room-dialog__chips').innerHTML = card.querySelector('.rc__chips').innerHTML;
        dialog.querySelector('.room-dialog__text').textContent = card.querySelector('.rc3__full').innerHTML.trim();
        dialog.querySelector('.room-dialog__book').dataset.roomName = card.querySelector('.rt-room__title').textContent;
        dialog.showModal();
      });
    });

    dialog.querySelector('[data-close-room]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => opener?.focus({ preventScroll: true }));
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
    [initStickyBar, initDatesSheet, initRoomTabs, initRoomDialog, initBookButtons, initShimmer, initFindUs, initSlides].forEach((init) => {
      try {
        init();
      } catch (err) {
        console.error(`[${init.name}]`, err);
      }
    });
  });
})();
