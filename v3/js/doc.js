/* Страница документа: doc.html?d=<код>. Текст — из content/documents.json (админка → «Документы»).
   Разметка в тексте: «## Заголовок», «### Подзаголовок», «- пункт», «1. пункт», **жирный**, [ссылка](https://…),
   пустая строка — новый абзац, [[…]] — подсветка «не заполнено». HTML не выполняется. */
(function () {
  'use strict';

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = (u) => (/^(https?:\/\/|mailto:|tel:|#|[\w./-]+$)/i.test(u) ? u : '#');

  function inline(s) {
    return esc(s)
      .replace(/\[\[(.+?)\]\]/g, '<span class="ph">$1</span>')
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => `<a href="${esc(safeUrl(u))}">${t}</a>`);
  }

  function markdown(src) {
    const out = [];
    let list = null;
    let para = [];
    const flushPara = () => { if (para.length) { out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = []; } };
    const flushList = () => { if (list) { out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`); list = null; } };
    String(src || '').replace(/\r/g, '').split('\n').forEach((raw) => {
      const line = raw.trim();
      let m;
      if (!line) { flushPara(); flushList(); return; }
      if ((m = /^(#{2,3})\s+(.*)$/.exec(line))) { flushPara(); flushList(); out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); return; }
      if ((m = /^[-*•]\s+(.*)$/.exec(line))) { flushPara(); if (!list || list.tag !== 'ul') { flushList(); list = { tag: 'ul', items: [] }; } list.items.push(m[1]); return; }
      if ((m = /^\d+[.)]\s+(.*)$/.exec(line))) { flushPara(); if (!list || list.tag !== 'ol') { flushList(); list = { tag: 'ol', items: [] }; } list.items.push(m[1]); return; }
      flushList();
      para.push(line);
    });
    flushPara();
    flushList();
    return out.join('\n');
  }

  const img = (p) => { const s = String(p || ''); const i = s.indexOf('images/'); return i >= 0 ? s.slice(i) : s.replace(/^\/+/, ''); };

  fetch('content/documents.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
    .then((docs) => {
      const list = (docs || []).filter((d) => d.published !== false);
      const slug = new URLSearchParams(location.search).get('d');
      const doc = list.find((d) => d.slug === slug) || list[0];
      document.querySelector('.doc__nav').innerHTML = list.map((d) => `<a href="?d=${encodeURIComponent(d.slug)}"${d === doc ? ' aria-current="page"' : ''}>${esc(String(d.title).replace(/\[\[|\]\]/g, ''))}</a>`).join('');
      if (!doc) return;
      const title = String(doc.title).replace(/\[\[|\]\]/g, '');
      document.title = `${title} · Aktau Marina Bay`;
      document.querySelector('.doc__title').innerHTML = inline(doc.title);
      if (doc.updated) {
        const u = document.querySelector('.doc__updated');
        u.textContent = `Редакция от ${new Date(doc.updated).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`;
        u.hidden = false;
      }
      if (doc.file) {
        const f = document.querySelector('.doc__file');
        f.querySelector('a').href = /^https?:/.test(doc.file) ? doc.file : img(doc.file).replace(/^images\//, 'images/');
        f.hidden = false;
      }
      document.querySelector('.doc__text').innerHTML = markdown(doc.body);
    })
    .catch((err) => {
      console.error('[doc]', err);
      document.querySelector('.doc__text').innerHTML = '<p>Не удалось загрузить документ. Обновите страницу.</p>';
    });
})();
