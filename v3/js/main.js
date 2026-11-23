(function () {
  'use strict';

  /* ===== Helpers ===== */
  function formatDate(iso) {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  }

  function addDays(iso, days) {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
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

  function closeAllDropdowns() {
    document.querySelectorAll('.booking-dropdown').forEach((dropdown) => { dropdown.hidden = true; });
    document.querySelectorAll('[data-booking-trigger], #promo-toggle').forEach((button) => {
      button.classList.remove('is-active');
      button.setAttribute('aria-expanded', 'false');
    });
  }

  /* ===== Site menu ===== */
  function initMenu() {
    const menuButtons = document.querySelectorAll('.menu-btn, [data-open-menu]');
    const menu = document.getElementById('site-menu');
    const overlay = document.getElementById('menu-overlay');
    const closeBtn = menu.querySelector('.site-menu__close');
    const links = menu.querySelectorAll('a[href^="#"]:not([href="#"])');
    let hideTimer = null;
    let opener = null;

    function openMenu(button) {
      opener = button;
      // Отменяем отложенное скрытие от предыдущего закрытия, иначе меню пропадёт сразу после открытия
      clearTimeout(hideTimer);
      menu.hidden = false;
      menu.inert = false;
      overlay.hidden = false;
      menuButtons.forEach((button) => button.setAttribute('aria-expanded', 'true'));
      requestAnimationFrame(() => {
        if (!opener) return;
        menu.classList.add('is-open');
        overlay.classList.add('is-visible');
      });
      document.body.classList.add('menu-open');
      closeBtn.focus({ preventScroll: true });
    }

    function closeMenu({ restoreFocus = true } = {}) {
      if (!opener) return;
      menu.inert = true;
      menu.classList.remove('is-open');
      overlay.classList.remove('is-visible');
      menuButtons.forEach((button) => button.setAttribute('aria-expanded', 'false'));
      document.body.classList.remove('menu-open');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        menu.hidden = true;
        overlay.hidden = true;
      }, 350);
      if (restoreFocus) opener.focus({ preventScroll: true });
      opener = null;
    }

    menuButtons.forEach((button) => {
      button.addEventListener('click', () => {
        if (opener) closeMenu();
        else openMenu(button);
      });
    });
    closeBtn.addEventListener('click', () => closeMenu());
    overlay.addEventListener('click', () => closeMenu());
    // При переходе по якорю фокус не возвращаем на кнопку, чтобы не мешать прокрутке к разделу
    links.forEach((link) => link.addEventListener('click', () => closeMenu({ restoreFocus: false })));
    document.addEventListener('keydown', (e) => {
      if (!opener) return;
      if (e.key === 'Escape') {
        closeMenu();
        return;
      }
      // Удерживаем фокус внутри открытого меню
      if (e.key === 'Tab') {
        const focusable = [...menu.querySelectorAll('a[href], button:not([disabled])')]
          .filter((element) => element.getClientRects().length);
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
    const booking = searchBtn.closest('.booking');
    const closePopups = () => booking.dispatchEvent(new Event('booking:close-popups'));
    const status = document.getElementById('booking-status');
    const feedback = status.parentElement;
    const contactLink = feedback.querySelector('[data-booking-contacts]');

    function showBookingStatus(message, showContacts = false) {
      status.textContent = message;
      contactLink.hidden = !showContacts;
      if (booking.classList.contains('is-open')) feedback.scrollIntoView({ block: 'nearest' });
    }

    booking.addEventListener('booking:close-popups', () => closeAllDropdowns());
    booking.addEventListener('booking:select-room', () => {
      status.textContent = '';
      contactLink.hidden = true;
    });

    let adults = 2;
    let children = 0;

    function updateGuestsDisplay() {
      const adultWord = adults === 1 ? 'взрослый' : 'взрослых';
      const childWord = children === 1 ? 'ребёнок' : children < 5 ? 'ребёнка' : 'детей';
      guestsDisplay.textContent =
        children > 0
          ? `${adults} ${adultWord}, ${children} ${childWord}`
          : `${adults} ${adultWord}, 0 детей`;
    }

    // Даты в HTML — запасные значения на случай без JS; при старте берём день отеля.
    checkinInput.value = window.hotelToday();
    checkoutInput.value = '';

    function syncDates() {
      const today = window.hotelToday();
      const latestCheckout = addDays(today, 365);
      const latestCheckin = addDays(latestCheckout, -1);
      checkinInput.min = today;
      checkinInput.max = latestCheckin;
      checkoutInput.max = latestCheckout;

      let checkin = checkinInput.value;
      // Пустое значение (очистка в пикере) или прошедшая дата — возвращаем на сегодня
      if (!checkin || checkin < today) checkin = today;
      else if (checkin > latestCheckin) checkin = latestCheckin;
      checkinInput.value = checkin;
      const minCheckout = addDays(checkin, 1);
      let checkout = checkoutInput.value;
      if (!checkout || checkout < minCheckout) checkout = minCheckout;
      else if (checkout > latestCheckout) checkout = latestCheckout;
      checkoutInput.value = checkout;
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
    booking.addEventListener('booking:sync-dates', syncDates);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) syncDates();
    });

    const guestsBtn = document.querySelector('[data-booking-trigger="guests"]');
    guestsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !guestsDropdown.hidden;
      closePopups();
      if (!isOpen) {
        guestsDropdown.hidden = false;
        guestsBtn.classList.add('is-active');
        guestsBtn.setAttribute('aria-expanded', 'true');
        guestsDropdown.querySelector('button').focus({ preventScroll: true });
        if (booking.classList.contains('is-open')) guestsDropdown.scrollIntoView({ block: 'nearest' });
      }
    });

    guestsDone.addEventListener('click', () => {
      guestsDropdown.hidden = true;
      guestsBtn.classList.remove('is-active');
      guestsBtn.setAttribute('aria-expanded', 'false');
      guestsBtn.focus();
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
      closePopups();
      if (!isOpen) {
        promoDropdown.hidden = false;
        promoToggle.classList.add('is-active');
        promoToggle.setAttribute('aria-expanded', 'true');
        promoInput.focus();
      }
    });

    promoApply.addEventListener('click', () => {
      const promoCode = promoInput.value.trim();
      closeAllDropdowns();
      promoToggle.focus();
      showBookingStatus(promoCode
        ? 'Промокод указан. Проверка скидки пока недоступна.'
        : 'Промокод не указан.');
    });

    promoInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        promoApply.click();
      }
    });

    searchBtn.addEventListener('click', () => {
      closePopups();
      syncDates();
      showBookingStatus('Онлайн-бронирование пока недоступно. Бронь не создана.', true);
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.booking')) closePopups();
    });
    booking.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || (guestsDropdown.hidden && promoDropdown.hidden)) return;
      const trigger = guestsDropdown.hidden ? promoToggle : guestsBtn;
      closeAllDropdowns();
      trigger.focus();
    });

    syncDates();
    updateGuestsDisplay();
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
      { selector: '.bio__title', delay: 0 },
      { selector: '.bio__visual', delay: 80 },
      { selector: '.bio__content', delay: 160 },
      { selector: '.services__heading', delay: 0 },
      { selector: '.services__card', delayStep: 90 },
      { selector: '.restaurant__main-inner', delay: 0 },
      { selector: '.restaurant__item', delayStep: 80 },
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

  /* ===== Button shimmer ===== */
  function initButtonShimmer() {
    document
      .querySelectorAll('.btn-primary, .btn-outline, .booking__promo-btn')
      .forEach((btn) => btn.classList.add('btn-shimmer'));
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Каждый модуль изолирован: ошибка в одном не должна ломать остальные
    [
      initMenu,
      initBooking,
      initServices,
      initDiscover,
      initButtonShimmer,
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
