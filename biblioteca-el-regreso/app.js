// Biblioteca El Regreso: arma las bibliotecas a partir de data/*.js y maneja filtros, fichas, lecturas y aportes.
(function () {
  const { books, shelves, categories, bookcases } = BIBLIO;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fold = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const store = {
    get(key, fallback) { try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } },
    del(key) { try { localStorage.removeItem(key); } catch {} },
  };

  const STATUS = {
    leido: { label: 'Leído', icon: '✓' },
    leyendo: { label: 'Leyendo', icon: '◐' },
    quiero: { label: 'Quiero leerlo', icon: '★' },
  };
  const LEN = { corto: 'Resumen corto', largo: 'Resumen' };
  const touch = matchMedia('(hover: none)').matches;
  const mobile = () => innerWidth <= 720;

  // Libros originales, antes de aplicar correcciones de la familia.
  const base = {};
  for (const b of Object.values(books)) base[b.id] = { t: b.t, a: b.a, q: b.q };

  const state = {
    view: 'A', len: store.get('biblio:len2', 'corto'), q: '', cat: '', status: '',
    token: store.get('biblio:token', null), name: store.get('biblio:name', null),
    marks: {}, shared: null, server: null, current: null, aportes: [],
  };
  if (!LEN[state.len]) state.len = 'corto';
  const marksKey = () => 'biblio:marks:' + (state.token ? state.name : 'local');
  state.marks = store.get(marksKey(), {});

  // ---------- Índice: orden físico, aportes y búsqueda ----------
  let order = [];
  const baseItems = new Map(shelves.map(s => [s, s.items.slice()]));
  function indexBooks() {
    // Se parte siempre del orden original y se aplican los aportes en orden cronológico.
    for (const s of shelves) s.items = baseItems.get(s).slice();
    for (const id of Object.keys(books)) if (books[id].nuevo) delete books[id];
    for (const b of Object.values(books)) Object.assign(b, base[b.id], { fix: null, aiSummary: null, retirado: null, moved: null });
    state.retirados = [];
    for (const a of state.aportes) {
      if (a.type === 'new') {
        const b = newBook(a);
        books[b.id] = b;
        const shelf = shelves.find(s => s.bookcase === b.bookcase && s.n === b.shelf) || shelves[0];
        shelf.items.push({ id: b.id });
      } else if (a.type === 'shelf') {
        if (!a.pending) applyShelf(a);
      } else if (books[a.bookId]) {
        const b = books[a.bookId];
        b.fix = [...(b.fix || []), a];
        if (a.title) b.t = a.title;
        if (a.author) b.a = a.author;
        if (a.title || a.author) b.q = 1;
        if (a.ai?.summary && (a.title || a.author)) b.aiSummary = a.id;
      }
    }
    order = [];
    for (const shelf of shelves) {
      let place = 0;
      for (const item of shelf.items) if (item.id) { const b = books[item.id]; Object.assign(b, { bookcase: shelf.bookcase, shelf: shelf.n, place: ++place, index: order.length }); order.push(b); }
    }
    for (const b of order) b.search = fold([b.t, b.a, base[b.id]?.t, categories[b.c]?.name, b.y].join(' '));
  }
  // Una foto de estante revisada: el estante queda con el orden indicado; los libros que vinieron de otro estante salen de allá.
  function applyShelf(a) {
    const target = shelves.find(s => s.bookcase === a.bookcase && s.n === a.shelf);
    if (!target) return;
    const wanted = a.order.filter(id => books[id]), set = new Set([...wanted, ...a.removed]);
    for (const s of shelves) {
      if (s === target) continue;
      const before = s.items.length;
      s.items = s.items.filter(i => !(i.id && set.has(i.id)));
      if (s.items.length !== before) for (const id of wanted) if (books[id] && !target.items.some(i => i.id === id)) books[id].moved = a;
    }
    const lead = [], tail = [], front = [];
    target.items.forEach((i, n) => { if (!i.decor) return; if (i.front != null) front.push(i); else (n === 0 ? lead : tail).push(i); });
    const kept = target.items.filter(i => i.id && !set.has(i.id)).map(i => i.id);
    target.items = [...lead, ...wanted.map(id => ({ id })), ...kept.map(id => ({ id })), ...tail, ...front];
    for (const id of a.removed) if (books[id]) { books[id].retirado = a; state.retirados.push(books[id]); }
  }
  function newBook(a) {
    const color = a.color || shade(categories[a.category]?.color || '#8a6d4a', -.25);
    return {
      id: 'n-' + a.id, t: a.title, a: a.author || 'Autor por completar', c: a.category, y: a.year, q: 1,
      s: [color, luminance(color) > .55 ? '#1d1d1d' : '#f6efe2', .9, 26, 'band', luminance(color) > .55 ? '#1d1d1d' : '#f6efe2', 'serif'],
      r: a.note ? a.note.slice(0, 140) : 'Libro sumado a la biblioteca por ' + a.by + '.',
      nuevo: true, aporte: a, bookcase: a.bookcase, shelf: a.shelf,
    };
  }
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  }
  function luminance(hex) { const n = parseInt(hex.slice(1), 16); return (.299 * (n >> 16) + .587 * ((n >> 8) & 255) + .114 * (n & 255)) / 255; }

  // ---------- Bibliotecas ----------
  const caseEls = {};
  const scroller = $('caseScroll');
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
    return `<button type="button" class="book bg st-${style} f-${font}${w >= 40 ? ' wide' : ''}${b.nuevo ? ' is-new' : ''}" data-id="${b.id}" style="--bg:${bg};--fg:${fg};--ac:${ac};--h:${h};--w:${w}" aria-label="${esc(b.t)}, de ${esc(b.a)}">
      <span class="sp-text">${narrow ? '' : `<span class="sp-a">${esc(author)}</span>`}<span class="sp-t">${esc(b.t)}</span></span>
      ${w >= 16 ? '<span class="sp-mark"></span>' : ''}<span class="ribbon"></span></button>`;
  }
  function buildCases() {
    scroller.innerHTML = '';
    for (const bc of bookcases) { caseEls[bc.id] = buildBookcase(bc); scroller.appendChild(caseEls[bc.id]); }
    for (const [id, el] of Object.entries(caseEls)) el.hidden = id !== state.view;
    buildSala();
  }

  // ---------- La sala: las dos bibliotecas juntas; al tocar una, la cámara se acerca ----------
  const DECOR_W = { thinker: 158, bookend: 72, bastet: 0, horse: 0, bull: 0 };
  function designWidth(bcId) {
    return Math.max(...shelves.filter(s => s.bookcase === bcId).map(s => s.items.reduce((w, i) =>
      w + (i.decor ? (i.front != null ? 0 : DECOR_W[i.decor] || 0) : (books[i.id].s[3] + .6)), 0))) + 30;
  }
  function buildSala() {
    const host = $('salaCases');
    host.innerHTML = '';
    for (const bc of bookcases) {
      const wrap = document.createElement('button');
      wrap.type = 'button';
      wrap.className = 'sala-case';
      wrap.dataset.zoom = bc.id;
      wrap.setAttribute('aria-label', `${bc.name}: ${bc.subtitle}. Acercarse`);
      const mini = buildBookcase(bc);
      mini.classList.add('mini-case');
      mini.setAttribute('aria-hidden', 'true');
      mini.querySelectorAll('button').forEach(b => b.tabIndex = -1);
      wrap.appendChild(mini);
      wrap.insertAdjacentHTML('beforeend', `<span class="sala-label"><b>${esc(bc.name)}</b><span>${esc(bc.subtitle)} · </span>${order.filter(b => b.bookcase === bc.id).length} libros</span>`);
      host.appendChild(wrap);
    }
    refreshMarksIn(host);
    layoutSala();
  }
  function layoutSala() {
    const stage = $('salaStage');
    if (!stage || $('viewRoom').hidden) return;
    const minis = [...stage.querySelectorAll('.mini-case')];
    const widths = minis.map(m => designWidth(m.dataset.case));
    // En el celular van una debajo de la otra, a todo el ancho; en la compu, lado a lado.
    const availW = stage.clientWidth - (mobile() ? 30 : 210);
    const availH = Math.max(260, innerHeight * .62);
    const totalW = mobile() ? Math.max(...widths) + 128 : widths.reduce((a, w) => a + w + 128, 0);
    const u = Math.min(availW / totalW, mobile() ? 1 : availH / 1760, .5);
    minis.forEach((m, i) => { m.style.setProperty('--u', u.toFixed(4)); m.style.setProperty('--inner', Math.ceil(widths[i]) + 'px'); });
  }
  addEventListener('resize', () => requestAnimationFrame(layoutSala));
  function zoomInto(bcId) {
    const stage = $('salaStage'), target = stage.querySelector(`[data-zoom="${bcId}"] .mini-case`);
    if (!target || matchMedia('(prefers-reduced-motion: reduce)').matches) return setView(bcId);
    const r = target.getBoundingClientRect(), s = stage.getBoundingClientRect();
    const scale = Math.min(innerWidth / r.width, innerHeight / r.height) * 1.15;
    const ox = r.left + r.width / 2 - s.left, oy = r.top + r.height * .45 - s.top;
    stage.style.transformOrigin = `${ox}px ${oy}px`;
    stage.classList.add('zooming');
    stage.style.transform = `scale(${scale})`;
    setTimeout(() => {
      setView(bcId);
      scrollTo({ top: Math.max(0, $('viewShelves').offsetTop - 8) });
      stage.classList.remove('zooming');
      stage.style.transform = '';
      const el = caseEls[bcId];
      el.classList.add('arrive');
      setTimeout(() => el.classList.remove('arrive'), 900);
    }, 1000);
  }
  $('salaCases').addEventListener('click', e => { const c = e.target.closest('[data-zoom]'); if (c) zoomInto(c.dataset.zoom); });

  // ---------- Entrada: video del lugar (o recorrido por las fotos) ----------
  function showIntro() {
    const intro = $('intro');
    let seen = false;
    try { seen = sessionStorage.getItem('biblio:intro') === '1'; } catch {}
    if (seen || location.hash || navigator.webdriver) return;
    intro.hidden = false;
    document.body.classList.add('intro-on');
    // Si existe assets/video/entrada.mp4, se usa el video; si no, quedan las fotos en movimiento.
    const video = document.createElement('video');
    Object.assign(video, { muted: true, autoplay: true, loop: true, playsInline: true, preload: 'auto' });
    video.setAttribute('playsinline', '');
    video.poster = 'assets/fotos/foto-01.webp';
    video.className = 'intro-video';
    video.innerHTML = '<source src="assets/video/entrada.webm" type="video/webm"><source src="assets/video/entrada.mp4" type="video/mp4">';
    video.addEventListener('loadeddata', () => { $('introMedia').appendChild(video); $('introMedia').classList.add('has-video'); $('introSound').hidden = false; }, { once: true });
    video.load();
    $('introSound').onclick = () => { video.muted = !video.muted; $('introSound').textContent = video.muted ? '🔇' : '🔊'; };
    const close = () => {
      try { sessionStorage.setItem('biblio:intro', '1'); } catch {}
      intro.classList.add('leaving');
      document.body.classList.remove('intro-on');
      setTimeout(() => { intro.hidden = true; video.pause(); }, 900);
      setView('room');
    };
    $('introEnter').onclick = close;
    $('introSkip').onclick = close;
    addEventListener('keydown', function esc(e) { if (e.key === 'Escape' && !intro.hidden) { close(); removeEventListener('keydown', esc); } });
    $('introEnter').focus();
  }
  const bookEl = id => scroller.querySelector(`.book[data-id="${id}"]`);

  // Escala: los lomos se miden en píxeles de diseño; --u los ajusta al ancho disponible.
  function layout() {
    const el = caseEls[state.view];
    if (!el || el.hidden) return;
    el.style.setProperty('--u', 1);
    const rows = [...el.querySelectorAll('.row')];
    const need = Math.max(...rows.map(r => [...r.children].reduce((sum, c) => sum + (c.classList.contains('front') ? 0 : c.getBoundingClientRect().width), 0)));
    const design = need + 26 + 2 * 46 + 20;
    const avail = scroller.clientWidth - 8;
    let u = Math.min(1.12, avail / design);
    const min = mobile() ? .72 : .6, small = u < min;
    if (small) u = min;
    el.style.setProperty('--u', u.toFixed(4));
    el.style.setProperty('--inner', Math.ceil(need + 26) + 'px');
    scroller.classList.toggle('pan', small);
    // Si sobra lugar al final de un estante, el último libro se apoya inclinado.
    for (const r of rows) {
      r.querySelectorAll('.lean').forEach(b => b.classList.remove('lean'));
      const books = [...r.children].filter(c => !c.classList.contains('front')), last = books[books.length - 1];
      const used = books.reduce((s, c) => s + c.getBoundingClientRect().width, 0) / u;
      if (last && last.classList.contains('book') && need - used > 70) last.classList.add('lean');
    }
  }
  addEventListener('resize', () => requestAnimationFrame(layout));

  // ---------- Vistas ----------
  const views = { room: 'viewRoom', A: 'viewShelves', B: 'viewShelves', catalog: 'viewCatalog', stats: 'viewStats', photos: 'viewPhotos' };
  function setView(view, push = true) {
    if (!views[view]) view = 'room';
    state.view = view;
    for (const t of document.querySelectorAll('[data-view]')) t.setAttribute('aria-pressed', t.dataset.view === view || (t.dataset.view === 'shelves' && (view === 'A' || view === 'B')));
    for (const id of new Set(Object.values(views))) $(id).hidden = id !== views[view];
    for (const [id, el] of Object.entries(caseEls)) el.hidden = id !== view;
    document.body.dataset.view = view;
    if (view === 'A' || view === 'B') { state.lastCase = view; layout(); scroller.scrollLeft = 0; }
    if (view === 'catalog') renderCatalog();
    if (view === 'stats') renderStats();
    if (view === 'photos') renderPhotos();
    if (view === 'room') layoutSala();
    hidePeek();
    if (push && location.hash !== '#' + view) history.replaceState(null, '', '#' + view);
    applyFilters();
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-view]');
    if (!t || t.closest('dialog')) return;
    if (state.view === 'room' && (t.dataset.view === 'A' || t.dataset.view === 'B')) return zoomInto(t.dataset.view);
    setView(t.dataset.view === 'shelves' ? state.lastCase || 'A' : t.dataset.view);
    if (mobile()) scrollTo({ top: 0 });
  });
  document.addEventListener('click', e => {
    if (e.target.closest('[data-new-book]')) openForm('new');
    const sh = e.target.closest('[data-shelf-photo]');
    if (sh) openForm('shelf', sh.dataset.shelfPhoto || ((state.view === 'B' ? 'B' : 'A') + '1'));
  });

  // ---------- Filtros ----------
  function matches(b) {
    if (state.cat && b.c !== state.cat) return false;
    const m = state.marks[b.id];
    if (state.status === 'dudas' ? b.q < 2 : state.status === 'no' ? m === 'leido' : state.status && m !== state.status) return false;
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
      if (!el) continue;
      el.classList.toggle('dim', active && !ok);
      el.classList.toggle('hit', active && ok);
    }
    const hint = $('shelfHint');
    if (!active) hint.textContent = touch ? 'Tocá un lomo para abrir el libro. Deslizá de costado para recorrer los estantes.' : 'Pasá el mouse por un lomo para ver de qué se trata. Hacé clic para abrirlo.';
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
    $('chips').innerHTML = `<button type="button" class="chip" data-cat="" aria-pressed="${!state.cat}">Todas <b>${order.length}</b></button>` +
      Object.entries(categories).filter(([id]) => counts[id]).map(([id, c]) =>
        `<button type="button" class="chip" data-cat="${id}" style="--cc:${c.color}" aria-pressed="${state.cat === id}"><span>${c.icon}</span> ${esc(c.name)} <b>${counts[id]}</b></button>`).join('');
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

  // ---------- Resúmenes (se cargan al abrir cada libro) ----------
  const summaries = {};
  // Si la IA escribió un resumen para un libro nuevo o corregido, ese manda sobre el archivo.
  const aiSource = b => b?.nuevo ? (b.aporte.ai?.summary ? b.aporte.id : null) : b?.aiSummary || null;
  function loadSummary(id) {
    const b = books[id], ai = aiSource(b), key = ai ? 'ai:' + ai : id;
    if (!b || (b.nuevo && !ai)) return Promise.resolve(null);
    if (summaries[key] !== undefined) return Promise.resolve(summaries[key]);
    const url = ai ? '/api/ia?resumen=' + ai : 'data/resumenes/' + id + '.json';
    return summaries[key] = fetch(url).then(r => r.ok ? r.json() : null).catch(() => null).then(j => (summaries[key] = j?.corto ? j : false));
  }
  const words = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;
  const minutes = s => Math.max(1, Math.round(words(s) / 200));
  const paragraphs = s => String(s || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('');

  // ---------- Vista previa al pasar el mouse ----------
  const peek = $('peek');
  let peekTimer, peekId = null;
  function showPeek(el) {
    const b = books[el.dataset.id];
    clearTimeout(peekTimer);
    loadSummary(b.id);
    peekTimer = setTimeout(() => {
      peekId = b.id;
      const cat = categories[b.c], mark = state.marks[b.id];
      peek.innerHTML = `<p class="peek-cat" style="--cc:${cat.color}">${cat.icon} ${esc(cat.name)}</p>
        <h3>${esc(b.t)}</h3><p class="peek-by">${esc(b.a)}${b.y ? ' · ' + year(b.y) : ''}</p>
        <p class="peek-sum">${esc(b.r)}</p>
        <p class="peek-foot">${mark ? `<span class="pill pill-${mark}">${STATUS[mark].icon} ${STATUS[mark].label}</span>` : ''}${b.fam ? '<span class="pill pill-fam">Autor de la familia</span>' : ''}${b.nuevo ? '<span class="pill pill-new">Nuevo</span>' : ''}${b.q > 1 ? '<span class="pill pill-doubt">Por confirmar</span>' : ''}<span class="peek-more">Clic para leer el resumen</span></p>`;
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
  const by = a => `${esc(a.by)}, ${new Date(a.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`;

  function openBook(id, push = true) {
    const b = books[id];
    if (!b) return;
    state.current = id;
    renderBook(id);
    if (!dialog.open) dialog.showModal();
    $('bookBody').scrollTop = 0;
    for (const el of scroller.querySelectorAll('.book.open')) el.classList.remove('open');
    bookEl(id)?.classList.add('open');
    if (push) history.replaceState(null, '', '#libro/' + id);
    loadSummary(id).then(() => { if (state.current === id && dialog.open) renderBook(id, true); });
  }
  function renderBook(id, keepScroll) {
    const b = books[id], cat = categories[b.c], mark = state.marks[id];
    const [bg, fg, , , style = 'plain', ac = '#000', font = 'serif'] = b.s;
    const readers = state.shared?.byBook?.[id];
    const who = readers ? Object.entries(STATUS).filter(([k]) => readers[k]?.length).map(([k, s]) => `<p><b>${k === 'quiero' ? 'Lo quieren leer' : k === 'leido' ? 'Lo leyeron' : 'Lo están leyendo'}:</b> ${readers[k].map(esc).join(', ')}</p>`).join('') : '';
    const prev = order[b.index - 1], next = order[b.index + 1];
    const body = $('bookBody'), scroll = body.scrollTop;
    const ai = aiSource(b), loaded = summaries[ai ? 'ai:' + ai : id], loading = loaded && typeof loaded.then === 'function', data = loaded && !loading ? loaded : null;
    let sum;
    if (b.nuevo && !data) sum = state.iaBusy === b.aporte.id ? '<p class="ia-busy">🤖 La IA está escribiendo el resumen…</p>' : b.aporte.note ? `<div class="summary">${paragraphs(b.aporte.note)}</div><p class="muted small">Nota de ${by(b.aporte)}. El resumen completo está pendiente.</p>` : `<p class="muted">Este libro lo sumó ${by(b.aporte)}. El resumen todavía está pendiente.</p>`;
    else if (data?.[state.len]) sum = `<p class="read-time">⏱ ${minutes(data[state.len])} min de lectura · ${words(data[state.len])} palabras${ai ? ' · 🤖 escrito por IA' : ''}</p><div class="summary">${paragraphs(data[state.len])}</div>`;
    else if (loading) sum = `<p class="read-time">Cargando resumen…</p><div class="summary">${paragraphs(b.l || b.m || b.r)}</div>`;
    else sum = `<div class="summary">${paragraphs(b.l || b.m || b.r)}</div><p class="muted small">El resumen ampliado de este libro está en preparación.</p>`;
    const fixes = (b.fix || []).slice().reverse();
    body.innerHTML = `
      <div class="sheet-bar"><button type="button" class="close" data-close aria-label="Cerrar">×</button><span class="grab" aria-hidden="true"></span></div>
      <div class="detail">
        <div class="cover-wrap">${b.aporte?.photo ? `<img class="cover-photo" data-photo="${b.aporte.id}" alt="Foto de ${esc(b.t)}">` : `<div class="cover st-${style} f-${font}" style="--bg:${bg};--fg:${fg};--ac:${ac}">
          <div class="cover-front"><span class="cover-a">${esc(b.a)}</span><span class="cover-t">${esc(b.t)}</span><span class="cover-orn"></span></div>
          <div class="cover-side bg"></div></div>`}</div>
        <div class="info">
          <p class="cat-pill" style="--cc:${cat.color}">${cat.icon} ${esc(cat.name)}</p>
          <h2 id="bookTitle">${esc(b.t)}</h2>
          <p class="by">${esc(b.a)}${b.y ? ` · <span>${year(b.y)}</span>` : ''}</p>
          <p class="where">📍 ${where(b)}</p>
          ${b.fam ? '<p class="note fam">✒️ Escrito por un Gregorini: autor de la familia.</p>' : ''}
          ${b.q > 1 ? `<div class="note doubt"><p><b>${b.q === 3 ? 'Identificación dudosa' : 'Identificación probable'}.</b> El lomo no se lee completo en la foto. ¿Lo tenés a mano? Sacale una foto y corregilo.</p><button type="button" class="btn-fix" data-fix>📷 Rectificar con una foto</button></div>` : ''}
          ${fixes.length ? `<div class="note fixed">${fixes.map(f => `<p>✏️ <b>Corregido por ${by(f)}</b>${f.title || f.author ? `: antes figuraba como «${esc(base[id]?.t)}» de ${esc(base[id]?.a)}` : ''}.${f.ai ? ` 🤖 La IA leyó «${esc(f.ai.title)}»${f.ai.author ? ' de ' + esc(f.ai.author) : ''}${f.ai.confident ? '' : ' (no está segura)'}.` : ''}${f.note ? ` «${esc(f.note)}»` : ''}${f.photo ? ` <button type="button" class="link" data-show-photo="${f.id}">Ver foto</button>` : ''}${f.by === state.name ? ` · <button type="button" class="link" data-del-aporte="${f.id}">Deshacer</button>` : ''}</p>`).join('')}<div class="fix-photo" id="fixPhoto"></div></div>` : ''}
          ${b.moved ? `<p class="note">↪ Lo cambió de estante ${by(b.moved)}, con una foto.</p>` : ''}
          ${b.dup ? `<p class="note">📚 Hay otro ejemplar en la biblioteca: <button type="button" class="link" data-open="${b.dup}">ver dónde está</button>.</p>` : ''}
          ${b.nuevo && !data ? '' : `<div class="seg seg-small" role="group" aria-label="Resumen">${Object.entries(LEN).map(([k, v]) => `<button type="button" data-len="${k}" aria-pressed="${k === state.len}">${v}<small>${k === 'corto' ? '2 min' : '7 min'}</small></button>`).join('')}</div>`}
          ${sum}
          <div class="status" role="group" aria-label="Tu lectura">${Object.entries(STATUS).map(([k, s]) => `<button type="button" class="st st-btn-${k}" data-mark="${k}" aria-pressed="${mark === k}"><span>${s.icon}</span> ${s.label}</button>`).join('')}</div>
          <p class="muted small">${state.token ? `Marcando como <b>${esc(state.name)}</b>.` : 'Tus marcas se guardan en este navegador. <button type="button" class="link" data-login>Entrá</button> para tenerlas en todos lados.'}</p>
          ${who ? `<div class="readers">${who}</div>` : ''}
          <div class="tools">
            ${b.q > 1 ? '' : '<button type="button" class="ghost" data-fix>📷 Rectificar</button>'}
            ${b.nuevo && b.aporte.by === state.name ? `<button type="button" class="ghost" data-del-aporte="${b.aporte.id}">Quitar de la biblioteca</button>` : ''}
            <a class="ghost" href="https://www.google.com/search?tbm=bks&q=${encodeURIComponent(b.t + ' ' + b.a)}" target="_blank" rel="noopener">Buscar el libro ↗</a>
          </div>
          <nav class="book-nav">
            <button type="button" ${prev ? `data-open="${prev.id}"` : 'disabled'}>← ${prev ? esc(short(prev.t)) : ''}</button>
            <button type="button" ${next ? `data-open="${next.id}"` : 'disabled'}>${next ? esc(short(next.t)) : ''} →</button>
          </nav>
        </div>
      </div>`;
    if (keepScroll) body.scrollTop = scroll;
    const img = body.querySelector('[data-photo]');
    if (img) loadPhoto(img.dataset.photo).then(src => { if (src) img.src = src; else img.replaceWith(Object.assign(document.createElement('p'), { className: 'muted', textContent: 'Sin foto.' })); });
  }
  const short = t => t.length > 22 ? t.slice(0, 20).trim() + '…' : t;

  dialog.addEventListener('click', e => {
    if (e.target === dialog || e.target.closest('[data-close]')) return dialog.close();
    const len = e.target.closest('[data-len]');
    if (len) { state.len = len.dataset.len; store.set('biblio:len2', state.len); renderBook(state.current, true); return; }
    const open = e.target.closest('[data-open]');
    if (open) {
      const b = books[open.dataset.open];
      if ((state.view === 'A' || state.view === 'B') && b.bookcase !== state.view) setView(b.bookcase, false);
      openBook(b.id);
      bookEl(b.id)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
    const mark = e.target.closest('[data-mark]');
    if (mark) setMark(state.current, state.marks[state.current] === mark.dataset.mark ? null : mark.dataset.mark);
    if (e.target.closest('[data-login]')) { dialog.close(); openLogin(); }
    if (e.target.closest('[data-fix]')) openForm('fix', state.current);
    const show = e.target.closest('[data-show-photo]');
    if (show) loadPhoto(show.dataset.showPhoto).then(src => { if (src) $('fixPhoto').innerHTML = `<img src="${src}" alt="Foto de la corrección">`; });
    const del = e.target.closest('[data-del-aporte]');
    if (del && confirm('¿Seguro? Se borra para todos.')) removeAporte(del.dataset.delAporte);
  });
  dialog.addEventListener('keydown', e => {
    if (e.target.closest('input,select,textarea')) return;
    const b = books[state.current];
    if (e.key === 'ArrowRight' && order[b.index + 1]) openBook(order[b.index + 1].id);
    if (e.key === 'ArrowLeft' && order[b.index - 1]) openBook(order[b.index - 1].id);
  });
  dialog.addEventListener('close', () => {
    for (const el of scroller.querySelectorAll('.book.open')) el.classList.remove('open');
    if (location.hash.startsWith('#libro/')) history.replaceState(null, '', '#' + state.view);
    const el = state.current && bookEl(state.current);
    if (el && !el.closest('[hidden]') && !touch) el.focus({ preventScroll: true });
  });
  // En el celular, deslizar la ficha hacia abajo desde la barra la cierra.
  let dragY = null;
  dialog.addEventListener('touchstart', e => { if (e.target.closest('.sheet-bar')) dragY = e.touches[0].clientY; }, { passive: true });
  dialog.addEventListener('touchmove', e => { if (dragY != null) dialog.style.transform = `translateY(${Math.max(0, e.touches[0].clientY - dragY)}px)`; }, { passive: true });
  dialog.addEventListener('touchend', e => {
    if (dragY == null) return;
    const moved = e.changedTouches[0].clientY - dragY;
    dragY = null; dialog.style.transform = '';
    if (moved > 90) dialog.close();
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
  const countRead = () => Object.keys(state.marks).filter(id => state.marks[id] === 'leido' && books[id]).length;
  function refreshMarksIn(root) {
    for (const el of root.querySelectorAll('.book')) {
      const m = state.marks[el.dataset.id];
      el.classList.remove('m-leido', 'm-leyendo', 'm-quiero');
      if (m) el.classList.add('m-' + m);
    }
  }
  function refreshMarks() {
    refreshMarksIn(scroller);
    if ($('salaCases')) refreshMarksIn($('salaCases'));
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
  let afterLogin = null;
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
    if (afterLogin) { const fn = afterLogin; afterLogin = null; fn(); }
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
  function openLogin(reason) {
    $('loginForm').hidden = Boolean(state.token);
    $('profile').hidden = !state.token;
    if (state.token) {
      $('profileName').textContent = state.name;
      const c = s => Object.values(state.marks).filter(v => v === s).length;
      $('profileInfo').textContent = `Leíste ${c('leido')} de ${order.length} libros, estás leyendo ${c('leyendo')} y querés leer ${c('quiero')}. Tus marcas se guardan en tu cuenta.`;
    } else $('loginError').textContent = reason || '';
    loginDialog.showModal();
  }
  $('account').addEventListener('click', () => openLogin());
  $('closeProfile').addEventListener('click', () => loginDialog.close());
  $('logout').addEventListener('click', () => { loginDialog.close(); signOut('Saliste. Lo que marques ahora queda en este navegador.'); });
  loginDialog.addEventListener('close', () => { if (!state.token) afterLogin = null; });
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

  // ---------- Aportes: rectificar un libro o sumar uno nuevo ----------
  const LOCAL_APORTES = 'biblio:aportes:local';
  async function loadAportes() {
    let remote = [];
    try { remote = (await api('aportes')).aportes || []; state.server = true; }
    catch (e) { if (e.status === 0 || e.status === 404) state.server = false; }
    state.aportes = [...remote, ...store.get(LOCAL_APORTES, [])];
    rebuild();
  }
  function rebuild() {
    indexBooks();
    buildCases();
    renderChips();
    refreshMarks();
    if (state.view === 'A' || state.view === 'B') layout();
    applyFilters();
    if (dialog.open && books[state.current]) renderBook(state.current, true);
  }
  const photoCache = {};
  function loadPhoto(id) {
    const local = store.get(LOCAL_APORTES, []).find(a => a.id === id);
    if (local) return Promise.resolve(local.photoData || null);
    return photoCache[id] ??= api('aportes?foto=' + id).then(r => r.photo).catch(() => null);
  }
  async function removeAporte(id) {
    const local = store.get(LOCAL_APORTES, []);
    if (local.some(a => a.id === id)) store.set(LOCAL_APORTES, local.filter(a => a.id !== id));
    else {
      try { await api('aportes', { action: 'delete', id }); }
      catch (e) { return toast(e.message); }
    }
    const was = state.aportes.find(a => a.id === id);
    state.aportes = state.aportes.filter(a => a.id !== id);
    if (was?.type === 'new') { dialog.close(); state.current = null; }
    rebuild();
    toast('Listo, se deshizo.');
  }

  // Achica la foto (máx. 1280 px) y calcula su color dominante para pintar el lomo.
  function readPhoto(file, max = 1280) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) return reject(new Error('Elegí una imagen.'));
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, c.width, c.height);
        let q = .8, data;
        do { data = c.toDataURL('image/jpeg', q); q -= .12; } while (data.length > 850000 && q > .3);
        const px = ctx.getImageData(Math.round(c.width * .3), Math.round(c.height * .3), Math.max(1, Math.round(c.width * .4)), Math.max(1, Math.round(c.height * .4))).data;
        let r = 0, g = 0, bl = 0, n = 0;
        for (let i = 0; i < px.length; i += 16) { r += px[i]; g += px[i + 1]; bl += px[i + 2]; n++; }
        const color = '#' + [r, g, bl].map(v => Math.round(v / n).toString(16).padStart(2, '0')).join('');
        resolve({ data, color });
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen.')); };
      img.src = url;
    });
  }

  async function runIA(id) {
    state.iaBusy = id;
    toast('🤖 La IA está leyendo el libro y escribiendo el resumen…');
    if (dialog.open) renderBook(state.current, true);
    try {
      const { aporte } = await api('ia', { id });
      state.aportes = state.aportes.map(a => a.id === id ? aporte : a);
      for (const k of Object.keys(summaries)) if (k === 'ai:' + id) delete summaries[k];
      state.iaBusy = null;
      rebuild();
      const target = aporte.type === 'new' ? 'n-' + aporte.id : aporte.bookId;
      if (dialog.open && state.current === target) openBook(target, false);
      toast(aporte.ai.confident ? `🤖 Listo: «${aporte.ai.title}». Resumen escrito.` : '🤖 Resumen escrito. La IA no está del todo segura de qué libro es: revisalo.');
    } catch (e) {
      state.iaBusy = null;
      if (dialog.open) renderBook(state.current, true);
      toast('La IA no pudo completar el libro: ' + e.message);
    }
  }

  const formDialog = $('formDialog');
  let formPhoto = null;
  function openForm(type, bookId) {
    if (!state.token && state.server !== false) {
      afterLogin = () => openForm(type, bookId);
      if (dialog.open) dialog.close();
      return openLogin(type === 'fix' ? 'Entrá con tu cuenta para rectificar un libro.' : type === 'shelf' ? 'Entrá con tu cuenta para actualizar un estante.' : 'Entrá con tu cuenta para sumar un libro nuevo.');
    }
    if (type === 'shelf') return openShelfForm(bookId);
    formPhoto = null;
    const b = bookId && books[bookId];
    const options = (bc, n) => [1, 2, 3, 4, 5].map(i => `<option value="${bc}${i}" ${bc + i === n ? 'selected' : ''}>${bc === 'A' ? 'Biblioteca I' : 'Biblioteca II'} · estante ${i}</option>`).join('');
    $('formBody').innerHTML = `
      <div class="sheet-bar"><button type="button" class="close" data-close-form aria-label="Cerrar">×</button><span class="grab" aria-hidden="true"></span></div>
      <h2>${type === 'fix' ? '📷 Rectificar libro' : '＋ Nuevo libro'}</h2>
      <p class="muted">${type === 'fix'
        ? `Si el lomo se leyó mal, sacale una foto al libro (lomo o tapa)${state.ia ? ': la IA la lee y corrige título, autor y resumen sola' : ' y corregí lo que haga falta'}. Ahora figura como <b>«${esc(b.t)}»</b> de ${esc(b.a)}.`
        : `Sumá un libro que llegó a la biblioteca. Con una foto de la tapa o del lomo, el lomo se pinta de su color${state.ia ? ' y la IA escribe el resumen' : ''}.`}</p>
      <div class="photo-pick">
        <div class="photo-preview" id="photoPreview"><span>${type === 'fix' ? 'Foto del lomo o la tapa' : 'Foto de la tapa'}</span></div>
        <div class="photo-btns">
          <label class="btn-photo">📷 Sacar foto<input type="file" accept="image/*" capture="environment" id="camInput"></label>
          <label class="btn-photo alt">🖼️ Importar imagen<input type="file" accept="image/*" id="fileInput"></label>
        </div>
      </div>
      <form id="aporteForm" class="aporte" novalidate>
        <label>Título${type === 'new' ? ' *' : ''} <input name="title" maxlength="160" ${type === 'fix' ? `value="${esc(b.t)}"` : 'required'} autocomplete="off"></label>
        <label>Autor <input name="author" maxlength="120" ${type === 'fix' ? `value="${esc(b.a)}"` : ''} autocomplete="off"></label>
        ${type === 'new' ? `
          <div class="row2">
            <label>Categoría <select name="category">${Object.entries(categories).map(([id, c]) => `<option value="${id}">${c.icon} ${esc(c.name)}</option>`).join('')}</select></label>
            <label>Año <input name="year" inputmode="numeric" maxlength="5" placeholder="Opcional"></label>
          </div>
          <label>¿Dónde lo pusieron? <select name="place">${options('A', 'A5')}${options('B', '')}</select></label>
          <label class="check"><input type="checkbox" name="read"> Ya lo leí</label>` : ''}
        <label>${type === 'fix' ? 'Comentario (opcional)' : 'De qué trata o por qué está acá (opcional)'} <textarea name="note" rows="3" maxlength="2000" placeholder="${type === 'fix' ? 'Por ejemplo: es el tomo 2, no el 1.' : 'Un par de líneas para la ficha.'}"></textarea></label>
        <p class="error" id="formError" role="alert"></p>
        <button class="primary big" type="submit">${type === 'fix' ? 'Guardar corrección' : 'Sumar a la biblioteca'}</button>
        ${state.server === false ? '<p class="muted small">Sin conexión con el servidor: se guarda solo en este navegador.</p>' : `<p class="muted small">Queda a nombre de <b>${esc(state.name)}</b> y lo ve toda la familia.</p>`}
      </form>`;
    formDialog.dataset.type = type;
    formDialog.dataset.book = bookId || '';
    if (!formDialog.open) formDialog.showModal();
  }
  // ---------- Foto de un estante: la IA lee los lomos y se revisan los cambios ----------
  let shelfPlan = null;
  const shelfOf = key => shelves.find(s => s.bookcase === key[0] && s.n === Number(key[1]));
  const shelfName = key => `${key[0] === 'A' ? 'Biblioteca I' : 'Biblioteca II'} · estante ${key[1]}`;
  function openShelfForm(key) {
    formPhoto = null; shelfPlan = null;
    const opts = ['A', 'B'].flatMap(bc => [1, 2, 3, 4, 5].map(n => `<option value="${bc}${n}" ${bc + n === key ? 'selected' : ''}>${shelfName(bc + n)}</option>`)).join('');
    $('formBody').innerHTML = `
      <div class="sheet-bar"><button type="button" class="close" data-close-form aria-label="Cerrar">×</button><span class="grab" aria-hidden="true"></span></div>
      <h2>📷 Actualizar un estante</h2>
      <p class="muted">¿Llegaron libros o cambió el orden? Sacale una foto al estante (entero o una parte), de frente y con buena luz. ${state.ia ? 'La IA lee los lomos y te muestra los cambios para que los confirmes.' : 'La foto queda guardada para procesarla: cuando se active la IA, se actualiza el estante.'}</p>
      <form id="shelfForm" class="aporte" novalidate>
        <label>¿Qué estante es? <select name="shelf">${opts}</select></label>
        <div class="photo-pick">
          <div class="photo-preview tall" id="photoPreview"><span>Foto del estante</span></div>
          <div class="photo-btns">
            <label class="btn-photo">📷 Sacar foto<input type="file" accept="image/*" capture="environment" id="camInput"></label>
            <label class="btn-photo alt">🖼️ Importar imagen<input type="file" accept="image/*" id="fileInput"></label>
          </div>
        </div>
        <label class="check"><input type="checkbox" name="full"> La foto muestra el estante completo</label>
        <p class="error" id="formError" role="alert"></p>
        <button class="primary big" type="button" data-shelf-analyze>${state.ia ? '🤖 Leer los lomos' : 'Guardar la foto'}</button>
      </form>
      <div id="shelfReview"></div>`;
    formDialog.dataset.type = 'shelf';
    formDialog.dataset.book = '';
    if (!formDialog.open) formDialog.showModal();
  }
  async function analyzeShelfPhoto() {
    const f = $('shelfForm'), key = f.elements.shelf.value, full = f.elements.full.checked;
    if (!formPhoto) return $('formError').textContent = 'Primero sacá o importá la foto del estante.';
    const button = f.querySelector('[data-shelf-analyze]');
    button.disabled = true;
    $('formError').textContent = '';
    if (!state.ia || state.server === false) {
      // Sin IA: la foto queda pendiente para procesarla más adelante.
      button.textContent = 'Guardando…';
      try {
        const { aporte } = await api('aportes', { action: 'add', type: 'shelf', bookcase: key[0], shelf: Number(key[1]), order: [], removed: [], photo: formPhoto.data });
        state.aportes.push(aporte);
        formDialog.close();
        toast('Foto guardada. El estante se actualiza cuando se active la IA.');
      } catch (err) { $('formError').textContent = err.message; button.disabled = false; button.textContent = 'Guardar la foto'; }
      return;
    }
    button.textContent = '🤖 Leyendo los lomos… (puede tardar un minuto)';
    button.classList.add('ia-busy');
    const current = shelfOf(key).items.filter(i => i.id).map(i => i.id);
    try {
      const { spines } = await api('ia', { action: 'shelf', photo: formPhoto.data, shelfIds: current, catalog: order.map(b => ({ id: b.id, t: b.t, a: b.a })) });
      shelfPlan = { key, full, current, spines: spines.map((sp, i) => ({ ...sp, i, take: true, category: 'clasicos' })) };
      renderShelfReview();
    } catch (err) { $('formError').textContent = err.message; }
    button.disabled = false; button.classList.remove('ia-busy'); button.textContent = '🤖 Volver a leer los lomos';
  }
  function renderShelfReview() {
    const p = shelfPlan, here = new Set(p.current), seen = new Set(p.spines.map(sp => sp.match).filter(Boolean));
    const missing = p.full ? p.current.filter(id => !seen.has(id)) : [];
    p.missing = missing.map(id => ({ id, take: p.missing?.find(m => m.id === id)?.take ?? false }));
    const kind = sp => !sp.match ? 'new' : here.has(sp.match) ? 'ok' : 'moved';
    const label = { ok: '✓ En su lugar', moved: '↪ Viene de otro estante', new: '＋ Libro nuevo' };
    const counts = { ok: 0, moved: 0, new: 0 };
    p.spines.forEach(sp => counts[kind(sp)]++);
    const reordered = p.spines.filter(sp => kind(sp) === 'ok').map(sp => sp.match).join() !== p.current.filter(id => seen.has(id)).join();
    $('shelfReview').innerHTML = `
      <h3 class="review-title">Lo que se ve en la foto</h3>
      <p class="muted small">${p.spines.length} lomos leídos: ${counts.ok} en su lugar, ${counts.moved} de otro estante y ${counts.new} nuevos.${reordered ? ' <b>El orden cambió.</b>' : ''} Destildá lo que la IA leyó mal.</p>
      <ol class="spines">${p.spines.map(sp => {
        const k = kind(sp), b = books[sp.match];
        return `<li class="spine-row k-${k}"><label class="check"><input type="checkbox" data-spine="${sp.i}" ${sp.take ? 'checked' : ''}>
          <span><b>${esc(b ? b.t : sp.title)}</b><small>${esc(b ? b.a : sp.author || 'Autor sin leer')}${k === 'moved' ? ` · estaba en ${shelfName(b.bookcase + b.shelf)}` : ''}${sp.confidence === 'baja' ? ' · ⚠️ lectura dudosa' : ''}</small></span></label>
          <span class="tag">${label[k]}</span>
          ${k === 'new' ? `<select data-spine-cat="${sp.i}" aria-label="Categoría">${Object.entries(categories).map(([id, c]) => `<option value="${id}" ${sp.category === id ? 'selected' : ''}>${c.icon} ${esc(c.name)}</option>`).join('')}</select>` : ''}</li>`;
      }).join('')}</ol>
      ${missing.length ? `<h3 class="review-title">No aparecen en la foto</h3><p class="muted small">Tildá los que ya no están en la biblioteca. Los que no tildes quedan en el estante, al final.</p>
        <ul class="spines">${p.missing.map(m => `<li class="spine-row k-gone"><label class="check"><input type="checkbox" data-missing="${m.id}" ${m.take ? 'checked' : ''}><span><b>${esc(books[m.id].t)}</b><small>${esc(books[m.id].a)}</small></span></label><span class="tag">Ya no está</span></li>`).join('')}</ul>` : ''}
      <button class="primary big" type="button" data-shelf-apply>Aplicar cambios al estante</button>`;
    $('shelfReview').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  async function applyShelfPlan(button) {
    const p = shelfPlan, take = p.spines.filter(sp => sp.take);
    button.disabled = true; button.textContent = 'Guardando…';
    try {
      // 1) Libros nuevos: se crean como aportes y se ubican según la foto.
      const ids = [];
      for (const sp of take) {
        if (sp.match) { ids.push(sp.match); continue; }
        const { aporte } = await api('aportes', { action: 'add', type: 'new', title: sp.title || 'Libro sin título', author: sp.author, category: sp.category, bookcase: p.key[0], shelf: Number(p.key[1]), note: 'Sumado desde una foto del estante.' });
        state.aportes.push(aporte);
        ids.push('n-' + aporte.id);
      }
      // 2) Orden final: si la foto es una parte del estante, ese tramo reemplaza su lugar en el orden actual.
      const removed = p.missing.filter(m => m.take).map(m => m.id), inPhoto = new Set(ids);
      const rest = p.current.filter(id => !inPhoto.has(id) && !removed.includes(id));
      const firstHere = p.current.findIndex(id => inPhoto.has(id));
      const at = p.full ? 0 : firstHere < 0 ? rest.length : p.current.slice(0, firstHere).filter(id => !inPhoto.has(id) && !removed.includes(id)).length;
      const finalOrder = [...rest.slice(0, at), ...ids, ...rest.slice(at)];
      const { aporte } = await api('aportes', { action: 'add', type: 'shelf', bookcase: p.key[0], shelf: Number(p.key[1]), order: finalOrder, removed, photo: formPhoto.data });
      state.aportes.push(aporte);
      formDialog.close();
      rebuild();
      setView(p.key[0]);
      const added = ids.filter(id => id.startsWith('n-')).length;
      toast(`Estante actualizado${added ? `: ${added} ${added === 1 ? 'libro nuevo' : 'libros nuevos'}` : ''}${removed.length ? `, ${removed.length} retirados` : ''}.`);
      if (state.ia) for (const a of state.aportes.filter(a => a.type === 'new' && ids.includes('n-' + a.id) && !a.ai)) runIA(a.id);
    } catch (err) {
      button.disabled = false; button.textContent = 'Aplicar cambios al estante';
      toast('No se pudo guardar: ' + err.message);
    }
  }
  formDialog.addEventListener('click', e => {
    if (e.target.closest('[data-shelf-analyze]')) analyzeShelfPhoto();
    const apply = e.target.closest('[data-shelf-apply]');
    if (apply) applyShelfPlan(apply);
  });
  formDialog.addEventListener('change', e => {
    const sp = e.target.dataset.spine, cat = e.target.dataset.spineCat, miss = e.target.dataset.missing;
    if (sp != null) shelfPlan.spines[sp].take = e.target.checked;
    if (cat != null) shelfPlan.spines[cat].category = e.target.value;
    if (miss) shelfPlan.missing.find(m => m.id === miss).take = e.target.checked;
  });

  formDialog.addEventListener('click', e => { if (e.target === formDialog || e.target.closest('[data-close-form]')) formDialog.close(); });
  formDialog.addEventListener('change', async e => {
    if (!e.target.matches('#camInput, #fileInput')) return;
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    $('formError').textContent = '';
    $('photoPreview').classList.add('busy');
    try {
      formPhoto = await readPhoto(file, formDialog.dataset.type === 'shelf' ? 1568 : 1280);
      $('photoPreview').innerHTML = `<img src="${formPhoto.data}" alt="Foto elegida"><button type="button" class="photo-x" data-clear-photo aria-label="Quitar foto">×</button>`;
    } catch (err) { $('formError').textContent = err.message; }
    $('photoPreview').classList.remove('busy');
  });
  formDialog.addEventListener('click', e => {
    if (!e.target.closest('[data-clear-photo]')) return;
    formPhoto = null;
    $('photoPreview').innerHTML = '<span>Sin foto</span>';
  });
  formDialog.addEventListener('submit', async e => {
    e.preventDefault();
    if (formDialog.dataset.type === 'shelf') return;
    const f = e.target, type = formDialog.dataset.type, bookId = formDialog.dataset.book;
    const val = n => f.elements[n]?.value.trim() || '';
    const payload = { action: 'add', type, note: val('note') };
    if (type === 'fix') {
      const b = books[bookId];
      payload.bookId = bookId;
      payload.originalTitle = b.t;
      payload.originalAuthor = b.a;
      if (val('title') && val('title') !== b.t) payload.title = val('title');
      if (val('author') && val('author') !== b.a) payload.author = val('author');
      if (!formPhoto && !payload.title && !payload.author && !payload.note) return $('formError').textContent = 'Sacá una foto o cambiá el título, el autor o el comentario.';
      // Con IA y una foto nueva, si nadie tocó los datos, que la IA decida.
    } else {
      if (!val('title')) return $('formError').textContent = 'Falta el título.';
      Object.assign(payload, { title: val('title'), author: val('author'), category: val('category'), year: /^-?\d{1,4}$/.test(val('year')) ? Number(val('year')) : null,
        bookcase: val('place')[0], shelf: Number(val('place')[1]), color: formPhoto?.color || null });
    }
    if (formPhoto) payload.photo = formPhoto.data;
    const button = f.querySelector('[type=submit]');
    button.disabled = true; button.textContent = 'Guardando…';
    try {
      let aporte;
      if (state.server === false) {
        aporte = { ...payload, id: 'l' + Date.now().toString(36), by: state.name || 'vos', date: Date.now(), photo: Boolean(payload.photo), photoData: payload.photo };
        delete aporte.action;
        const local = store.get(LOCAL_APORTES, []);
        if (!store.set(LOCAL_APORTES, [...local, aporte])) { aporte.photo = false; delete aporte.photoData; store.set(LOCAL_APORTES, [...local, aporte]); }
      } else aporte = (await api('aportes', payload)).aporte;
      state.aportes.push(aporte);
      formDialog.close();
      rebuild();
      if (state.ia && state.server !== false && (aporte.photo || type === 'new')) runIA(aporte.id);
      if (type === 'new') {
        const id = 'n-' + aporte.id;
        if (f.elements.read?.checked) setMark(id, 'leido');
        setView(books[id].bookcase);
        const el = bookEl(id);
        el?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
        el?.classList.add('pick');
        setTimeout(() => { el?.classList.remove('pick'); openBook(id); }, 1000);
        toast('¡Libro sumado a la biblioteca!');
      } else { openBook(bookId); toast('¡Gracias! La corrección quedó guardada.'); }
    } catch (err) {
      $('formError').textContent = err.message;
      button.disabled = false; button.textContent = type === 'fix' ? 'Guardar corrección' : 'Sumar a la biblioteca';
    }
  });

  // ---------- Catálogo ----------
  function renderCatalog() {
    const sort = $('sort').value;
    const list = order.filter(matches);
    const key = { t: b => fold(b.t), a: b => fold(b.a.split(' ').slice(-1)[0] + b.a), c: b => categories[b.c].name + fold(b.t), y: b => b.y ?? 9999, n: b => -(b.aporte?.date || 0) };
    if (key[sort]) list.sort((a, b) => { const x = key[sort](a), y = key[sort](b); return x < y ? -1 : x > y ? 1 : a.index - b.index; });
    $('catalogCount').textContent = `${list.length} ${list.length === 1 ? 'libro' : 'libros'}${filtering() ? ' con estos filtros' : ' en total'}`;
    $('catalog').innerHTML = list.map(b => {
      const cat = categories[b.c], m = state.marks[b.id];
      return `<li><button type="button" class="cat-row" data-open-book="${b.id}">
        <span class="mini" style="--bg:${b.s[0]};--fg:${b.s[1]}"></span>
        <span class="cr-main"><b>${esc(b.t)}</b><span>${esc(b.a)}${b.y ? ' · ' + year(b.y) : ''}</span><span class="cr-mob">${cat.icon} ${esc(cat.name)}</span></span>
        <span class="cr-cat" style="--cc:${cat.color}">${cat.icon} ${esc(cat.name)}</span>
        <span class="cr-loc">${b.bookcase === 'A' ? 'I' : 'II'}·${b.shelf}·${b.place}</span>
        <span class="cr-st">${b.nuevo ? '<span class="pill pill-new">Nuevo</span>' : ''}${m ? `<span class="pill pill-${m}">${STATUS[m].icon}<i> ${STATUS[m].label}</i></span>` : ''}</span>
      </button></li>`;
    }).join('') || '<li class="empty">No hay libros con estos filtros.</li>';
  }
  $('sort').addEventListener('change', renderCatalog);
  $('catalog').addEventListener('click', e => { const r = e.target.closest('[data-open-book]'); if (r) openBook(r.dataset.openBook); });

  // ---------- Estadísticas ----------
  function renderStats() {
    const read = countRead(), c = s => Object.keys(state.marks).filter(id => state.marks[id] === s && books[id]).length;
    const byCat = {}, authors = {};
    for (const b of order) {
      const x = byCat[b.c] ??= { n: 0, read: 0 };
      x.n++; if (state.marks[b.id] === 'leido') x.read++;
      for (const a of b.a.split(/\s*[,&]\s*|\s+y\s+/)) if (a && !/varios|por confirmar|por completar/i.test(a)) authors[a] = (authors[a] || 0) + 1;
    }
    const topAuthors = Object.entries(authors).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12);
    const max = Math.max(...Object.values(byCat).map(x => x.n));
    const doubt = order.filter(b => b.q > 1);
    const oldest = order.filter(b => b.y).sort((a, b) => a.y - b.y)[0];
    const readers = state.shared?.readers || [];
    const recent = state.aportes.slice().sort((a, b) => b.date - a.date).slice(0, 8);
    $('viewStats').innerHTML = `
      <div class="stat-cards">
        <div class="card"><b>${order.length}</b><span>libros en las dos bibliotecas</span></div>
        <div class="card"><b>${Object.keys(authors).length}</b><span>autores distintos</span></div>
        <div class="card ok"><b>${read}</b><span>${state.token ? 'leídos por ' + esc(state.name) : 'leídos (en este navegador)'}</span></div>
        <div class="card"><b>${c('leyendo')}</b><span>leyendo ahora</span></div>
        <div class="card"><b>${c('quiero')}</b><span>en la lista de deseos</span></div>
        <div class="card"><b>${oldest ? year(oldest.y) : '—'}</b><span>la obra más antigua: ${oldest ? esc(oldest.t) : ''}</span></div>
      </div>
      <div class="stat-grid">
        <section class="panel"><h3>Por categoría</h3>
          ${Object.entries(byCat).sort((a, b) => b[1].n - a[1].n).map(([id, x]) => `<button type="button" class="bar" data-cat-go="${id}" style="--cc:${categories[id].color}">
            <span class="bar-label">${categories[id].icon} ${esc(categories[id].name)}</span>
            <span class="bar-track"><span class="bar-fill" style="width:${x.n / max * 100}%"><span class="bar-read" style="width:${x.read / x.n * 100}%"></span></span></span>
            <span class="bar-n">${x.read ? x.read + '/' : ''}${x.n}</span></button>`).join('')}
          <p class="muted small">La parte más oscura de cada barra son los leídos.</p>
        </section>
        <section class="panel"><h3>Lectores de la familia</h3>${readers.length ? `<ol class="authors">${readers.map(r => `<li><span>${esc(r.name)}</span><span>${r.leido} leídos · ${r.leyendo} leyendo · ${r.quiero} quiere</span></li>`).join('')}</ol>` : `<p class="muted">${!state.token ? 'Cuando cada uno entre con su cuenta y marque libros, acá aparece quién leyó qué.' : 'Todavía nadie marcó libros.'}</p>`}</section>
        <section class="panel"><h3>Últimos aportes</h3>${recent.length ? `<ul class="doubt">${recent.map(a => {
          if (a.type === 'shelf') return `<li>📷 <button type="button" class="link" data-shelf-go="${a.bookcase}">${shelfName(a.bookcase + a.shelf)}</button> <span class="muted">${a.pending ? 'foto pendiente de procesar' : 'actualizado'} por ${by(a)}</span></li>`;
          const id = a.type === 'new' ? 'n-' + a.id : a.bookId;
          return `<li>${a.type === 'new' ? '＋' : '✏️'} <button type="button" class="link" data-open-book="${id}">${esc(books[id]?.t || a.title)}</button> <span class="muted">${a.type === 'new' ? 'sumado' : 'corregido'} por ${by(a)}</span></li>`;
        }).join('')}</ul>` : '<p class="muted">Todavía nadie sumó ni corrigió libros.</p>'}<div class="tools"><button type="button" class="ghost" data-new-book>＋ Sumar un libro nuevo</button><button type="button" class="ghost" data-shelf-photo>📷 Actualizar un estante</button></div></section>
        ${state.retirados?.length ? `<section class="panel"><h3>Ya no están <small>${state.retirados.length}</small></h3><ul class="doubt">${state.retirados.map(b => `<li>${esc(b.t)} <span class="muted">${esc(b.a)} · sacado por ${by(b.retirado)}</span></li>`).join('')}</ul></section>` : ''}
        <section class="panel"><h3>Por confirmar <small>${doubt.length}</small></h3><p class="muted small">Lomos que no se leen del todo en las fotos. Abrí uno y tocá <b>Rectificar con una foto</b>.</p><ul class="doubt">${doubt.map(b => `<li><button type="button" class="link" data-open-book="${b.id}">${esc(b.t)}</button> <span class="muted">${esc(b.a)}</span></li>`).join('')}</ul></section>
        <section class="panel"><h3>Autores con más libros</h3><ol class="authors">${topAuthors.map(([a, n]) => `<li><button type="button" class="link" data-author="${esc(a)}">${esc(a)}</button><span>${n}</span></li>`).join('')}</ol></section>
      </div>`;
  }
  $('viewStats').addEventListener('click', e => {
    const cat = e.target.closest('[data-cat-go]'), author = e.target.closest('[data-author]'), open = e.target.closest('[data-open-book]');
    if (cat) { state.cat = cat.dataset.catGo; setView(order.find(b => b.c === state.cat).bookcase); }
    if (author) { state.q = author.dataset.author; $('search').value = state.q; setView('catalog'); }
    if (open && books[open.dataset.openBook]) openBook(open.dataset.openBook);
    const go = e.target.closest('[data-shelf-go]');
    if (go) setView(go.dataset.shelfGo);
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
    if (h === 'nuevo') { setView('room', false); return openForm('new'); }
    if (h.startsWith('libro/') && books[h.slice(6)]) { const b = books[h.slice(6)]; setView(b.bookcase, false); openBook(b.id, false); }
    else setView(views[h] ? h : 'room', false);
  }
  indexBooks();
  buildCases();
  renderChips();
  renderAccount();
  refreshMarks();
  fromHash();
  showIntro();
  addEventListener('hashchange', fromHash);
  if (document.fonts) document.fonts.ready.then(layout);
  api('ia').then(r => { state.ia = Boolean(r.enabled); }).catch(() => { state.ia = false; });
  loadAportes().then(() => { if (location.hash.startsWith('#libro/n-')) fromHash(); });
  if (state.token) api('biblioteca').then(r => {
    state.marks = { ...state.marks, ...r.marks }; state.shared = r; state.server = true;
    store.set(marksKey(), state.marks); refreshMarks();
  }).catch(() => {});

  window.biblioDebug = () => ({ view: state.view, total: order.length, marks: { ...state.marks }, user: state.name, visible: order.filter(matches).length, aportes: state.aportes.length });
})();
