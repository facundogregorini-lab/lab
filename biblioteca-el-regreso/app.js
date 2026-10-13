// Biblioteca El Regreso: arma las bibliotecas a partir de data/*.js y maneja filtros, fichas y lecturas.
(function () {
  const { books, shelves, categories, bookcases } = BIBLIO;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fold = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const store = {
    get(key, fallback) { try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
    del(key) { try { localStorage.removeItem(key); } catch {} },
  };

  const STATUS = {
    leido: { label: 'Leído', icon: '✓' },
    leyendo: { label: 'Leyendo', icon: '◐' },
    quiero: { label: 'Quiero leerlo', icon: '★' },
  };
  const LEN = { r: 'Corto', m: 'Medio', l: 'Largo' };
  const touch = matchMedia('(hover: none)').matches;

  // Orden físico de los libros y posición de cada uno.
  const order = [];
  for (const shelf of shelves) {
    let place = 0;
    for (const item of shelf.items) if (item.id) { const b = books[item.id]; b.place = ++place; b.index = order.length; order.push(b); }
  }
  for (const b of order) { b.search = fold([b.t, b.a, categories[b.c]?.name, b.y].join(' ')); }

  const state = {
    view: 'A', len: store.get('biblio:len', 'r'), q: '', cat: '', status: '',
    token: store.get('biblio:token', null), name: store.get('biblio:name', null),
    marks: {}, shared: null, server: null, current: null,
  };
  const marksKey = () => 'biblio:marks:' + (state.token ? state.name : 'local');
  state.marks = store.get(marksKey(), {});

  // ---------- Bibliotecas ----------
  const caseEls = {};
  function buildBookcase(bc) {
    const el = document.createElement('div');
    el.className = 'case';
    el.dataset.case = bc.id;
    const rows = shelves.filter(s => s.bookcase === bc.id).sort((a, b) => a.n - b.n);
    el.innerHTML = `
      <div class="case-top">${DECOR.tops[bc.top] ? `<div class="top-object top-${bc.top}">${DECOR.tops[bc.top].repeat(bc.top === 'chairs' ? 2 : 1)}</div>` : ''}${DECOR.pediment('p' + bc.id)}</div>
      <div class="case-body">
        <div class="pilaster">${DECOR.capital}</div>
        <div class="case-inner">${rows.map(shelfHtml).join('')}<div class="shelf shelf-empty"><div class="row"></div></div></div>
        <div class="pilaster">${DECOR.capital}</div>
      </div>
      <div class="case-base"></div>
      <p class="case-label">${esc(bc.name)} · <span>${esc(bc.subtitle)}</span></p>`;
    return el;
  }

  function shelfHtml(shelf) {
    const items = shelf.items.map(item => item.decor
      ? `<div class="decor decor-${item.decor}${item.front != null ? ' front" style="left:' + item.front * 100 + '%' : ''}" aria-hidden="true">${DECOR.decor[item.decor] || ''}</div>`
      : spineHtml(books[item.id])).join('');
    return `<div class="shelf" data-shelf="${shelf.bookcase}${shelf.n}"><div class="row">${items}</div></div>`;
  }

  function spineHtml(b) {
    const [bg, fg, h, w, style = 'plain', ac = '#000', font = 'serif'] = b.s;
    const narrow = w < 17;
    const author = b.a.split(/\s*[,·&]\s*|\s+y\s+/)[0];
    return `<button type="button" class="book bg st-${style} f-${font}${w >= 40 ? ' wide' : ''}" data-id="${b.id}" style="--bg:${bg};--fg:${fg};--ac:${ac};--h:${h};--w:${w}" aria-label="${esc(b.t)}, de ${esc(b.a)}">
      <span class="sp-text">${narrow ? '' : `<span class="sp-a">${esc(author)}</span>`}<span class="sp-t">${esc(b.t)}</span></span>
      ${w >= 16 ? '<span class="sp-mark"></span>' : ''}<span class="ribbon"></span></button>`;
  }

  const scroller = $('caseScroll');
  for (const bc of bookcases) { caseEls[bc.id] = buildBookcase(bc); scroller.appendChild(caseEls[bc.id]); }
  const bookEl = id => scroller.querySelector(`.book[data-id="${id}"]`);

  // Escala: los lomos se miden en píxeles de diseño; --u los ajusta al ancho disponible.
  function layout() {
    const el = caseEls[state.view];
    if (!el) return;
    el.style.setProperty('--u', 1);
    const rows = [...el.querySelectorAll('.row')];
    const need = Math.max(...rows.map(r => [...r.children].reduce((sum, c) => sum + c.getBoundingClientRect().width, 0)));
    const design = need + 26 + 2 * 46 + 20;
    const avail = scroller.clientWidth - 8;
    let u = Math.min(1.12, avail / design);
    const small = u < .6;
    if (small) u = .6;
    el.style.setProperty('--u', u.toFixed(4));
    el.style.setProperty('--inner', Math.ceil(need + 26) + 'px');
    scroller.classList.toggle('pan', small);
    // Si sobra lugar al final de un estante, el último libro se apoya inclinado.
    for (const r of rows) {
      const last = r.lastElementChild;
      r.querySelectorAll('.lean').forEach(b => b.classList.remove('lean'));
      const used = [...r.children].reduce((s, c) => s + c.getBoundingClientRect().width, 0) / u;
      if (last && last.classList.contains('book') && need - used > 70) last.classList.add('lean');
    }
  }
  addEventListener('resize', () => requestAnimationFrame(layout));

  // ---------- Vistas ----------
  const views = { A: 'viewShelves', B: 'viewShelves', catalog: 'viewCatalog', stats: 'viewStats', photos: 'viewPhotos' };
  function setView(view, push = true) {
    if (!views[view]) view = 'A';
    state.view = view;
    for (const t of document.querySelectorAll('.tab')) t.setAttribute('aria-pressed', t.dataset.view === view);
    for (const id of new Set(Object.values(views))) $(id).hidden = id !== views[view];
    for (const [id, el] of Object.entries(caseEls)) el.hidden = id !== view;
    document.body.dataset.view = view;
    if (view === 'A' || view === 'B') { layout(); scroller.scrollLeft = 0; }
    if (view === 'catalog') renderCatalog();
    if (view === 'stats') renderStats();
    if (view === 'photos') renderPhotos();
    hidePeek();
    if (push && location.hash !== '#' + view) history.replaceState(null, '', '#' + view);
    applyFilters();
  }
  document.querySelector('.tabs').addEventListener('click', e => { const t = e.target.closest('.tab'); if (t) setView(t.dataset.view); });

  // ---------- Filtros ----------
  function matches(b) {
    if (state.cat && b.c !== state.cat) return false;
    const m = state.marks[b.id];
    if (state.status === 'no' ? m === 'leido' : state.status && m !== state.status) return false;
    if (state.q) return fold(state.q).split(/\s+/).every(word => b.search.includes(word));
    return true;
  }
  const filtering = () => Boolean(state.q || state.cat || state.status);

  function applyFilters() {
    const active = filtering();
    const hits = { A: 0, B: 0 };
    for (const b of order) {
      const ok = matches(b);
      if (ok) hits[b.bookcase]++;
      const el = bookEl(b.id);
      el.classList.toggle('dim', active && !ok);
      el.classList.toggle('hit', active && ok);
    }
    const hint = $('shelfHint');
    if (!active) hint.textContent = touch ? 'Tocá un lomo para abrir el libro. Deslizá para recorrer los estantes.' : 'Pasá el mouse por un lomo para ver de qué se trata. Hacé clic para abrirlo.';
    else {
      const here = hits[state.view] ?? 0, other = state.view === 'A' ? 'B' : 'A';
      hint.innerHTML = `${here === 1 ? '1 libro coincide' : here + ' libros coinciden'} en esta biblioteca.` +
        (hits[other] ? ` <button type="button" class="link" data-go="${other}">${hits[other]} en la ${other === 'A' ? 'Biblioteca I' : 'Biblioteca II'} →</button>` : '') +
        ` <button type="button" class="link" data-clear>Limpiar filtros</button>`;
    }
    for (const chip of $('chips').children) chip.setAttribute('aria-pressed', chip.dataset.cat === state.cat);
    if (state.view === 'catalog') renderCatalog();
  }
  $('shelfHint').addEventListener('click', e => {
    if (e.target.dataset.go) setView(e.target.dataset.go);
    if ('clear' in e.target.dataset) clearFilters();
  });
  function clearFilters() {
    state.q = state.cat = state.status = '';
    $('search').value = ''; $('statusFilter').value = '';
    applyFilters();
  }

  function renderChips() {
    const counts = {};
    for (const b of order) counts[b.c] = (counts[b.c] || 0) + 1;
    $('chips').innerHTML = `<button type="button" class="chip" data-cat="" aria-pressed="true">Todas <b>${order.length}</b></button>` +
      Object.entries(categories).filter(([id]) => counts[id]).map(([id, c]) =>
        `<button type="button" class="chip" data-cat="${id}" style="--cc:${c.color}" aria-pressed="false"><span>${c.icon}</span> ${esc(c.name)} <b>${counts[id]}</b></button>`).join('');
  }
  $('chips').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    state.cat = state.cat === chip.dataset.cat ? '' : chip.dataset.cat;
    applyFilters();
    if (state.cat && (state.view === 'A' || state.view === 'B') && !order.some(b => b.bookcase === state.view && matches(b))) {
      const other = state.view === 'A' ? 'B' : 'A';
      if (order.some(b => b.bookcase === other && matches(b))) setView(other);
    }
  });
  let searchTimer;
  $('search').addEventListener('input', e => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { state.q = e.target.value.trim(); applyFilters(); }, 120); });
  $('statusFilter').addEventListener('change', e => { state.status = e.target.value; applyFilters(); });
  addEventListener('keydown', e => {
    if (e.key === '/' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) && !document.querySelector('dialog[open]')) { e.preventDefault(); $('search').focus(); }
  });

  function setLen(len) {
    state.len = LEN[len] ? len : 'r';
    store.set('biblio:len', state.len);
    for (const b of document.querySelectorAll('[data-len]')) b.setAttribute('aria-pressed', b.dataset.len === state.len);
    if (state.current && $('bookDialog').open) renderBook(state.current, true);
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-len]'); if (b) setLen(b.dataset.len); });

  // ---------- Vista previa al pasar el mouse ----------
  const peek = $('peek');
  let peekTimer, peekId = null;
  function showPeek(el) {
    const b = books[el.dataset.id];
    clearTimeout(peekTimer);
    peekTimer = setTimeout(() => {
      peekId = b.id;
      const cat = categories[b.c], mark = state.marks[b.id];
      peek.innerHTML = `<p class="peek-cat" style="--cc:${cat.color}">${cat.icon} ${esc(cat.name)}</p>
        <h3>${esc(b.t)}</h3><p class="peek-by">${esc(b.a)}${b.y ? ' · ' + year(b.y) : ''}</p>
        <p class="peek-sum">${esc(b[state.len])}</p>
        <p class="peek-foot">${mark ? `<span class="pill pill-${mark}">${STATUS[mark].icon} ${STATUS[mark].label}</span>` : ''}${b.fam ? '<span class="pill pill-fam">Autor de la familia</span>' : ''}<span class="peek-more">Clic para abrir · resumen ${LEN[state.len].toLowerCase()}</span></p>`;
      peek.hidden = false;
      const r = el.getBoundingClientRect(), p = peek.getBoundingClientRect();
      let x = r.left + r.width / 2 - p.width / 2;
      x = Math.max(10, Math.min(innerWidth - p.width - 10, x));
      let y = r.top - p.height - 12;
      if (y < 8) y = Math.min(innerHeight - p.height - 8, r.bottom + 12);
      peek.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
      peek.classList.add('on');
    }, peekId ? 40 : 160);
  }
  function hidePeek() { clearTimeout(peekTimer); peek.classList.remove('on'); peek.hidden = true; peekId = null; }
  scroller.addEventListener('pointerover', e => { const el = e.target.closest('.book'); if (el && e.pointerType === 'mouse') showPeek(el); });
  scroller.addEventListener('pointerout', e => { const el = e.target.closest('.book'); if (el && !el.contains(e.relatedTarget)) { clearTimeout(peekTimer); peekTimer = setTimeout(hidePeek, 80); } });
  scroller.addEventListener('focusin', e => { const el = e.target.closest('.book'); if (el && el.matches(':focus-visible')) showPeek(el); });
  scroller.addEventListener('focusout', hidePeek);
  scroller.addEventListener('scroll', hidePeek, { passive: true });
  addEventListener('scroll', hidePeek, { passive: true });
  scroller.addEventListener('click', e => { const el = e.target.closest('.book'); if (el) { hidePeek(); openBook(el.dataset.id); } });

  // Flechas: moverse entre lomos y estantes.
  scroller.addEventListener('keydown', e => {
    const el = e.target.closest('.book');
    if (!el || !/Arrow/.test(e.key)) return;
    e.preventDefault();
    const row = el.parentElement, list = [...row.querySelectorAll('.book')], i = list.indexOf(el);
    if (e.key === 'ArrowRight') (list[i + 1] || el).focus();
    if (e.key === 'ArrowLeft') (list[i - 1] || el).focus();
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const shelf = row.closest('.shelf'), next = e.key === 'ArrowUp' ? shelf.previousElementSibling : shelf.nextElementSibling;
      const targets = next ? [...next.querySelectorAll('.book')] : [];
      if (!targets.length) return;
      const x = el.getBoundingClientRect().left;
      targets.sort((a, b) => Math.abs(a.getBoundingClientRect().left - x) - Math.abs(b.getBoundingClientRect().left - x))[0].focus();
    }
  });

  // ---------- Ficha del libro ----------
  const dialog = $('bookDialog');
  function year(y) { return y < 0 ? `c. ${-y} a. C.` : String(y); }
  function where(b) { return `${b.bookcase === 'A' ? 'Biblioteca I' : 'Biblioteca II'} · estante ${b.shelf} · ${b.place}.º desde la izquierda`; }

  function openBook(id, push = true) {
    const b = books[id];
    if (!b) return;
    state.current = id;
    renderBook(id);
    if (!dialog.open) dialog.showModal();
    for (const el of scroller.querySelectorAll('.book.open')) el.classList.remove('open');
    const el = bookEl(id);
    el.classList.add('open');
    if (push) history.replaceState(null, '', '#libro/' + id);
  }
  function renderBook(id, keepScroll) {
    const b = books[id], cat = categories[b.c], mark = state.marks[id];
    const [bg, fg, , , style = 'plain', ac = '#000', font = 'serif'] = b.s;
    const readers = state.shared?.byBook?.[id];
    const who = readers ? Object.entries(STATUS).filter(([k]) => readers[k]?.length).map(([k, s]) => `<p><b>${s.label === 'Quiero leerlo' ? 'Lo quieren leer' : s.label === 'Leído' ? 'Lo leyeron' : 'Lo están leyendo'}:</b> ${readers[k].map(esc).join(', ')}</p>`).join('') : '';
    const prev = order[b.index - 1], next = order[b.index + 1];
    const body = $('bookBody'), scroll = body.scrollTop;
    body.innerHTML = `
      <button type="button" class="close" data-close aria-label="Cerrar">×</button>
      <div class="detail">
        <div class="cover-wrap"><div class="cover st-${style} f-${font}" style="--bg:${bg};--fg:${fg};--ac:${ac}">
          <div class="cover-front"><span class="cover-a">${esc(b.a)}</span><span class="cover-t">${esc(b.t)}</span><span class="cover-orn"></span></div>
          <div class="cover-side bg"></div><div class="cover-pages"></div>
        </div></div>
        <div class="info">
          <p class="cat-pill" style="--cc:${cat.color}">${cat.icon} ${esc(cat.name)}</p>
          <h2 id="bookTitle">${esc(b.t)}</h2>
          <p class="by">${esc(b.a)}${b.y ? ` · <span>${year(b.y)}</span>` : ''}</p>
          <p class="where">📍 ${where(b)}</p>
          ${b.fam ? '<p class="note fam">✒️ Escrito por un Gregorini: autor de la familia.</p>' : ''}
          ${b.q > 1 ? `<p class="note">${b.q === 3 ? 'Identificación dudosa' : 'Identificación probable'}: el lomo no se lee completo en la foto. Si sabés cuál es, avisá para corregirlo.</p>` : ''}
          ${b.dup ? `<p class="note">📚 Hay otro ejemplar en la biblioteca: <button type="button" class="link" data-open="${b.dup}">ver dónde está</button>.</p>` : ''}
          <div class="seg seg-small" role="group" aria-label="Largo del resumen">${Object.entries(LEN).map(([k, v]) => `<button type="button" data-len="${k}" aria-pressed="${k === state.len}">${v}</button>`).join('')}</div>
          <p class="summary">${esc(b[state.len])}</p>
          <div class="status" role="group" aria-label="Tu lectura">${Object.entries(STATUS).map(([k, s]) => `<button type="button" class="st st-btn-${k}" data-mark="${k}" aria-pressed="${mark === k}"><span>${s.icon}</span> ${s.label}</button>`).join('')}</div>
          <p class="muted small">${state.token ? `Marcando como <b>${esc(state.name)}</b>.` : 'Tus marcas se guardan en este navegador. <button type="button" class="link" data-login>Entrá</button> para tenerlas en todos lados.'}</p>
          ${who ? `<div class="readers">${who}</div>` : ''}
          <nav class="book-nav">
            <button type="button" ${prev ? `data-open="${prev.id}"` : 'disabled'}>← ${prev ? esc(short(prev.t)) : ''}</button>
            <a href="https://www.google.com/search?tbm=bks&q=${encodeURIComponent(b.t + ' ' + b.a)}" target="_blank" rel="noopener">Buscar el libro ↗</a>
            <button type="button" ${next ? `data-open="${next.id}"` : 'disabled'}>${next ? esc(short(next.t)) : ''} →</button>
          </nav>
        </div>
      </div>`;
    if (keepScroll) body.scrollTop = scroll;
  }
  const short = t => t.length > 22 ? t.slice(0, 20).trim() + '…' : t;

  dialog.addEventListener('click', e => {
    if (e.target === dialog || e.target.closest('[data-close]')) return dialog.close();
    const open = e.target.closest('[data-open]');
    if (open) {
      const b = books[open.dataset.open];
      if ((state.view === 'A' || state.view === 'B') && b.bookcase !== state.view) setView(b.bookcase, false);
      openBook(b.id);
      bookEl(b.id).scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
    const mark = e.target.closest('[data-mark]');
    if (mark) setMark(state.current, state.marks[state.current] === mark.dataset.mark ? null : mark.dataset.mark);
    if (e.target.closest('[data-login]')) { dialog.close(); openLogin(); }
  });
  dialog.addEventListener('keydown', e => {
    if (e.target.closest('input,select')) return;
    const b = books[state.current];
    if (e.key === 'ArrowRight' && order[b.index + 1]) openBook(order[b.index + 1].id);
    if (e.key === 'ArrowLeft' && order[b.index - 1]) openBook(order[b.index - 1].id);
  });
  dialog.addEventListener('close', () => {
    for (const el of scroller.querySelectorAll('.book.open')) el.classList.remove('open');
    if (location.hash.startsWith('#libro/')) history.replaceState(null, '', '#' + state.view);
    const el = state.current && bookEl(state.current);
    if (el && !el.closest('[hidden]')) el.focus({ preventScroll: true });
  });

  // ---------- Marcas de lectura ----------
  function setMark(id, status) {
    if (status) state.marks[id] = status; else delete state.marks[id];
    store.set(marksKey(), state.marks);
    refreshMarks();
    if (dialog.open) renderBook(state.current, true);
    if (state.token) queueSave();
    if (status === 'leido') toast(`¡Uno más! Llevás ${countRead()} leídos.`);
  }
  const countRead = () => Object.values(state.marks).filter(s => s === 'leido').length;
  function refreshMarks() {
    for (const b of order) {
      const el = bookEl(b.id), m = state.marks[b.id];
      el.classList.remove('m-leido', 'm-leyendo', 'm-quiero');
      if (m) el.classList.add('m-' + m);
    }
    const read = countRead(), pct = Math.round(read / order.length * 100);
    $('totalBooks').textContent = order.length;
    $('readCount').textContent = `${read} ${read === 1 ? 'leído' : 'leídos'}${state.token ? ' por ' + state.name : ''}`;
    $('ringPct').textContent = pct + '%';
    $('ringFg').style.strokeDasharray = `${(read / order.length) * 97.4} 97.4`;
    if (state.status) applyFilters();
    if (state.view === 'stats') renderStats();
    if (state.view === 'catalog') renderCatalog();
  }

  let saveTimer;
  function queueSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try { await api('biblioteca', { marks: state.marks }); loadShared(); }
      catch (e) { if (e.status !== 401) toast('No se pudo guardar en tu cuenta: ' + e.message + ' Queda guardado en este navegador.'); }
    }, 600);
  }

  // ---------- Cuentas (mismas que el resto del Lab) ----------
  async function api(path, payload) {
    let r;
    try {
      r = await fetch('/api/' + path, {
        method: payload ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json', ...(state.token ? { Authorization: 'Bearer ' + state.token } : {}) },
        body: payload ? JSON.stringify(payload) : undefined,
      });
    } catch { const e = new Error('No hay conexión con el servidor.'); e.status = 0; throw e; }
    const j = await r.json().catch(() => null);
    if (r.status === 401 && state.token && path !== 'auth') signOut('Tu sesión expiró. Volvé a entrar.');
    if (!r.ok || !j) { const e = new Error(j?.error || (r.status === 404 ? 'Las cuentas no están disponibles en este servidor.' : 'El servidor no respondió bien.')); e.status = r.status; throw e; }
    return j;
  }

  async function loadShared() {
    try { state.shared = await api('biblioteca'); state.server = true; }
    catch (e) { state.server = false; return; }
    if (state.view === 'stats') renderStats();
    if (dialog.open) renderBook(state.current, true);
  }

  async function signIn(token, name) {
    const local = store.get('biblio:marks:local', {});
    state.token = token; state.name = name;
    store.set('biblio:token', token); store.set('biblio:name', name);
    let remote = {};
    try { remote = (await api('biblioteca')).marks || {}; } catch {}
    // Lo marcado sin cuenta se suma a la cuenta (gana lo que ya tenía la cuenta).
    const merged = { ...local, ...store.get(marksKey(), {}), ...remote };
    const added = Object.keys(merged).length - Object.keys(remote).length;
    state.marks = merged;
    store.set(marksKey(), merged);
    if (added > 0) { await api('biblioteca', { marks: merged }).catch(() => {}); store.del('biblio:marks:local'); }
    renderAccount(); refreshMarks(); loadShared();
    toast(`¡Hola, ${name}!${added > 0 ? ` Sumamos ${added} marcas que tenías en este navegador.` : ''}`);
  }
  function signOut(message) {
    if (state.token) api('auth', { action: 'logout' }).catch(() => {});
    state.token = state.name = null; state.shared = null;
    store.del('biblio:token'); store.del('biblio:name');
    state.marks = store.get(marksKey(), {});
    renderAccount(); refreshMarks();
    if (message) toast(message);
  }
  function renderAccount() {
    $('accountLabel').textContent = state.token ? state.name : 'Entrar';
    $('avatar').textContent = state.token ? state.name[0].toUpperCase() : '?';
    $('account').classList.toggle('in', Boolean(state.token));
  }
  const loginDialog = $('loginDialog');
  function openLogin() {
    $('loginForm').hidden = Boolean(state.token);
    $('profile').hidden = !state.token;
    if (state.token) {
      $('profileName').textContent = state.name;
      const c = s => Object.values(state.marks).filter(v => v === s).length;
      $('profileInfo').textContent = `Leíste ${c('leido')} de ${order.length} libros, estás leyendo ${c('leyendo')} y querés leer ${c('quiero')}. Tus marcas se guardan en tu cuenta.`;
    } else $('loginError').textContent = '';
    loginDialog.showModal();
  }
  $('account').addEventListener('click', openLogin);
  $('closeProfile').addEventListener('click', () => loginDialog.close());
  $('logout').addEventListener('click', () => { loginDialog.close(); signOut('Saliste. Lo que marques ahora queda en este navegador.'); });
  $('loginForm').addEventListener('submit', async e => {
    const action = e.submitter?.value;
    if (action === 'cancel') return;
    e.preventDefault();
    const form = e.target, buttons = form.querySelectorAll('button');
    buttons.forEach(b => b.disabled = true);
    $('loginError').textContent = '';
    try {
      const r = await api('auth', { action, username: $('username').value, password: $('password').value });
      loginDialog.close(); form.reset();
      await signIn(r.token, r.user.name);
    } catch (err) {
      $('loginError').textContent = err.status === 0 || err.status === 404
        ? 'Las cuentas funcionan en la versión publicada del Lab. Mientras tanto, tus marcas quedan guardadas en este navegador.'
        : err.message;
    } finally { buttons.forEach(b => b.disabled = false); }
  });

  // ---------- Catálogo ----------
  function renderCatalog() {
    const sort = $('sort').value;
    const list = order.filter(matches);
    const by = { t: b => fold(b.t), a: b => fold(b.a.split(' ').slice(-1)[0] + b.a), c: b => categories[b.c].name + fold(b.t), y: b => b.y ?? 9999 };
    if (by[sort]) list.sort((a, b) => { const x = by[sort](a), y = by[sort](b); return x < y ? -1 : x > y ? 1 : a.index - b.index; });
    $('catalogCount').textContent = `${list.length} ${list.length === 1 ? 'libro' : 'libros'}${filtering() ? ' con estos filtros' : ' en total'}`;
    $('catalog').innerHTML = list.map(b => {
      const cat = categories[b.c], m = state.marks[b.id];
      return `<li><button type="button" class="cat-row" data-open-book="${b.id}">
        <span class="mini" style="--bg:${b.s[0]};--fg:${b.s[1]}"></span>
        <span class="cr-main"><b>${esc(b.t)}</b><span>${esc(b.a)}${b.y ? ' · ' + year(b.y) : ''}</span></span>
        <span class="cr-cat" style="--cc:${cat.color}">${cat.icon} ${esc(cat.name)}</span>
        <span class="cr-loc">${b.bookcase === 'A' ? 'I' : 'II'}·${b.shelf}·${b.place}</span>
        <span class="cr-st">${m ? `<span class="pill pill-${m}">${STATUS[m].icon} ${STATUS[m].label}</span>` : ''}</span>
      </button></li>`;
    }).join('') || '<li class="empty">No hay libros con estos filtros.</li>';
  }
  $('sort').addEventListener('change', renderCatalog);
  $('catalog').addEventListener('click', e => { const r = e.target.closest('[data-open-book]'); if (r) openBook(r.dataset.openBook); });

  // ---------- Estadísticas ----------
  function renderStats() {
    const read = countRead(), c = s => Object.values(state.marks).filter(v => v === s).length;
    const byCat = {}, authors = {};
    for (const b of order) {
      const x = byCat[b.c] ??= { n: 0, read: 0 };
      x.n++; if (state.marks[b.id] === 'leido') x.read++;
      for (const a of b.a.split(/\s*[,&]\s*|\s+y\s+/)) if (a && !/varios|por confirmar/i.test(a)) authors[a] = (authors[a] || 0) + 1;
    }
    const topAuthors = Object.entries(authors).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12);
    const max = Math.max(...Object.values(byCat).map(x => x.n));
    const doubt = order.filter(b => b.q > 1);
    const years = order.filter(b => b.y).map(b => b.y);
    const oldest = order.filter(b => b.y).sort((a, b) => a.y - b.y)[0];
    const readers = state.shared?.readers || [];
    $('viewStats').innerHTML = `
      <div class="stat-cards">
        <div class="card"><b>${order.length}</b><span>libros en las dos bibliotecas</span></div>
        <div class="card"><b>${Object.keys(authors).length}</b><span>autores distintos</span></div>
        <div class="card ok"><b>${read}</b><span>${state.token ? 'leídos por ' + esc(state.name) : 'leídos (en este navegador)'}</span></div>
        <div class="card"><b>${c('leyendo')}</b><span>leyendo ahora</span></div>
        <div class="card"><b>${c('quiero')}</b><span>en la lista de deseos</span></div>
        <div class="card"><b>${years.length ? year(oldest.y) : '—'}</b><span>la obra más antigua: ${oldest ? esc(oldest.t) : ''}</span></div>
      </div>
      <div class="stat-grid">
        <section class="panel"><h3>Por categoría</h3>
          ${Object.entries(byCat).sort((a, b) => b[1].n - a[1].n).map(([id, x]) => `<button type="button" class="bar" data-cat-go="${id}" style="--cc:${categories[id].color}">
            <span class="bar-label">${categories[id].icon} ${esc(categories[id].name)}</span>
            <span class="bar-track"><span class="bar-fill" style="width:${x.n / max * 100}%"><span class="bar-read" style="width:${x.read / x.n * 100}%"></span></span></span>
            <span class="bar-n">${x.read ? x.read + '/' : ''}${x.n}</span></button>`).join('')}
          <p class="muted small">La parte más oscura de cada barra son los leídos.</p>
        </section>
        <section class="panel"><h3>Autores con más libros</h3><ol class="authors">${topAuthors.map(([a, n]) => `<li><button type="button" class="link" data-author="${esc(a)}">${esc(a)}</button><span>${n}</span></li>`).join('')}</ol></section>
        <section class="panel"><h3>Lectores de la familia</h3>${readers.length ? `<ol class="authors">${readers.map(r => `<li><span>${esc(r.name)}</span><span>${r.leido} leídos · ${r.leyendo} leyendo · ${r.quiero} quiere</span></li>`).join('')}</ol>` : `<p class="muted">${state.server === false || !state.token ? 'Cuando cada uno entre con su cuenta y marque libros, acá aparece quién leyó qué.' : 'Todavía nadie marcó libros.'}</p>`}</section>
        <section class="panel"><h3>Por confirmar <small>${doubt.length}</small></h3><p class="muted small">Lomos que no se leen del todo en las fotos. Si los reconocés, se corrigen en <code>data/</code>.</p><ul class="doubt">${doubt.map(b => `<li><button type="button" class="link" data-open-book="${b.id}">${esc(b.t)}</button> <span class="muted">${esc(b.a)}</span></li>`).join('')}</ul></section>
      </div>`;
  }
  $('viewStats').addEventListener('click', e => {
    const cat = e.target.closest('[data-cat-go]'), author = e.target.closest('[data-author]'), open = e.target.closest('[data-open-book]');
    if (cat) { state.cat = cat.dataset.catGo; setView(order.find(b => b.c === state.cat).bookcase); }
    if (author) { state.q = author.dataset.author; $('search').value = state.q; setView('catalog'); }
    if (open) openBook(open.dataset.openBook);
  });

  // ---------- Fotos ----------
  const PHOTOS = [
    ['foto-01', 'El rincón de lectura, con la Biblioteca I y el microscopio'], ['foto-07', 'Biblioteca I · arriba a la izquierda'], ['foto-08', 'Biblioteca I · arriba a la derecha, con El pensador'],
    ['foto-09', 'Biblioteca I · estantes del medio'], ['foto-10', 'Biblioteca I · clásicos y desarrollo personal'], ['foto-02', 'Biblioteca II completa'],
    ['foto-03', 'Biblioteca II · campo y veterinaria'], ['foto-04', 'Biblioteca II · economía e inversión'], ['foto-06', 'Biblioteca II · biografías, con la gata Bastet'], ['foto-05', 'Biblioteca II · historia argentina'],
  ];
  function renderPhotos() {
    if ($('photos').children.length) return;
    $('photos').innerHTML = PHOTOS.map(([f, cap]) => `<figure><a href="assets/fotos/${f}.webp" target="_blank" rel="noopener"><img src="assets/fotos/${f}.webp" alt="${esc(cap)}" loading="lazy" width="1050" height="1400"></a><figcaption>${esc(cap)}</figcaption></figure>`).join('');
  }

  // ---------- ¿Qué leo? ----------
  $('surprise').addEventListener('click', () => {
    const pool = order.filter(b => matches(b) && state.marks[b.id] !== 'leido');
    if (!pool.length) return toast('No quedan libros sin leer con estos filtros. ¡Impresionante!');
    const b = pool[Math.floor(Math.random() * pool.length)];
    if (b.bookcase !== state.view) setView(b.bookcase);
    const el = bookEl(b.id);
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
    el.classList.add('pick');
    setTimeout(() => { el.classList.remove('pick'); openBook(b.id); }, 1100);
  });

  // ---------- Avisos ----------
  let toastTimer;
  function toast(text) {
    const t = $('toast');
    t.textContent = text; t.hidden = false;
    requestAnimationFrame(() => t.classList.add('on'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.hidden = true, 300); }, 3200);
  }

  // ---------- Inicio ----------
  function fromHash() {
    const h = decodeURIComponent(location.hash.slice(1));
    if (h.startsWith('libro/') && books[h.slice(6)]) { const b = books[h.slice(6)]; setView(b.bookcase, false); openBook(b.id, false); }
    else setView(views[h] ? h : 'A', false);
  }
  renderChips();
  setLen(state.len);
  renderAccount();
  refreshMarks();
  fromHash();
  addEventListener('hashchange', fromHash);
  if (document.fonts) document.fonts.ready.then(layout);
  if (state.token) api('biblioteca').then(r => {
    state.marks = { ...state.marks, ...r.marks }; state.shared = r; state.server = true;
    store.set(marksKey(), state.marks); refreshMarks();
  }).catch(e => { state.server = e.status === 0 || e.status === 404 ? false : state.server; });

  window.biblioDebug = () => ({ view: state.view, total: order.length, marks: { ...state.marks }, user: state.name, visible: order.filter(matches).length });
})();
