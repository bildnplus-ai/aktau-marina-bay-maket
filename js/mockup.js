/* МАКЕТ «после правок»: закреплённая шапка, фильтр категорий номеров, кнопки «Выбрать». */
(function () {
  'use strict';

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

  // Шапка появляется, когда первый экран ушёл из вида
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
  }

  // Вкладки-фильтры над карточками номеров (по ТЗ отеля: 4 группы)
  function initRoomFilter() {
    const tabs = document.querySelectorAll('.room-filter__tab');
    const cards = document.querySelectorAll('.rooms2__grid .rc');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const filter = tab.dataset.filter;
        tabs.forEach((t) => {
          const active = t === tab;
          t.classList.toggle('is-active', active);
          t.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        cards.forEach((card) => {
          card.hidden = filter !== 'all' && card.dataset.group !== filter;
        });
      });
    });
  }

  // «Выбрать» / «Забронировать»: в рабочей версии откроет Exely на нужной категории
  function initRoomButtons() {
    document.querySelectorAll('.rc__btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        notify(`Здесь откроется модуль Exely: «${btn.dataset.roomName}» (макет)`);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    [initStickyBar, initRoomFilter, initRoomButtons].forEach((init) => {
      try {
        init();
      } catch (err) {
        console.error(`[${init.name}]`, err);
      }
    });
  });
})();
