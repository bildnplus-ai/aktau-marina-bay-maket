/* Страница документа: doc.html?d=<код>. Текст — из content/documents.json (админка → «Документы»).
   Разметка в тексте: «## Заголовок», «### Подзаголовок», «- пункт», «1. пункт», **жирный**, [ссылка](https://…),
   пустая строка — новый абзац, [[…]] — подсветка «не заполнено». HTML не выполняется. */
(function () {
  'use strict';

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function safeUrl(value) {
    try {
      const url = new URL(value, location.href);
      return ['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol) ? value : '#';
    } catch {
      return '#';
    }
  }

  function inline(value) {
    const text = String(value ?? '');
    const tokens = /\[\[(.+?)\]\]|\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
    let result = '';
    let cursor = 0;
    for (const match of text.matchAll(tokens)) {
      const [token, placeholder, bold, label, url] = match;
      result += esc(text.slice(cursor, match.index));
      if (placeholder !== undefined) {
        result += `<span class="ph">${inline(placeholder)}</span>`;
      } else if (bold !== undefined) {
        result += `<b>${inline(bold)}</b>`;
      } else {
        result += `<a href="${esc(safeUrl(url))}">${inline(label)}</a>`;
      }
      cursor = match.index + token.length;
    }
    return result + esc(text.slice(cursor));
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
      const list = Array.isArray(docs) ? docs.filter((d) => d && typeof d === 'object'
        && typeof d.slug === 'string' && d.published !== false) : [];
      const slug = new URLSearchParams(location.search).get('d');
      const doc = slug === null ? list[0] : list.find((d) => d.slug === slug);
      document.querySelector('.doc__nav').innerHTML = list.map((d) => `<a href="?d=${encodeURIComponent(d.slug)}"${d === doc ? ' aria-current="page"' : ''}>${esc(String(d.title).replace(/\[\[|\]\]/g, ''))}</a>`).join('');
      if (!doc) {
        document.title = 'Документ не найден · Aktau Marina Bay';
        document.querySelector('.doc__title').textContent = 'Документ не найден';
        document.querySelector('.doc__text').textContent = list.length
          ? 'Выберите доступный документ из списка.'
          : 'Опубликованных документов пока нет.';
        return;
      }
      const title = String(doc.title).replace(/\[\[|\]\]/g, '');
      document.title = `${title} · Aktau Marina Bay`;
      document.querySelector('.doc__title').innerHTML = inline(doc.title);
      if (doc.updated) {
        const u = document.querySelector('.doc__updated');
        u.textContent = `Редакция от ${new Date(doc.updated).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`;
        u.hidden = false;
      }
      if (typeof doc.file === 'string' && doc.file.trim()) {
        const file = /^https?:/i.test(doc.file) ? doc.file : img(doc.file);
        const link = safeUrl(file);
        if (link !== '#') {
          const f = document.querySelector('.doc__file');
          f.querySelector('a').href = link;
          f.hidden = false;
        }
      }
      document.querySelector('.doc__text').innerHTML = markdown(doc.body);
    })
    .catch((err) => {
      console.error('[doc]', err);
      document.querySelector('.doc__text').innerHTML = '<p>Не удалось загрузить документ. Обновите страницу.</p>';
    });
})();
