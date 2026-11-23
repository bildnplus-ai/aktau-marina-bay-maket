(function () {
  'use strict';

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Aqtau', year: 'numeric', month: '2-digit', day: '2-digit',
  });

  function today() {
    const parts = Object.fromEntries(formatter.formatToParts(new Date()).map(({ type, value }) => [type, value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  window.hotelToday = today;
})();
