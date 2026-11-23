// Estante: registro de libros, películas, documentales y podcasts.
// Todo se guarda en el teléfono (localStorage). Con cuenta del Lab, además se sincroniza en /api/estante.
(() => {
  'use strict';

  // ---------- Utilidades ----------
  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(key, fallback) { try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } },
    del(key) { try { localStorage.removeItem(key); } catch {} },
  };
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const pad = n => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const thisYear = () => new Date().getFullYear();
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  function fmtDate(s) {
    if (!s) return '';
    const [y, m, d] = s.split('-').map(Number);
    return `${d} ${MONTHS_SHORT[m - 1]}` + (y !== thisYear() ? ` ${y}` : '');
  }
  function daysBetween(a, b) {
    if (!a || !b) return null;
    const ms = Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z');
    return ms >= 0 ? Math.round(ms / 86400000) + 1 : null;
  }
  function fmtMin(m) {
    m = Math.round(m || 0);
    if (!m) return '';
    const h = Math.floor(m / 60), r = m % 60;
    return h ? (r ? `${h} h ${r} min` : `${h} h`) : `${r} min`;
  }

  // ---------- Tipos y estados ----------
  const TYPES = {
    libro: { label: 'Libro', plural: 'Libros', stat: 'libros', doing: 'Leyendo', creator: 'Autor', lengthLabel: 'Páginas', ph: 'Título, autor o ISBN',
      covers: [['#F26B3A', '#1A0A04'], ['#FFD3BF', '#7A2E12'], ['#1F1A17', '#F26B3A'], ['#B4400F', '#FFFFFF']] },
    peli: { label: 'Película', plural: 'Películas', stat: 'películas', doing: 'Viendo', creator: 'Director/a', lengthLabel: 'Minutos', ph: 'Título o director',
      covers: [['#3D6BFF', '#FFFFFF'], ['#0E1A3D', '#9DB4FF'], ['#C9D6FF', '#14245E']] },
    doc: { label: 'Documental', plural: 'Documentales', stat: 'docs', doing: 'Viendo', creator: 'Director/a', lengthLabel: 'Minutos', ph: 'Título, director o tema',
      covers: [['#18A57A', '#04241A'], ['#0B2E22', '#5FD3A8'], ['#BDEBD9', '#0B4A36']] },
    pod: { label: 'Podcast', plural: 'Podcasts', stat: 'podcasts', doing: 'Escuchando', creator: 'Podcast o autor', lengthLabel: 'Minutos', ph: 'Podcast o episodio',
      covers: [['#7C3AED', '#FFFFFF'], ['#1E1233', '#C9A8FF'], ['#E4D6FD', '#3E1B80']] },
  };
  const TYPE_IDS = Object.keys(TYPES);
  const ACCENT = { libro: '#F26B3A', peli: '#3D6BFF', doc: '#18A57A', pod: '#A77BF7' };
  const STATUSES = ['pendiente', 'encurso', 'terminado'];
  const statusLabel = (type, s) => (s === 'encurso' ? TYPES[type].doing : s === 'pendiente' ? 'Pendiente' : 'Terminado');
  const RATING_WORDS = ['Sin puntuar', 'No me gustó', 'Meh', 'Estuvo bien', 'Muy bueno', 'Imperdible'];

  const ICONS = {
    back: '<path d="m15 18-6-6 6-6"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m5 12 5 5L20 7"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    play: '<path d="M7 5v14l11-7z"/>',
    scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M8 9v6M11 9v6M14 9v6M17 9v6"/>',
    libro: '<path d="M4 19V5a2 2 0 0 1 2-2h14v14H6a2 2 0 0 0-2 2 2 2 0 0 0 2 2h14"/>',
    peli: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    doc: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    pod: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 20V8M7 13l5-5 5 5M5 4h14"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 6 6 6-6 6"/>',
  };
  const icon = (name, size = 24, extra = '') => `<svg class="i" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"${extra}>${ICONS[name]}</svg>`;
  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z"/></svg>';

  // ---------- Estado ----------
  const state = {
    items: store.get('estante:items', []).filter(i => i && i.id),
    token: store.get('estante:token', null),
    name: store.get('estante:name', null),
    lastSync: store.get('estante:lastSync', 0),
    sync: 'idle',
    lib: { type: 'todo', status: 'terminado', auto: true, q: '', searching: false },
    add: { type: 'libro', q: '', results: [], loading: false, error: '', seq: 0 },
    year: thisYear(),
    installPrompt: null,
    authError: '',
  };
  const live = () => state.items.filter(i => !i.deleted);
  const find = id => state.items.find(i => i.id === id && !i.deleted);
  const persist = () => { if (!store.set('estante:items', state.items)) toast('No hay más lugar en este teléfono para guardar.'); };

  function save(item, { quiet } = {}) {
    item.updatedAt = Date.now();
    const i = state.items.findIndex(x => x.id === item.id);
    if (i >= 0) state.items[i] = item; else state.items.push(item);
    persist();
    queueSync();
    if (!quiet) render();
  }

  function setStatus(item, status) {
    if (item.status === status) return;
    item.status = status;
    if (status === 'encurso' && !item.startedAt) item.startedAt = today();
    if (status === 'terminado') {
      if (!item.finishedAt) item.finishedAt = today();
      item.progress = item.type === 'libro' ? (item.length || item.progress) : 100;
    }
    if (status === 'pendiente') item.progress = 0;
  }

  function progressInfo(it) {
    if (it.type === 'libro') {
      const page = it.progress || 0;
      if (it.length) {
        const pct = Math.min(100, Math.round(page / it.length * 100));
        return { pct, label: page ? `p. ${page} de ${it.length}` : `${it.length} páginas`, right: `${pct}%` };
      }
      return { pct: 0, label: page ? `Página ${page}` : 'Sin empezar', right: '' };
    }
    const pct = Math.min(100, it.progress || 0);
    const left = it.length ? fmtMin(it.length * (100 - pct) / 100) : '';
    return { pct, label: left ? (pct ? `quedan ${left}` : left) : (pct ? `${pct}%` : 'Sin empezar'), right: it.length || pct ? `${pct}%` : '' };
  }

  const fmtLength = it => (!it.length ? '' : it.type === 'libro' ? `${it.length} p.` : fmtMin(it.length));
  const metaLine = it => [it.creator, it.year, fmtLength(it)].filter(Boolean).join(' · ');

  // ---------- Portadas ----------
  function hash(s) { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
  function cover(it, size) {
    const [bg, fg] = TYPES[it.type].covers[hash(it.ref || it.title) % TYPES[it.type].covers.length];
    const sq = it.type === 'pod' && size !== 'm' && size !== 'l';
    const img = !it.cover ? '' : it.type === 'pod'
      ? `<img class="blur" src="${esc(it.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()"><img class="fit" src="${esc(it.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`
      : `<img src="${esc(it.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`;
    return `<div class="cover cover-${size}${sq ? ' sq' : ''}" style="--cbg:${bg};--cfg:${fg}" aria-hidden="true">
      <span class="cv-kind">${TYPES[it.type].label}</span>
      <span class="cv-title">${esc(it.title)}</span>
      <span class="cv-by">${esc(it.creator)}</span>${img}</div>`;
  }
  const tchip = (type, text) => `<span class="tchip t-${type}">${esc(text || TYPES[type].label)}</span>`;
  const starsText = r => `<span class="stars-txt" aria-label="${r} de 5 estrellas">${'★'.repeat(r)}<i>${'★'.repeat(5 - r)}</i></span>`;

  // ---------- Aviso ----------
  let toastTimer;
  function toast(text, action) {
    const el = $('#toast');
    el.innerHTML = `<span>${esc(text)}</span>` + (action ? `<button type="button">${esc(action.label)}</button>` : '');
    el.hidden = false;
    if (action) el.querySelector('button').onclick = () => { el.hidden = true; action.run(); };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, action ? 5000 : 3000);
  }

  // ---------- Rutas ----------
  function route() {
    const raw = location.hash.replace(/^#\/?/, '');
    const [path, query] = raw.split('?');
    const [name, arg] = path.split('/');
    return { name: name || 'inicio', arg: arg ? decodeURIComponent(arg) : '', params: new URLSearchParams(query || '') };
  }
  const go = hash => { location.hash = hash; };
  // Profundidad dentro de la app, para que "Volver" no saque al usuario de Estante.
  let depth = 1;
  const keepDepth = hash => history.replaceState({ d: depth }, '', hash);

  let lastRoute = '';
  function render() {
    const r = route();
    const key = r.name + '/' + r.arg;
    const view = $('#view');
    const views = { inicio: viewHome, biblioteca: viewLibrary, item: viewItem, agregar: viewAdd, anio: viewYear, perfil: viewProfile };
    const fn = views[r.name] || viewHome;
    view.innerHTML = fn(r);
    document.body.classList.toggle('no-tabbar', r.name === 'item' || r.name === 'agregar');
    document.querySelectorAll('.tabbar a').forEach(a => {
      if (a.dataset.tab === (views[r.name] ? r.name : 'inicio')) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (key !== lastRoute) { window.scrollTo(0, 0); lastRoute = key; }
    const titles = { inicio: 'Estante', biblioteca: 'Biblioteca · Estante', item: (find(r.arg) || {}).title || 'Estante', agregar: 'Agregar · Estante', anio: 'Tu año · Estante', perfil: 'Perfil · Estante' };
    document.title = titles[r.name] || 'Estante';
    if (r.name === 'agregar') afterAddRender();
    if (r.name === 'item') autosize($('#note'));
  }

  // ---------- Inicio ----------
  function viewHome() {
    const items = live();
    const date = cap(new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()));
    const head = `<header class="page-head">
      <div><p class="eyebrow">${esc(date)}</p><h1 class="page-title">${state.name ? 'Hola, ' + esc(cap(state.name)) : 'Hola'}</h1></div>
      <a class="avatar" href="#/perfil" aria-label="Perfil">${state.name ? esc(state.name[0].toUpperCase()) : logoMini()}</a>
    </header>`;

    if (!items.length) {
      return head + `<section class="empty-hero">
        ${logo(44)}
        <h2>Tu estante está vacío</h2>
        <p>Anotá lo que leés, mirás y escuchás: lo que ya terminaste, lo que estás empezando y lo que tenés pendiente.</p>
        <a class="btn btn-dark" href="#/agregar">${icon('plus', 18)}Agregar lo primero</a>
      </section>
      <section class="section">
        <h2 class="label">Qué podés guardar</h2>
        <div class="stats">${TYPE_IDS.map(t => `<a class="stat t-${t}" href="#/agregar?tipo=${t}"><span class="dot"></span><span style="font-weight:700;font-size:14px;color:var(--ink)">${cap(TYPES[t].stat)}</span><span>Agregar</span></a>`).join('')}</div>
      </section>`;
    }

    const y = thisYear();
    const done = items.filter(i => i.status === 'terminado' && (i.finishedAt || '').startsWith(String(y)));
    const now = items.filter(i => i.status === 'encurso').sort((a, b) => b.updatedAt - a.updatedAt);
    const next = items.filter(i => i.status === 'pendiente').sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || '') || b.updatedAt - a.updatedAt);

    return head + `
    <section class="section" aria-label="Tu ${y} hasta ahora">
      <div class="section-head"><h2 class="label">Tu ${y} hasta ahora</h2><a class="link" href="#/anio">Ver resumen</a></div>
      <div class="stats">${TYPE_IDS.map(t => `<a class="stat t-${t}" href="#/biblioteca?tipo=${t}&estado=terminado"><span class="dot"></span><b>${done.filter(i => i.type === t).length}</b><span>${TYPES[t].stat}</span></a>`).join('')}</div>
    </section>
    <section class="section" aria-label="En curso">
      <div class="section-head"><h2 class="section-title">En curso</h2>${now.length > 1 ? `<span class="muted small">${now.length}</span>` : ''}</div>
      ${now.length ? `<div class="hscroll">${now.map(it => nowCard(it, now.length === 1)).join('')}</div>`
        : `<p class="empty">Nada en curso. ${next.length ? 'Elegí algo de tu lista y marcalo como empezado.' : '<a class="link" href="#/agregar">Agregá lo que estás leyendo o mirando</a>.'}</p>`}
    </section>
    <section class="section" aria-label="Próximo en tu lista">
      <div class="section-head"><h2 class="section-title">Próximo en tu lista</h2>${next.length > 4 ? `<a class="link" href="#/biblioteca?estado=pendiente&tipo=todo">Ver ${next.length}</a>` : ''}</div>
      ${next.length ? `<div class="list">${next.slice(0, 4).map(rowLink).join('')}</div>` : '<p class="empty">No tenés pendientes. Cuando alguien te recomiende algo, guardalo acá.</p>'}
    </section>`;
  }

  function nowCard(it, only) {
    const p = progressInfo(it);
    return `<a class="now-card t-${it.type}${only ? ' only' : ''}" href="#/item/${esc(it.id)}">
      ${cover(it, 's')}
      <div class="now-body">
        ${tchip(it.type, it.sub && it.type === 'pod' ? it.sub : '')}
        <h3>${esc(it.title)}</h3>
        <p>${esc(it.creator)}</p>
        <div class="now-foot">
          <div class="bar"><span style="width:${p.pct}%"></span></div>
          <div class="bar-meta"><span>${esc(p.label)}</span><span>${p.right}</span></div>
        </div>
      </div>
    </a>`;
  }

  function rowLink(it) {
    return `<a class="row-link t-${it.type}" href="#/item/${esc(it.id)}">
      ${cover(it, 'xs')}
      <div class="row-text"><strong>${esc(it.title)}</strong><span><span class="tl">${TYPES[it.type].label}</span>${[it.creator, fmtLength(it)].filter(Boolean).map(s => ' · ' + esc(s)).join('')}</span></div>
      ${icon('chevron', 18, ' style="color:var(--muted)"')}
    </a>`;
  }

  // ---------- Biblioteca ----------
  function viewLibrary(r) {
    const lib = state.lib;
    if (r.params.has('tipo') || r.params.has('estado')) {
      if (['todo', ...TYPE_IDS].includes(r.params.get('tipo'))) lib.type = r.params.get('tipo');
      if (STATUSES.includes(r.params.get('estado'))) lib.status = r.params.get('estado');
      lib.auto = false;
      keepDepth('#/biblioteca');
    }
    const q = norm(lib.q);
    const byType = live().filter(i => (lib.type === 'todo' || i.type === lib.type)
      && (!q || norm([i.title, i.creator, ...(i.tags || [])].join(' ')).includes(q)));
    const sorters = {
      terminado: (a, b) => (b.finishedAt || '').localeCompare(a.finishedAt || '') || b.updatedAt - a.updatedAt,
      encurso: (a, b) => b.updatedAt - a.updatedAt,
      pendiente: (a, b) => (b.addedAt || '').localeCompare(a.addedAt || '') || b.updatedAt - a.updatedAt,
    };
    if (lib.auto) lib.status = STATUSES.slice().reverse().find(s => byType.some(i => i.status === s)) || 'terminado';
    const items = byType.filter(i => i.status === lib.status).sort(sorters[lib.status]);
    const chips = [['todo', 'Todo'], ...TYPE_IDS.map(t => [t, TYPES[t].plural])];
    const labels = { terminado: 'Terminados', encurso: 'En curso', pendiente: 'Pendientes' };
    const total = live().length;

    return `<header class="page-head">
      <h1 class="page-title">Biblioteca</h1>
      <button class="icon-btn" data-action="libSearch" aria-label="${lib.searching ? 'Cerrar búsqueda' : 'Buscar en tu biblioteca'}" aria-expanded="${lib.searching}">${icon(lib.searching ? 'close' : 'search', 20)}</button>
    </header>
    ${lib.searching ? `<label class="searchbox">${icon('search', 20)}<span class="sr-only">Buscar en tu biblioteca</span><input id="libQ" type="search" value="${esc(lib.q)}" placeholder="Título, autor o etiqueta" autocomplete="off" enterkeyhint="search"></label>` : ''}
    <div class="chips" role="group" aria-label="Tipo">${chips.map(([id, label]) => `<button class="chip${id === 'todo' ? '' : ' t-' + id}" data-action="libType" data-v="${id}" aria-pressed="${lib.type === id}"><span class="dot${id === 'todo' ? ' all' : ''}"></span>${label}</button>`).join('')}</div>
    <div class="seg" role="group" aria-label="Estado">${STATUSES.slice().reverse().map(s => `<button data-action="libStatus" data-v="${s}" aria-pressed="${lib.status === s}">${labels[s]}<span class="n">${byType.filter(i => i.status === s).length}</span></button>`).join('')}</div>
    <div id="libGrid">${libGrid(items, total)}</div>`;
  }

  function libGrid(items, total) {
    if (!total) return `<p class="empty">Todavía no agregaste nada. <a class="link" href="#/agregar">Agregar</a></p>`;
    if (!items.length) {
      const msg = state.lib.q ? 'No hay nada que coincida con tu búsqueda.' : { terminado: 'Acá aparece lo que vayas terminando.', encurso: 'No tenés nada en curso con este filtro.', pendiente: 'No hay pendientes con este filtro.' }[state.lib.status];
      return `<p class="empty">${msg}</p>`;
    }
    return `<div class="grid">${items.map(it => `<a class="tile t-${it.type}" href="#/item/${esc(it.id)}">
      ${cover(it, 'm')}
      <span class="tile-title">${esc(it.title)}</span>
      ${it.status === 'terminado' ? (it.rating ? starsText(it.rating) : `<span class="tile-meta">${esc(fmtDate(it.finishedAt) || it.creator)}</span>`)
        : it.status === 'encurso' ? (() => { const p = progressInfo(it); return `<span class="mini"><span class="bar"><span style="width:${p.pct}%"></span></span>${p.pct}%</span>`; })()
        : `<span class="tile-meta">${esc(fmtLength(it) || it.creator)}</span>`}
    </a>`).join('')}</div>`;
  }

  // ---------- Ficha ----------
  function viewItem(r) {
    const it = find(r.arg);
    if (!it) return `<header class="page-head"><a class="icon-btn" href="#/biblioteca" aria-label="Volver">${icon('back', 22)}</a></header>
      <p class="empty">No encontramos esto en tu estante. Puede que lo hayas quitado.</p>`;
    const T = TYPES[it.type];
    const p = progressInfo(it);
    let stateBlock = '';
    if (it.status === 'terminado') {
      const days = daysBetween(it.startedAt, it.finishedAt);
      stateBlock = `<div class="rate-row">
          <div class="stars" role="group" aria-label="Tu puntuación">${[1, 2, 3, 4, 5].map(n => `<button class="${n <= it.rating ? 'on' : ''}" data-action="rate" data-v="${n}" aria-label="${n} ${n === 1 ? 'estrella' : 'estrellas'}" aria-pressed="${n === it.rating}">${STAR}</button>`).join('')}</div>
          <span class="rate-word">${RATING_WORDS[it.rating || 0]}</span>
        </div>
        <div class="dates">
          <label><span>Empezado</span><input type="date" id="startedAt" value="${esc(it.startedAt)}" max="${today()}"></label>
          <label><span>Terminado</span><input type="date" id="finishedAt" value="${esc(it.finishedAt)}" max="${today()}"></label>
          <div><span>Duración</span><strong>${days ? days + (days === 1 ? ' día' : ' días') : '—'}</strong></div>
        </div>`;
    } else if (it.status === 'encurso') {
      stateBlock = `<div class="card progress-card">
        ${it.type === 'libro'
          ? `<div class="page-line"><label for="page">Voy por la página</label><input class="num" id="page" type="number" inputmode="numeric" min="0" max="${it.length || 100000}" value="${it.progress || ''}" placeholder="0"><label for="pages">de</label><input class="num" id="pages" type="number" inputmode="numeric" min="0" value="${it.length || ''}" placeholder="?"></div>`
          : `<label class="page-line" for="pct"><span id="pctLabel">${esc(p.label)}</span></label><input id="pct" type="range" min="0" max="100" step="5" value="${it.progress || 0}" aria-label="Porcentaje visto">`}
        <div class="bar"><span id="pctBar" style="width:${p.pct}%"></span></div>
        <div class="btn-row"><button class="btn btn-dark" data-action="status" data-v="terminado">${icon('check', 18)}Lo terminé</button></div>
      </div>`;
    } else {
      stateBlock = `<div class="card" style="display:flex;align-items:center;gap:12px">
        <span style="color:var(--dark)">${icon('clock', 22)}</span>
        <div class="row-text" style="gap:2px"><strong style="white-space:normal">${it.addedAt ? 'En tu lista desde el ' + esc(fmtDate(it.addedAt)) : 'En tu lista'}</strong>${it.length ? `<span>${it.type === 'libro' ? `${it.length} páginas` : esc(fmtMin(it.length))}</span>` : ''}</div>
        <button class="btn btn-dark" data-action="status" data-v="encurso" style="margin-left:auto">${icon('play', 16)}Empezar</button>
      </div>`;
    }

    return `<div class="hero t-${it.type}">
      <div class="hero-top">
        <a class="icon-btn" href="#/biblioteca" data-action="back" aria-label="Volver">${icon('back', 22)}</a>
      </div>
      ${cover(it, 'l')}
    </div>
    <div class="t-${it.type}" style="display:flex;flex-direction:column;gap:16px">
      <div class="item-head">
        ${tchip(it.type, it.sub && it.type === 'pod' ? `${T.label} · ${it.sub}` : '')}
        <h1>${esc(it.title)}</h1>
        ${metaLine(it) ? `<p>${esc(metaLine(it))}</p>` : ''}
      </div>
      <div class="seg dark" role="group" aria-label="Estado">${STATUSES.map(s => `<button data-action="status" data-v="${s}" aria-pressed="${it.status === s}">${statusLabel(it.type, s)}</button>`).join('')}</div>
      ${stateBlock}
      <section class="card" aria-labelledby="noteLabel">
        <div class="box-head"><h2 class="label" id="noteLabel">Mi nota</h2><span class="muted small" id="noteSaved"></span></div>
        <textarea id="note" class="note" rows="3" maxlength="4000" placeholder="¿Qué te pareció? ¿Quién te lo recomendó?" aria-labelledby="noteLabel">${esc(it.note)}</textarea>
        <div class="tags" style="margin-top:10px">
          ${(it.tags || []).map((t, i) => `<button class="tag" data-action="untag" data-v="${i}" aria-label="Quitar etiqueta ${esc(t)}">${esc(t)}${icon('close', 16)}</button>`).join('')}
          <input class="tag-input" id="tagInput" maxlength="30" placeholder="+ Etiqueta" aria-label="Agregar etiqueta" enterkeyhint="done" autocomplete="off">
        </div>
      </section>
      <button class="btn btn-danger" data-action="delete">${icon('trash', 18)}Quitar del estante</button>
    </div>`;
  }

  function autosize(el) { if (!el) return; el.style.height = 'auto'; el.style.height = Math.max(84, el.scrollHeight) + 'px'; }

  // ---------- Agregar ----------
  const searchCache = new Map();
  function viewAdd(r) {
    const a = state.add;
    if (TYPE_IDS.includes(r.params.get('tipo'))) { a.type = r.params.get('tipo'); keepDepth('#/agregar'); }
    const canScan = a.type === 'libro' && 'BarcodeDetector' in window && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
    return `<header class="page-head">
      <h1 class="page-title">Agregar</h1>
      <a class="icon-btn" href="#/" data-action="back" aria-label="Cerrar">${icon('close', 20)}</a>
    </header>
    <div class="types" role="group" aria-label="Qué querés agregar">
      ${TYPE_IDS.map(t => `<button class="type-tile t-${t}" data-action="addType" data-v="${t}" aria-pressed="${a.type === t}">${icon(t, 24)}${TYPES[t].label}</button>`).join('')}
    </div>
    <div class="search-row">
      <label class="searchbox">${icon('search', 20)}<span class="sr-only">Buscar</span>
        <input id="q" type="search" value="${esc(a.q)}" placeholder="${TYPES[a.type].ph}" autocomplete="off" autocorrect="off" enterkeyhint="search"></label>
      ${canScan ? `<button class="scan-btn" data-action="scan" aria-label="Escanear el código de barras (ISBN)">${icon('scan', 22)}</button>` : ''}
    </div>
    <section class="results t-${a.type}" id="results" aria-live="polite"></section>
    <button class="btn btn-ghost" data-action="manual" style="align-self:center;text-decoration:underline">¿No aparece? Cargalo a mano</button>`;
  }

  function afterAddRender() {
    renderResults();
    const q = $('#q');
    if (q && !state.add.q && matchMedia('(hover: hover)').matches) q.focus();
  }

  function existing(r, type) {
    return live().find(i => i.type === type && ((r.ref && i.ref === r.ref) || (norm(i.title) === norm(r.title) && norm(i.creator) === norm(r.creator))));
  }

  function renderResults() {
    const box = $('#results');
    if (!box) return;
    const a = state.add;
    const q = a.q.trim();
    if (q.length < 2) {
      box.innerHTML = `<p class="hint">Buscá por ${a.type === 'libro' ? 'título, autor o ISBN' : a.type === 'pod' ? 'nombre del podcast o del episodio' : 'título o director'}. La portada y los datos se completan solos.</p>`;
      return;
    }
    if (a.loading) { box.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>'; return; }
    if (a.error) { box.innerHTML = `<p class="empty">${esc(a.error)}</p>`; return; }
    if (!a.results.length) { box.innerHTML = `<p class="empty">No encontramos nada con “${esc(q)}”. Probá con otras palabras o cargalo a mano.</p>`; return; }
    box.innerHTML = `<h2 class="label">Resultados</h2>` + a.results.map((r, i) => {
      const it = { ...r, type: a.type, id: r.ref || r.title };
      const have = existing(r, a.type);
      return `<div class="result">
        ${cover(it, 'r')}
        <div class="result-body">
          <strong>${esc(r.title)}</strong>
          <span>${esc([r.sub, r.creator, r.year, fmtLength(it)].filter(Boolean).join(' · '))}</span>
          ${have ? `<a class="in-lib" href="#/item/${esc(have.id)}">${icon('check', 14, ' style="stroke-width:2.4"')}${statusLabel(have.type, have.status)} · Ver</a>`
            : `<div class="actions">${STATUSES.map(s => `<button class="btn${s === 'terminado' ? ' btn-dark' : ''}" data-action="addResult" data-i="${i}" data-v="${s}">${statusLabel(a.type, s)}</button>`).join('')}</div>`}
        </div>
      </div>`;
    }).join('');
  }

  async function runSearch() {
    const a = state.add;
    const q = a.q.trim();
    const seq = ++a.seq;
    a.error = '';
    if (q.length < 2) { a.results = []; a.loading = false; renderResults(); return; }
    const key = a.type + '|' + q.toLowerCase();
    if (searchCache.has(key)) { a.results = searchCache.get(key); a.loading = false; renderResults(); return; }
    a.loading = true; renderResults();
    try {
      const res = await fetch('/api/estante?' + new URLSearchParams({ q, tipo: a.type }));
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'No pudimos buscar ahora. Probá de nuevo o cargalo a mano.');
      if (seq !== a.seq) return;
      a.results = Array.isArray(j.results) ? j.results : [];
      searchCache.set(key, a.results);
    } catch (e) {
      if (seq !== a.seq) return;
      a.results = [];
      a.error = navigator.onLine === false ? 'Estás sin conexión. Podés cargarlo a mano.' : (e instanceof SyntaxError || e instanceof TypeError ? 'No pudimos buscar ahora. Probá de nuevo o cargalo a mano.' : e.message);
    }
    a.loading = false;
    renderResults();
  }
  const searchSoon = debounce(runSearch, 350);

  function addItem(data, status) {
    const it = {
      id: newId(), type: data.type, status: 'pendiente', title: String(data.title || '').trim().slice(0, 200), creator: String(data.creator || '').trim().slice(0, 160),
      sub: data.sub || '', year: /^\d{4}$/.test(String(data.year || '')) ? String(data.year) : '', length: Math.max(0, Math.round(Number(data.length) || 0)),
      cover: /^https:\/\//.test(data.cover || '') ? data.cover : '', ref: data.ref || '', rating: 0, note: '', tags: [], progress: 0,
      addedAt: today(), startedAt: '', finishedAt: '', updatedAt: Date.now(),
    };
    setStatus(it, status);
    save(it, { quiet: true });
    const msgs = { pendiente: 'Agregado a pendientes', encurso: `Agregado a ${statusLabel(it.type, 'encurso').toLowerCase()}`, terminado: '¡Terminado! ¿Cómo estuvo?' };
    toast(msgs[status], { label: status === 'terminado' ? 'Puntuar' : 'Ver', run: () => go('#/item/' + it.id) });
    return it;
  }

  // ---------- Escáner de ISBN (Android/Chrome) ----------
  let scanStream = null, scanTimer = null;
  async function openScanner() {
    const dlg = $('#scanDialog');
    $('#scanMsg').textContent = 'Apuntá la cámara al código de barras del libro.';
    dlg.showModal();
    try {
      const detector = new window.BarcodeDetector({ formats: ['ean_13'] });
      scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      const video = $('#scanVideo');
      video.srcObject = scanStream;
      await video.play();
      const tick = async () => {
        if (!dlg.open) return;
        try {
          const codes = await detector.detect(video);
          const isbn = codes.map(c => c.rawValue).find(v => /^97[89]\d{10}$/.test(v));
          if (isbn) { closeScanner(); state.add.q = isbn; const q = $('#q'); if (q) q.value = isbn; runSearch(); return; }
        } catch {}
        scanTimer = setTimeout(tick, 250);
      };
      tick();
    } catch {
      $('#scanMsg').textContent = 'No pudimos usar la cámara. Escribí el ISBN en el buscador.';
    }
  }
  function closeScanner() {
    clearTimeout(scanTimer);
    if (scanStream) scanStream.getTracks().forEach(t => t.stop());
    scanStream = null;
    const dlg = $('#scanDialog');
    if (dlg.open) dlg.close();
  }

  // ---------- Tu año ----------
  function viewYear() {
    const finished = live().filter(i => i.status === 'terminado' && i.finishedAt);
    const years = [...new Set([thisYear(), ...finished.map(i => Number(i.finishedAt.slice(0, 4)))])].sort();
    if (!years.includes(state.year)) state.year = thisYear();
    const y = state.year;
    const idx = years.indexOf(y);
    const done = finished.filter(i => i.finishedAt.startsWith(String(y)));
    const counts = Object.fromEntries(TYPE_IDS.map(t => [t, done.filter(i => i.type === t).length]));
    const total = done.length;
    const months = Array.from({ length: 12 }, (_, m) => {
      const list = done.filter(i => Number(i.finishedAt.slice(5, 7)) === m + 1);
      return { m, n: list.length, by: TYPE_IDS.map(t => [t, list.filter(i => i.type === t).length]) };
    });
    const max = Math.max(1, ...months.map(m => m.n));
    const best = months.reduce((a, b) => (b.n > a.n ? b : a), months[0]);
    const curMonth = y === thisYear() ? new Date().getMonth() : -1;
    const sumLen = types => done.filter(i => types.includes(i.type)).reduce((s, i) => s + (i.length || 0), 0);
    const pages = sumLen(['libro']), screen = sumLen(['peli', 'doc']), audio = sumLen(['pod']);
    const top = done.filter(i => i.rating).sort((a, b) => b.rating - a.rating || b.finishedAt.localeCompare(a.finishedAt)).slice(0, 6);
    const dateRange = y === thisYear() ? `Del 1 de enero al ${new Date().getDate()} de ${MONTHS[new Date().getMonth()]}` : `Todo ${y}`;

    return `<header class="page-head">
      <div><h1 class="page-title" style="font-size:34px">Tu ${y}</h1><p class="eyebrow">${dateRange}</p></div>
      ${years.length > 1 ? `<div class="year-nav">
        <button class="icon-btn" data-action="year" data-v="${years[idx - 1] || ''}" aria-label="Año anterior" ${idx <= 0 ? 'disabled style="opacity:.35"' : ''}>${icon('left', 20)}</button>
        <button class="icon-btn" data-action="year" data-v="${years[idx + 1] || ''}" aria-label="Año siguiente" ${idx >= years.length - 1 ? 'disabled style="opacity:.35"' : ''}>${icon('right', 20)}</button>
      </div>` : ''}
    </header>
    <section class="year-card" aria-label="Total del año">
      <div class="big"><b>${total}</b><span>${total === 1 ? 'título terminado' : 'títulos terminados'}</span></div>
      <div class="share" role="img" aria-label="${TYPE_IDS.map(t => `${counts[t]} ${TYPES[t].stat}`).join(', ')}">
        ${total ? TYPE_IDS.filter(t => counts[t]).map(t => `<span style="flex:${counts[t]};background:${ACCENT[t]}"></span>`).join('') : '<span style="flex:1;background:#2A2E36"></span>'}
      </div>
      <div class="legend">${TYPE_IDS.map(t => `<div><b>${counts[t]}</b><span><span class="dot" style="background:${ACCENT[t]}"></span>${TYPES[t].stat}</span></div>`).join('')}</div>
    </section>
    ${total ? `<section class="card section" aria-label="Por mes">
      <div class="section-head"><h2 class="section-title" style="font-size:18px">Por mes</h2><span class="muted small">${best.n ? `Tu mejor mes: ${MONTHS[best.m]}` : ''}</span></div>
      <div class="chart" role="img" aria-label="Títulos terminados por mes">
        ${months.map(mo => `<div class="col"><div class="stack">${mo.by.filter(([, n]) => n).map(([t, n]) => `<span style="height:${Math.max(4, Math.round(n / max * 104))}px;background:${ACCENT[t]}"></span>`).join('')}</div><span class="m${mo.m === curMonth ? ' cur' : ''}">${MONTHS[mo.m][0].toUpperCase()}</span></div>`).join('')}
      </div>
    </section>
    ${pages || screen || audio ? `<div class="totals">
      ${pages ? `<div><b>${pages.toLocaleString('es-AR')}</b><span>páginas leídas</span></div>` : ''}
      ${screen ? `<div><b>${Math.round(screen / 60)} h</b><span>de pelis y docs</span></div>` : ''}
      ${audio ? `<div><b>${Math.round(audio / 60)} h</b><span>de podcasts</span></div>` : ''}
    </div>` : ''}
    <section class="section" aria-label="Lo mejor del año">
      <h2 class="section-title" style="font-size:18px">Lo mejor del año</h2>
      ${top.length ? `<div class="best">${top.map(it => `<a class="tile t-${it.type}" href="#/item/${esc(it.id)}">${cover(it, 'm')}<span class="tile-title">${esc(it.title)}</span>${starsText(it.rating)}</a>`).join('')}</div>`
        : '<p class="empty">Puntuá lo que terminás y acá aparecen tus favoritos.</p>'}
    </section>`
    : `<p class="empty">${y === thisYear() ? 'Cuando termines algo este año, acá vas a ver tu resumen: cuánto leíste, viste y escuchaste, mes a mes.' : 'No hay nada terminado en ese año.'}</p>`}`;
  }

  // ---------- Perfil ----------
  const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function syncText() {
    const labels = { idle: 'Sin sincronizar todavía', saving: 'Guardando…', ok: 'Todo guardado en tu cuenta', offline: 'Sin conexión: se guarda cuando vuelva', error: 'No se pudo guardar. Reintentamos solo.' };
    return labels[state.sync] || labels.idle;
  }

  function viewProfile() {
    const items = live();
    const account = state.token
      ? `<section class="card section">
          <div class="profile-head"><span class="avatar" aria-hidden="true">${esc(state.name[0].toUpperCase())}</span>
            <div class="row-text"><strong>${esc(state.name)}</strong><span id="syncStatus" class="sync ${state.sync}">${syncText()}</span></div></div>
          <p class="muted small">Tu estante se guarda en tu cuenta: entrá con el mismo usuario desde otro teléfono o la compu y vas a ver lo mismo.</p>
          <div class="btn-row"><button class="btn" data-action="syncNow">Sincronizar ahora</button><button class="btn btn-ghost" data-action="logout">Salir</button></div>
        </section>`
      : `<section class="card section">
          <h2 class="section-title">Guardalo en tu cuenta</h2>
          <p class="muted small">Ahora todo se guarda solo en este teléfono. Con una cuenta lo tenés también en otros dispositivos y no lo perdés si cambiás de celular. Es la misma cuenta de los otros proyectos del Lab.</p>
          <form class="form" id="loginForm">
            <label class="field"><span>Usuario</span><input id="username" name="username" autocomplete="username" autocapitalize="none" autocorrect="off" required minlength="3" maxlength="20"></label>
            <label class="field"><span>Contraseña</span><input id="password" name="password" type="password" autocomplete="current-password" required minlength="6" maxlength="100"></label>
            ${state.authError ? `<p class="error" role="alert">${esc(state.authError)}</p>` : ''}
            <div class="btn-row"><button class="btn btn-dark" type="submit" value="login">Entrar</button><button class="btn" type="submit" value="register">Crear cuenta</button></div>
          </form>
        </section>`;
    const install = isStandalone() ? '' : `<section class="card section">
        <div class="profile-head"><span style="color:var(--ink)">${icon('phone', 26)}</span><h2 class="section-title" style="font-size:18px">Tenela como app</h2></div>
        ${state.installPrompt ? `<p class="muted small">Instalala y abrila desde la pantalla de inicio, a pantalla completa.</p><button class="btn btn-dark" data-action="install">Instalar Estante</button>`
          : isIOS() ? `<p class="muted small">En el iPhone, abrila en Safari, tocá <b>Compartir</b> (el cuadrado con la flecha) y después <b>Agregar a inicio</b>.</p>`
          : `<p class="muted small">Desde el menú del navegador, elegí <b>Instalar app</b> o <b>Agregar a la pantalla principal</b>.</p>`}
      </section>`;
    return `<header class="page-head"><h1 class="page-title">Perfil</h1></header>
      ${account}
      ${install}
      <section class="card section">
        <h2 class="section-title" style="font-size:18px">Tus datos</h2>
        <p class="muted small">${items.length} ${items.length === 1 ? 'título' : 'títulos'} en tu estante. Podés bajar una copia o traer una que hayas guardado.</p>
        <div class="btn-row">
          <button class="btn" data-action="export" ${items.length ? '' : 'disabled'}>${icon('download', 18)}Bajar copia</button>
          <label class="btn">${icon('upload', 18)}Importar<input type="file" id="importFile" accept="application/json,.json" class="sr-only"></label>
        </div>
      </section>
      <p class="muted small center">Estante · portadas y datos de Google Books, Open Library y Apple.</p>`;
  }

  // ---------- Cuenta y sincronización ----------
  async function api(path, data) {
    const res = await fetch('/api/' + path, {
      method: data ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', ...(state.token ? { Authorization: 'Bearer ' + state.token } : {}) },
      body: data ? JSON.stringify(data) : undefined,
    });
    const j = await res.json().catch(() => ({}));
    if (res.status === 401 && state.token && path !== 'auth') { signOut(); toast('Tu sesión expiró. Volvé a entrar.'); }
    if (!res.ok) { const e = new Error(j.error || 'No se pudo conectar con el servidor.'); e.status = res.status; throw e; }
    return j;
  }

  function merge(a, b) {
    const map = new Map();
    for (const x of [...a, ...b]) {
      if (!x || !x.id) continue;
      const cur = map.get(x.id);
      if (!cur || (x.updatedAt || 0) > (cur.updatedAt || 0)) map.set(x.id, x);
    }
    return [...map.values()];
  }

  function setSync(s) {
    state.sync = s;
    const el = $('#syncStatus');
    if (el) { el.className = 'sync ' + s; el.textContent = syncText(); }
  }

  let syncTimer = null, syncing = false, syncAgain = false;
  function queueSync(delay = 1200) {
    if (!state.token) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(sync, delay);
  }
  async function sync() {
    if (!state.token) return;
    if (syncing) { syncAgain = true; return; }
    syncing = true;
    setSync('saving');
    try {
      const remote = await api('estante');
      const before = JSON.stringify(state.items);
      const merged = merge(state.items, remote.items || []);
      const changedHere = JSON.stringify(merged) !== before;
      state.items = merged;
      persist();
      const remoteIds = new Map((remote.items || []).map(x => [x.id, x.updatedAt || 0]));
      const serverBehind = merged.length !== remoteIds.size || merged.some(x => remoteIds.get(x.id) !== (x.updatedAt || 0));
      if (serverBehind) await api('estante', { items: state.items });
      state.lastSync = Date.now();
      store.set('estante:lastSync', state.lastSync);
      setSync('ok');
      const active = document.activeElement;
      if (changedHere && !(active && /INPUT|TEXTAREA|SELECT/.test(active.tagName))) render();
    } catch (e) {
      if (state.token) setSync(e.status ? 'error' : 'offline');
      if (state.token && e.status !== 401) queueSync(15000);
    } finally {
      syncing = false;
      if (syncAgain) { syncAgain = false; queueSync(300); }
    }
  }

  async function signIn(action, username, password) {
    state.authError = '';
    try {
      const r = await api('auth', { action, username, password });
      state.token = r.token; state.name = r.user.name;
      store.set('estante:token', state.token); store.set('estante:name', state.name);
      render();
      await sync();
      toast(action === 'register' ? 'Cuenta creada. Tu estante ya se guarda ahí.' : `Hola, ${cap(state.name)}. Tu estante está sincronizado.`);
    } catch (e) {
      state.authError = e.status === 404 || e instanceof TypeError ? 'Las cuentas no están disponibles en este sitio.' : e.message;
      render();
    }
  }

  function signOut() {
    if (state.token) fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + state.token }, body: JSON.stringify({ action: 'logout' }) }).catch(() => {});
    state.token = state.name = null;
    state.sync = 'idle';
    store.del('estante:token'); store.del('estante:name');
    render();
  }

  // ---------- Copias ----------
  function exportData() {
    const data = { app: 'estante', version: 1, exported: new Date().toISOString(), items: live() };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `estante-${today()}.json` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importData(file) {
    try {
      const data = JSON.parse(await file.text());
      const list = Array.isArray(data) ? data : data.items;
      if (!Array.isArray(list)) throw new Error();
      const now = Date.now();
      const valid = list.filter(x => x && TYPES[x.type] && STATUSES.includes(x.status) && x.title).map(x => ({
        rating: 0, note: '', tags: [], progress: 0, creator: '', sub: '', year: '', length: 0, cover: '', ref: '', addedAt: '', startedAt: '', finishedAt: '',
        ...x, id: /^[a-z0-9_-]{4,48}$/i.test(x.id || '') ? x.id : newId(), updatedAt: Math.max(x.updatedAt || 0, now), deleted: undefined,
      }));
      state.items = merge(state.items, valid);
      persist(); queueSync(300); render();
      toast(`Importamos ${valid.length} ${valid.length === 1 ? 'título' : 'títulos'}.`);
    } catch { toast('Ese archivo no es una copia de Estante.'); }
  }

  // ---------- Eventos ----------
  const actions = {
    libType: el => { state.lib.type = el.dataset.v; render(); },
    libStatus: el => { state.lib.status = el.dataset.v; state.lib.auto = false; render(); },
    libSearch: () => {
      state.lib.searching = !state.lib.searching;
      if (!state.lib.searching) state.lib.q = '';
      render();
      if (state.lib.searching) $('#libQ')?.focus();
    },
    addType: el => {
      if (state.add.type === el.dataset.v) return;
      state.add.type = el.dataset.v;
      state.add.results = []; state.add.error = '';
      render();
      if (state.add.q.trim().length >= 2) runSearch();
    },
    addResult: el => {
      const r = state.add.results[Number(el.dataset.i)];
      if (!r) return;
      addItem({ ...r, type: state.add.type }, el.dataset.v);
      renderResults();
    },
    manual: () => openManual(),
    scan: () => openScanner(),
    back: (el, ev) => { if (depth > 1) { ev.preventDefault(); history.back(); } },
    status: el => { const it = currentItem(); if (it) { setStatus(it, el.dataset.v); save(it); } },
    rate: el => {
      const it = currentItem(); if (!it) return;
      const n = Number(el.dataset.v);
      it.rating = it.rating === n ? 0 : n;
      save(it);
    },
    untag: el => { const it = currentItem(); if (!it) return; it.tags.splice(Number(el.dataset.v), 1); save(it); },
    delete: () => {
      const it = currentItem(); if (!it) return;
      if (!confirm(`¿Quitar “${it.title}” de tu estante?`)) return;
      const copy = { ...it };
      const tomb = { id: it.id, deleted: true, updatedAt: Date.now() };
      state.items = state.items.map(x => (x.id === it.id ? tomb : x));
      persist(); queueSync();
      go('#/biblioteca');
      toast('Lo quitamos de tu estante.', { label: 'Deshacer', run: () => { save({ ...copy }); go('#/item/' + copy.id); } });
    },
    year: el => { if (el.dataset.v) { state.year = Number(el.dataset.v); render(); } },
    logout: () => { if (confirm('¿Salir de tu cuenta? Lo que guardaste queda en este teléfono.')) signOut(); },
    syncNow: () => sync(),
    install: async () => {
      const p = state.installPrompt; if (!p) return;
      p.prompt();
      try { await p.userChoice; } catch {}
      state.installPrompt = null; render();
    },
    export: () => exportData(),
  };
  const currentItem = () => { const r = route(); return r.name === 'item' ? find(r.arg) : null; };

  document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-action]');
    if (!el || !actions[el.dataset.action]) return;
    if (el.tagName === 'BUTTON' || el.dataset.action !== 'back') ev.preventDefault();
    actions[el.dataset.action](el, ev);
  });

  const saveNote = debounce(() => {
    const it = currentItem(); const el = $('#note');
    if (!it || !el) return;
    it.note = el.value;
    save(it, { quiet: true });
    const s = $('#noteSaved'); if (s) s.textContent = 'Guardado';
  }, 500);

  document.addEventListener('input', ev => {
    const t = ev.target;
    if (t.id === 'q') { state.add.q = t.value; if (t.value.trim().length < 2) { state.add.seq++; state.add.loading = false; renderResults(); } else searchSoon(); }
    else if (t.id === 'libQ') { state.lib.q = t.value; render(); const i = $('#libQ'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
    else if (t.id === 'note') { autosize(t); const s = $('#noteSaved'); if (s) s.textContent = ''; saveNote(); }
    else if (t.id === 'pct') {
      const it = currentItem(); if (!it) return;
      it.progress = Number(t.value);
      const p = progressInfo(it);
      $('#pctLabel').textContent = p.label; $('#pctBar').style.width = p.pct + '%';
    }
  });

  document.addEventListener('change', ev => {
    const t = ev.target;
    const it = currentItem();
    if (t.id === 'pct' && it) { it.progress = Number(t.value); save(it, { quiet: true }); if (it.progress >= 100) toast('¿Lo terminaste?', { label: 'Sí', run: () => { setStatus(it, 'terminado'); save(it); } }); }
    else if (t.id === 'page' && it) {
      it.progress = Math.max(0, Math.round(Number(t.value) || 0));
      if (it.length && it.progress > it.length) it.progress = it.length;
      save(it);
      if (it.length && it.progress >= it.length) toast('¿Lo terminaste?', { label: 'Sí', run: () => { setStatus(it, 'terminado'); save(it); } });
    }
    else if (t.id === 'pages' && it) { it.length = Math.max(0, Math.round(Number(t.value) || 0)); save(it); }
    else if ((t.id === 'startedAt' || t.id === 'finishedAt') && it) { it[t.id] = t.value; save(it); }
    else if (t.id === 'importFile' && t.files[0]) importData(t.files[0]);
  });

  document.addEventListener('keydown', ev => {
    const t = ev.target;
    if (t.id === 'tagInput' && ev.key === 'Enter') {
      ev.preventDefault();
      const it = currentItem(); const v = t.value.trim().slice(0, 30);
      if (!it || !v) return;
      it.tags = [...new Set([...(it.tags || []), v])].slice(0, 12);
      save(it);
      $('#tagInput')?.focus();
    } else if (t.id === 'q' && ev.key === 'Enter') { ev.preventDefault(); runSearch(); t.blur(); }
  });
  document.addEventListener('focusout', ev => {
    const t = ev.target;
    if (t.id === 'tagInput' && t.value.trim()) {
      const it = currentItem(); if (!it) return;
      it.tags = [...new Set([...(it.tags || []), t.value.trim().slice(0, 30)])].slice(0, 12);
      save(it);
    }
  });

  document.addEventListener('submit', ev => {
    if (ev.target.id === 'loginForm') {
      ev.preventDefault();
      const action = ev.submitter && ev.submitter.value === 'register' ? 'register' : 'login';
      signIn(action, $('#username').value.trim().toLowerCase(), $('#password').value);
    }
  });

  // Carga manual
  function openManual() {
    const dlg = $('#manualDialog'), form = $('#manualForm');
    form.reset();
    form.type.value = state.add.type;
    const q = state.add.q.trim();
    if (q && !/^\d{10,13}$/.test(q.replace(/[-\s]/g, ''))) form.title.value = q;
    updateManualLabels();
    dlg.showModal();
    if (!form.title.value) form.title.focus();
  }
  function updateManualLabels() {
    const form = $('#manualForm'); const T = TYPES[form.type.value];
    $('#manualCreatorLabel').textContent = T.creator;
    $('#manualLengthLabel').textContent = T.lengthLabel;
    form.status.options[1].textContent = T.doing;
  }
  $('#manualForm').type.addEventListener('change', updateManualLabels);
  $('#manualForm').addEventListener('submit', ev => {
    ev.preventDefault();
    const f = ev.target;
    if (!f.title.value.trim()) { f.title.focus(); return; }
    const it = addItem({ type: f.type.value, title: f.title.value, creator: f.creator.value, year: f.year.value, length: f.length.value }, f.status.value);
    $('#manualDialog').close();
    go('#/item/' + it.id);
  });
  document.querySelectorAll('dialog [data-close]').forEach(b => b.addEventListener('click', () => { const d = b.closest('dialog'); if (d.id === 'scanDialog') closeScanner(); else d.close(); }));
  $('#scanDialog').addEventListener('close', closeScanner);
  document.querySelectorAll('dialog.sheet').forEach(d => d.addEventListener('click', ev => { if (ev.target === d) { if (d.id === 'scanDialog') closeScanner(); else d.close(); } }));

  // Logo
  function logo(h) {
    const hs = [0.75, 1, 0.62, 0.86];
    return `<div class="logo" aria-hidden="true">${['libro', 'peli', 'doc', 'pod'].map((t, i) => `<span style="height:${Math.round(h * hs[i])}px;background:${ACCENT[t]}"></span>`).join('')}</div>`;
  }
  function logoMini() {
    return `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="7" width="3" height="11" rx="1" fill="${ACCENT.libro}"/><rect x="8.5" y="4" width="3" height="14" rx="1" fill="${ACCENT.peli}"/><rect x="13" y="9" width="3" height="9" rx="1" fill="${ACCENT.doc}"/><rect x="17.5" y="6" width="3" height="12" rx="1" fill="${ACCENT.pod}"/><rect x="3" y="19" width="18" height="1.6" rx=".8" fill="#fff"/></svg>`;
  }

  // ---------- Arranque ----------
  window.addEventListener('hashchange', () => {
    if (history.state && history.state.d) depth = history.state.d;
    else { depth++; history.replaceState({ d: depth }, ''); }
    render();
  });
  window.addEventListener('beforeinstallprompt', ev => { ev.preventDefault(); state.installPrompt = ev; if (route().name === 'perfil') render(); });
  window.addEventListener('online', () => queueSync(500));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') queueSync(500); });
  window.addEventListener('storage', ev => { if (ev.key === 'estante:items') { state.items = store.get('estante:items', []); render(); } });

  if (history.state && history.state.d) depth = history.state.d; else history.replaceState({ d: 1 }, '');
  render();
  if (state.token) sync();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/estante/sw.js', { scope: '/estante/' }).catch(() => {});

  // Para las pruebas automáticas.
  window.estanteDebug = () => ({ items: live(), token: Boolean(state.token), sync: state.sync, lib: { ...state.lib }, add: { type: state.add.type, q: state.add.q, results: state.add.results.length } });
})();
