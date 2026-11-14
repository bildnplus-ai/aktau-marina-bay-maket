(function () {
  'use strict';

  /* ===== Helpers ===== */
  function formatDate(iso) {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  }

  // ISO-дата (YYYY-MM-DD) по локальному времени, а не по UTC
  function toIsoLocal(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function addDays(iso, days) {
    const [y, m, d] = iso.split('-').map(Number);
    return toIsoLocal(new Date(y, m - 1, d + days));
  }

  function openDatePicker(input) {
    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
        return;
      }
    } catch (err) {
      // showPicker может быть недоступен (старый браузер, iframe) — fallback ниже
    }
    input.focus();
    input.click();
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => { toast.hidden = true; }, 300);
    }, 3200);
  }

  function closeAllDropdowns(except) {
    document.querySelectorAll('.booking-dropdown').forEach((el) => {
      if (el !== except) el.hidden = true;
    });
    document.querySelectorAll('[data-booking-trigger]').forEach((btn) => {
      if (!except || btn.getAttribute('aria-controls') !== except.id) {
        btn.classList.remove('is-active');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
    document.getElementById('promo-toggle')?.classList.remove('is-active');
  }

  /* ===== Site menu ===== */
  function initMenu() {
    const menuBtn = document.querySelector('.menu-btn');
    const menu = document.getElementById('site-menu');
    const overlay = document.getElementById('menu-overlay');
    const closeBtn = menu.querySelector('.site-menu__close');
    const links = menu.querySelectorAll('.site-menu__nav a');
    let hideTimer = null;

    function isOpen() {
      return menuBtn.getAttribute('aria-expanded') === 'true';
    }

    function getFocusable() {
      return [...menu.querySelectorAll('a[href], button:not([disabled])')];
    }

    function openMenu() {
      // Отменяем отложенное скрытие от предыдущего закрытия, иначе меню пропадёт сразу после открытия
      clearTimeout(hideTimer);
      menu.hidden = false;
      overlay.hidden = false;
      requestAnimationFrame(() => {
        menu.classList.add('is-open');
        overlay.classList.add('is-visible');
      });
      menuBtn.setAttribute('aria-expanded', 'true');
      document.body.classList.add('menu-open');
      closeBtn.focus({ preventScroll: true });
    }

    function closeMenu({ restoreFocus = true } = {}) {
      if (!isOpen()) return;
      menu.classList.remove('is-open');
      overlay.classList.remove('is-visible');
      menuBtn.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-open');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        menu.hidden = true;
        overlay.hidden = true;
      }, 350);
      if (restoreFocus) menuBtn.focus({ preventScroll: true });
    }

    menuBtn.addEventListener('click', () => {
      isOpen() ? closeMenu() : openMenu();
    });
    closeBtn.addEventListener('click', () => closeMenu());
    overlay.addEventListener('click', () => closeMenu());
    // При переходе по якорю фокус не возвращаем на кнопку, чтобы не мешать прокрутке к разделу
    links.forEach((link) => link.addEventListener('click', () => closeMenu({ restoreFocus: false })));
    document.addEventListener('keydown', (e) => {
      if (!isOpen()) return;
      if (e.key === 'Escape') {
        closeMenu();
        return;
      }
      // Удерживаем фокус внутри открытого меню
      if (e.key === 'Tab') {
        const focusable = getFocusable();
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  /* ===== Booking ===== */
  function initBooking() {
    const checkinInput = document.getElementById('checkin-input');
    const checkoutInput = document.getElementById('checkout-input');
    const checkinDisplay = document.getElementById('checkin-display');
    const checkoutDisplay = document.getElementById('checkout-display');
    const guestsDisplay = document.getElementById('guests-display');
    const guestsDropdown = document.getElementById('guests-dropdown');
    const promoDropdown = document.getElementById('promo-dropdown');
    const promoToggle = document.getElementById('promo-toggle');
    const promoInput = document.getElementById('promo-input');
    const promoApply = document.getElementById('promo-apply');
    const searchBtn = document.getElementById('booking-search');
    const guestsDone = document.getElementById('guests-done');

    let adults = 2;
    let children = 0;
    let promoCode = '';

    function updateGuestsDisplay() {
      const adultWord = adults === 1 ? 'взрослый' : 'взрослых';
      const childWord = children === 1 ? 'ребёнок' : children < 5 ? 'ребёнка' : 'детей';
      guestsDisplay.textContent =
        children > 0
          ? `${adults} ${adultWord}, ${children} ${childWord}`
          : `${adults} ${adultWord}, 0 детей`;
    }

    const today = toIsoLocal(new Date());

    // Даты в HTML — запасные значения на случай без JS; при старте ставим «сегодня — завтра»
    checkinInput.value = today;
    checkoutInput.value = addDays(today, 1);
    checkinInput.min = today;

    function syncDates() {
      let checkin = checkinInput.value;
      // Пустое значение (очистка в пикере) или прошедшая дата — возвращаем на сегодня
      if (!checkin || checkin < today) {
        checkin = today;
        checkinInput.value = checkin;
      }
      const minCheckout = addDays(checkin, 1);
      let checkout = checkoutInput.value;
      if (!checkout || checkout < minCheckout) {
        checkout = minCheckout;
        checkoutInput.value = checkout;
      }
      checkoutInput.min = minCheckout;
      checkinDisplay.textContent = formatDate(checkin);
      checkoutDisplay.textContent = formatDate(checkout);
    }

    document.querySelector('[data-booking-trigger="checkin"]').addEventListener('click', () => {
      closeAllDropdowns();
      openDatePicker(checkinInput);
    });

    document.querySelector('[data-booking-trigger="checkout"]').addEventListener('click', () => {
      closeAllDropdowns();
      openDatePicker(checkoutInput);
    });

    checkinInput.addEventListener('change', syncDates);
    checkoutInput.addEventListener('change', syncDates);

    const guestsBtn = document.querySelector('[data-booking-trigger="guests"]');
    guestsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !guestsDropdown.hidden;
      closeAllDropdowns();
      if (!isOpen) {
        guestsDropdown.hidden = false;
        guestsBtn.classList.add('is-active');
        guestsBtn.setAttribute('aria-expanded', 'true');
      }
    });

    guestsDone.addEventListener('click', () => {
      guestsDropdown.hidden = true;
      guestsBtn.classList.remove('is-active');
      guestsBtn.setAttribute('aria-expanded', 'false');
    });

    document.querySelectorAll('.counter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.counter;
        const plus = btn.dataset.action === 'plus';
        if (type === 'adults') {
          adults = plus ? Math.min(adults + 1, 6) : Math.max(adults - 1, 1);
          document.getElementById('adults-count').textContent = adults;
        } else {
          children = plus ? Math.min(children + 1, 4) : Math.max(children - 1, 0);
          document.getElementById('children-count').textContent = children;
        }
        updateGuestsDisplay();
      });
    });

    promoToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !promoDropdown.hidden;
      closeAllDropdowns();
      if (!isOpen) {
        promoDropdown.hidden = false;
        promoToggle.classList.add('is-active');
        promoInput.focus();
      }
    });

    promoApply.addEventListener('click', () => {
      promoCode = promoInput.value.trim();
      if (promoCode) {
        showToast(`Промокод «${promoCode}» применён (демо)`);
        promoDropdown.hidden = true;
        promoToggle.classList.remove('is-active');
      }
    });

    searchBtn.addEventListener('click', () => {
      const msg = `Поиск: ${checkinDisplay.textContent} — ${checkoutDisplay.textContent}, ${guestsDisplay.textContent}${promoCode ? `, промокод: ${promoCode}` : ''}`;
      showToast(msg);
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.booking')) closeAllDropdowns();
    });

    syncDates();
    updateGuestsDisplay();
  }

  /* ===== Rooms gallery & lightbox ===== */
  function initRooms() {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = lightbox?.querySelector('.lightbox__close');
    let lightboxOpener = null;

    function openLightbox(src, alt, opener) {
      lightboxOpener = opener || null;
      lightboxImg.src = src;
      lightboxImg.alt = alt || '';
      lightbox.hidden = false;
      document.body.classList.add('lightbox-open');
      lightboxClose.focus();
    }

    function closeLightbox() {
      lightbox.hidden = true;
      // removeAttribute вместо src = '': пустой src заставляет браузер запросить саму страницу
      lightboxImg.removeAttribute('src');
      document.body.classList.remove('lightbox-open');
      lightboxOpener?.focus({ preventScroll: true });
      lightboxOpener = null;
    }

    document.querySelectorAll('[data-room]').forEach((card) => {
      const hero = card.querySelector('.room-card__hero');
      const thumbs = card.querySelectorAll('.room-card__thumb');
      const zoomBtn = card.querySelector('.room-card__zoom');
      const selectBtn = card.querySelector('.room-card__btn');
      const title = card.querySelector('.room-card__title')?.textContent?.trim() || 'номер';

      thumbs.forEach((thumb) => {
        thumb.addEventListener('click', () => {
          const full = thumb.dataset.full;
          if (!full) return;
          hero.src = full;
          thumbs.forEach((t) => t.classList.remove('is-active'));
          thumb.classList.add('is-active');
        });
      });

      zoomBtn?.addEventListener('click', () => {
        openLightbox(hero.src, hero.alt, zoomBtn);
      });

      selectBtn?.addEventListener('click', () => {
        showToast(`Выбран номер «${title}» (демо)`);
      });
    });

    lightboxClose?.addEventListener('click', closeLightbox);
    lightbox?.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (!lightbox || lightbox.hidden) return;
      if (e.key === 'Escape') closeLightbox();
      // В лайтбоксе одна кнопка — Tab не должен уводить фокус на страницу под ним
      if (e.key === 'Tab') {
        e.preventDefault();
        lightboxClose.focus();
      }
    });
  }

  /* ===== Scroll reveal ===== */
  function initReveal() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const targets = [
      { selector: '.why__title', delay: 0 },
      { selector: '.why__visual', delay: 80 },
      { selector: '.why__content', delay: 160 },
      { selector: '.why__item', delayStep: 70 },
      { selector: '.reasons__header', delay: 0 },
      { selector: '.reasons__card', delayStep: 80 },
      { selector: '.rooms__aside', delay: 0 },
      { selector: '.room-card', delayStep: 100 },
      { selector: '.bio__title', delay: 0 },
      { selector: '.bio__visual', delay: 80 },
      { selector: '.bio__content', delay: 160 },
      { selector: '.services__heading', delay: 0 },
      { selector: '.services__card', delayStep: 90 },
      { selector: '.restaurant__main-inner', delay: 0 },
      { selector: '.restaurant__item', delayStep: 80 },
      { selector: '.location__item', delayStep: 90, variant: 'left' },
      { selector: '.location__map-wrap', delay: 560, variant: 'right' },
    ];

    const observed = new Set();

    targets.forEach(({ selector, delay = 0, delayStep, variant }) => {
      document.querySelectorAll(selector).forEach((el, index) => {
        if (observed.has(el)) return;
        observed.add(el);
        el.classList.add('reveal');
        if (variant) el.classList.add(`reveal--${variant}`);
        const itemDelay = delayStep != null ? index * delayStep : delay;
        el.style.setProperty('--reveal-delay', `${itemDelay}ms`);
      });
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
  }

  /* ===== Hero entrance ===== */
  function initHeroReveal() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('.hero .reveal').forEach((el) => el.classList.add('is-revealed'));
      return;
    }

    const steps = [
      ['.header__container', 350],
      ['.hero__title', 850],
      ['.hero__subtitle', 1250],
    ];

    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          steps.forEach(([selector, delay]) => {
            const el = document.querySelector(selector);
            if (!el) return;
            setTimeout(() => el.classList.add('is-revealed'), delay);
          });

          document.querySelectorAll('.booking__field').forEach((el, index) => {
            setTimeout(() => el.classList.add('is-revealed'), 1650 + index * 160);
          });

          const actions = document.querySelector('.booking__actions');
          if (actions) {
            setTimeout(() => actions.classList.add('is-revealed'), 2200);
          }
        });
      });
    };

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(start).catch(start);
      // Если шрифты грузятся долго (медленная сеть), не держим первый экран пустым
      setTimeout(start, 1500);
    } else {
      start();
    }
  }

  /* ===== Services carousel ===== */
  function initServices() {
    const track = document.getElementById('services-track');
    const carousel = document.getElementById('services-carousel');
    const viewport = carousel?.querySelector('.services__viewport');
    if (!track || !carousel || !viewport) return;

    const prevBtn = carousel.querySelector('.services__arrow--prev');
    const nextBtn = carousel.querySelector('.services__arrow--next');
    const slides = track.querySelectorAll('.services__slide');

    function getScrollStep() {
      const slide = slides[0];
      if (!slide) return viewport.clientWidth;
      const style = getComputedStyle(track);
      const gap = parseFloat(style.columnGap || style.gap || '0') || 0;
      return slide.offsetWidth + gap;
    }

    function updateArrows() {
      if (!prevBtn || !nextBtn) return;
      const maxScroll = viewport.scrollWidth - viewport.clientWidth - 2;
      prevBtn.disabled = viewport.scrollLeft <= 2;
      nextBtn.disabled = viewport.scrollLeft >= maxScroll;
    }

    prevBtn?.addEventListener('click', () => {
      viewport.scrollBy({ left: -getScrollStep(), behavior: 'smooth' });
    });

    nextBtn?.addEventListener('click', () => {
      viewport.scrollBy({ left: getScrollStep(), behavior: 'smooth' });
    });

    viewport.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    updateArrows();
  }

  /* ===== Discover carousel ===== */
  function initDiscover() {
    const track = document.getElementById('discover-track');
    const carousel = document.getElementById('discover-carousel');
    const viewport = carousel?.querySelector('.discover__viewport');
    if (!track || !carousel || !viewport) return;

    const prevBtn = carousel.querySelector('.discover__arrow--prev');
    const nextBtn = carousel.querySelector('.discover__arrow--next');
    const cards = track.querySelectorAll('.discover__card');

    function getScrollStep() {
      const card = cards[0];
      if (!card) return viewport.clientWidth;
      const style = getComputedStyle(track);
      const gap = parseFloat(style.columnGap || style.gap || '0') || 0;
      return card.offsetWidth + gap;
    }

    function updateArrows() {
      if (!prevBtn || !nextBtn) return;
      const maxScroll = viewport.scrollWidth - viewport.clientWidth - 2;
      prevBtn.disabled = viewport.scrollLeft <= 2;
      nextBtn.disabled = viewport.scrollLeft >= maxScroll;
    }

    prevBtn?.addEventListener('click', (e) => {
      if (prevBtn.disabled) {
        e.preventDefault();
        return;
      }
      viewport.scrollBy({ left: -getScrollStep(), behavior: 'smooth' });
    });

    nextBtn?.addEventListener('click', (e) => {
      if (nextBtn.disabled) {
        e.preventDefault();
        return;
      }
      viewport.scrollBy({ left: getScrollStep(), behavior: 'smooth' });
    });

    viewport.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    updateArrows();
  }

  /* ===== Business tabs ===== */
  function initBusinessTabs() {
    const tablist = document.querySelector('.business__tabs');
    if (!tablist) return;

    const tabs = tablist.querySelectorAll('.business__tab');
    const panels = document.querySelectorAll('.business__panel');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function playPanelAnimation(panel) {
      if (reduceMotion || !panel) return;

      panel.classList.remove('is-animating');
      void panel.offsetWidth;
      panel.classList.add('is-animating');

      window.setTimeout(() => {
        panel.classList.remove('is-animating');
      }, 700);
    }

    function activateTab(tab) {
      const targetId = tab.getAttribute('aria-controls');
      const targetPanel = document.getElementById(targetId);
      if (!targetPanel || tab.classList.contains('is-active')) return;

      tabs.forEach((item) => {
        const isActive = item === tab;
        item.classList.toggle('is-active', isActive);
        item.setAttribute('aria-selected', isActive ? 'true' : 'false');
        item.tabIndex = isActive ? 0 : -1;
      });

      panels.forEach((panel) => {
        const isActive = panel.id === targetId;
        panel.classList.toggle('is-active', isActive);
        panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      });

      playPanelAnimation(targetPanel);
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activateTab(tab));

      // Стандартное управление вкладками с клавиатуры: стрелки, Home, End
      tab.addEventListener('keydown', (e) => {
        let next = null;
        if (e.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') next = tabs[0];
        else if (e.key === 'End') next = tabs[tabs.length - 1];
        if (!next) return;
        e.preventDefault();
        next.focus();
        activateTab(next);
      });
    });
  }

  /* ===== Location map (Yandex widget, no API key) ===== */
  function initLocation() {
    const iframe = document.getElementById('location-map');
    const items = document.querySelectorAll('.location__item');
    if (!iframe || !items.length) return;

    function buildMapUrl(lon, lat, zoom) {
      const ll = `${lon},${lat}`;
      const pt = `${lon},${lat},pm2rdm`;
      const params = new URLSearchParams({
        ll,
        z: String(zoom),
        pt,
        lang: 'ru_RU',
      });
      return `https://yandex.ru/map-widget/v1/?${params.toString()}`;
    }

    function setMap(item) {
      const lon = Number.parseFloat(item.dataset.lon);
      const lat = Number.parseFloat(item.dataset.lat);
      const zoom = Number.parseInt(item.dataset.zoom, 10) || 15;
      if (Number.isNaN(lon) || Number.isNaN(lat)) return;
      iframe.src = buildMapUrl(lon, lat, zoom);
    }

    function setActiveItem(item) {
      items.forEach((entry) => {
        const isActive = entry === item;
        entry.classList.toggle('is-active', isActive);
        entry.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
      setMap(item);
    }

    items.forEach((item) => {
      item.addEventListener('click', () => {
        setActiveItem(item);
      });
    });

    const activeItem = document.querySelector('.location__item.is-active') || items[0];
    setActiveItem(activeItem);
  }

  /* ===== Button shimmer ===== */
  function initButtonShimmer() {
    document
      .querySelectorAll('.btn-primary, .btn-outline, .booking__promo-btn, .room-card__btn')
      .forEach((btn) => btn.classList.add('btn-shimmer'));
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Каждый модуль изолирован: ошибка в одном не должна ломать остальные
    // (в частности, появление первого экрана в initHeroReveal)
    [
      initMenu,
      initBooking,
      initRooms,
      initServices,
      initDiscover,
      initBusinessTabs,
      initLocation,
      initButtonShimmer,
      initHeroReveal,
      initReveal,
    ].forEach((init) => {
      try {
        init();
      } catch (err) {
        console.error(`[${init.name}]`, err);
      }
    });
  });
})();
