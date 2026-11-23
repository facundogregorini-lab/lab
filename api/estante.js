// Estante: registro personal de libros, películas, documentales y podcasts (/estante/).
// GET ?q=texto&tipo=libro|peli|doc|pod → { results }: busca en Google Books + Open Library (libros) o en iTunes
//   (películas, documentales y podcasts). No requiere cuenta.
// GET ?descubrir=categoria → { books }: lista de best sellers de la categoría (IA + Open Library, una vez por mes).
// GET ?recomendaciones=1 → { books }: las últimas recomendaciones de la cuenta · POST { action: 'recomendar' } las genera.
// GET → { items, updated }: la lista de la cuenta (mismas cuentas que /api/auth).
// POST { items } → reemplaza la lista de la cuenta. El cliente fusiona antes de enviar (gana el updatedAt más nuevo).
const { redis, HttpError, requireUser, body, handler } = require('./_lib');

const TYPES = ['libro', 'peli', 'doc', 'pod'];
const STATUSES = ['pendiente', 'encurso', 'terminado'];
const MAX_ITEMS = 3000;
const itemsKey = name => 'estante:items:' + name;

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v, min, max) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min; };
const day = v => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
const httpsUrl = v => { const s = str(v, 600); return /^https:\/\/[^\s"'<>]+$/.test(s) ? s : ''; };

function cleanItem(x) {
  if (!x || typeof x !== 'object') return null;
  const id = str(x.id, 48);
  if (!/^[a-z0-9_-]{4,48}$/i.test(id)) return null;
  const updatedAt = Math.round(num(x.updatedAt, 0, 1e13));
  if (x.deleted) return { id, deleted: true, updatedAt };
  if (!TYPES.includes(x.type) || !STATUSES.includes(x.status)) return null;
  const title = str(x.title, 200);
  if (!title) return null;
  const year = str(String(x.year ?? ''), 4);
  return {
    id, type: x.type, status: x.status, title,
    creator: str(x.creator, 160), sub: str(x.sub, 40),
    year: /^\d{4}$/.test(year) ? year : '',
    length: Math.round(num(x.length, 0, 100000)),
    progress: Math.round(num(x.progress, 0, 100000)),
    cover: httpsUrl(x.cover), ref: str(x.ref, 80),
    rating: Math.round(num(x.rating, 0, 5)),
    note: str(x.note, 4000),
    tags: Array.isArray(x.tags) ? [...new Set(x.tags.map(t => str(t, 30)).filter(Boolean))].slice(0, 12) : [],
    addedAt: day(x.addedAt), startedAt: day(x.startedAt), finishedAt: day(x.finishedAt),
    updatedAt,
  };
}

function cleanItems(items) {
  if (!Array.isArray(items)) throw new HttpError(400, 'Lista inválida.');
  const byId = new Map();
  for (const raw of items.slice(0, MAX_ITEMS)) {
    const item = cleanItem(raw);
    if (item && (!byId.has(item.id) || byId.get(item.id).updatedAt < item.updatedAt)) byId.set(item.id, item);
  }
  return [...byId.values()];
}

// ---------- Búsqueda ----------

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

async function getJSON(url, ms = 7000) {
  const r = await fetch(url, { signal: AbortSignal.timeout(ms), headers: { 'User-Agent': 'Estante/1.0 (https://lab-orpin-five.vercel.app/estante/)', Accept: 'application/json' } });
  if (!r.ok) throw new Error(new URL(url).host + ' ' + r.status);
  return r.json();
}

function dedupe(list, limit) {
  const seen = new Map();
  for (const r of list) {
    if (!r.title) continue;
    const k = norm(r.title) + '|' + norm(r.creator.split(',')[0]);
    const prev = seen.get(k);
    if (!prev) seen.set(k, r);
    else {
      if (!prev.cover && r.cover) prev.cover = r.cover;
      if (!prev.length && r.length) prev.length = r.length;
      if (!prev.year && r.year) prev.year = r.year;
    }
  }
  return [...seen.values()].slice(0, limit);
}

async function searchBooks(q) {
  const isbn = q.replace(/[-\s]/g, '');
  const isIsbn = /^(97[89])?\d{9}[\dX]$/i.test(isbn);
  const key = process.env.GOOGLE_BOOKS_KEY ? '&key=' + encodeURIComponent(process.env.GOOGLE_BOOKS_KEY) : '';
  const [google, openLibrary] = await Promise.allSettled([
    getJSON('https://www.googleapis.com/books/v1/volumes?maxResults=15&printType=books&q=' + encodeURIComponent(isIsbn ? 'isbn:' + isbn : q) + key),
    getJSON('https://openlibrary.org/search.json?limit=12&fields=key,title,author_name,first_publish_year,number_of_pages_median,cover_i&'
      + (isIsbn ? 'isbn=' + isbn : 'q=' + encodeURIComponent(q) + '&lang=es')),
  ]);
  if (google.status === 'rejected') console.error('Estante Google Books:', google.reason?.message);
  if (google.status === 'rejected' && openLibrary.status === 'rejected') {
    console.error('Estante libros:', google.reason?.message, openLibrary.reason?.message);
    throw new HttpError(502, 'No pudimos buscar libros ahora. Probá de nuevo o cargalo a mano.');
  }
  const out = [];
  for (const v of (google.value && google.value.items) || []) {
    const i = v.volumeInfo || {};
    const img = i.imageLinks || {};
    out.push({
      ref: 'gb:' + v.id, title: i.title || '', creator: (i.authors || []).slice(0, 3).join(', '),
      year: String(i.publishedDate || '').slice(0, 4), length: i.pageCount || 0,
      cover: String(img.thumbnail || img.smallThumbnail || '').replace(/^http:/, 'https:').replace('&edge=curl', ''),
    });
  }
  for (const d of (openLibrary.value && openLibrary.value.docs) || []) {
    out.push({
      ref: 'ol:' + String(d.key || '').replace('/works/', ''), title: d.title || '', creator: (d.author_name || []).slice(0, 2).join(', '),
      year: d.first_publish_year ? String(d.first_publish_year) : '', length: d.number_of_pages_median || 0,
      cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : '',
    });
  }
  return dedupe(out, 12);
}

// iTunes Search: primero la tienda argentina; si no trae nada, la de EE. UU.
async function itunes(params) {
  let lastError = null;
  for (const country of ['ar', 'us']) {
    try {
      const j = await getJSON('https://itunes.apple.com/search?' + new URLSearchParams({ ...params, country }));
      if (j.results && j.results.length) return j.results;
    } catch (error) { lastError = error; }
  }
  if (lastError) console.error('Estante iTunes:', lastError.message);
  return [];
}

const bigArt = url => String(url || '').replace(/\/\d+x\d+bb\./, '/600x600bb.');
const minutes = ms => (ms ? Math.round(ms / 60000) : 0);

// Películas y documentales: Wikidata (título en español, director, año, duración) + póster de Wikipedia.
const WIKIDATA = 'https://www.wikidata.org/w/api.php?format=json&';
const FILM_FILTER = 'haswbstatement:P31=Q11424|P31=Q24869|P31=Q93204|P31=Q202866|P31=Q506240|P31=Q226730';

async function pageImages(lang, titles) {
  if (!titles.length) return {};
  try {
    const j = await getJSON(`https://${lang}.wikipedia.org/w/api.php?` + new URLSearchParams({
      action: 'query', format: 'json', prop: 'pageimages', piprop: 'thumbnail', pithumbsize: '500', pilicense: 'any', redirects: '1', titles: titles.join('|'),
    }));
    const alias = {};
    for (const n of (j.query && j.query.normalized) || []) alias[n.to] = n.from;
    for (const r of (j.query && j.query.redirects) || []) alias[r.to] = alias[r.from] || r.from;
    const map = {};
    for (const page of Object.values((j.query && j.query.pages) || {})) {
      const src = page.thumbnail && page.thumbnail.source;
      if (!src) continue;
      map[page.title] = src;
      if (alias[page.title]) map[alias[page.title]] = src;
    }
    return map;
  } catch { return {}; }
}

async function searchWikidataFilms(q, docs) {
  // Por título (en español y en inglés) y por texto con filtro de tipo; primero lo que coincide con el título.
  const byLabel = lang => getJSON(WIKIDATA + new URLSearchParams({ action: 'wbsearchentities', search: q, language: lang, uselang: lang, type: 'item', limit: '50' }));
  const [es, en, text] = await Promise.allSettled([
    byLabel('es'), byLabel('en'),
    getJSON(WIKIDATA + new URLSearchParams({ action: 'query', list: 'search', srsearch: q + ' ' + FILM_FILTER + '|P136=Q93204', srlimit: '20', srprop: '' })),
  ]);
  for (const [name, r] of [['es', es], ['en', en], ['texto', text]]) if (r.status === 'rejected') console.error('Estante Wikidata ' + name + ':', r.reason?.message);
  if ([es, en, text].every(r => r.status === 'rejected')) throw es.reason;
  const FILMY = /pel[ií]cula|film|documental|documentary|movie|largometraje|cortometraje|miniserie|docuserie/i;
  const labelIds = [es, en].flatMap(r => (r.value && r.value.search) || []).filter(r => FILMY.test(r.description || '')).map(r => r.id);
  const textIds = ((text.value && text.value.query && text.value.query.search) || []).map(r => r.title);
  const ids = [...new Set([...labelIds, ...textIds])].filter(t => /^Q\d+$/.test(t)).slice(0, 24);
  if (!ids.length) return [];
  const data = await getJSON(WIKIDATA + new URLSearchParams({ action: 'wbgetentities', ids: ids.join('|'), props: 'labels|claims|sitelinks', languages: 'es|en', sitefilter: 'eswiki|enwiki' }));
  const entities = ids.map(id => data.entities && data.entities[id]).filter(e => e && e.labels);
  const values = (e, p) => ((e.claims && e.claims[p]) || []).map(c => c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value).filter(Boolean);
  const label = e => (e && e.labels && ((e.labels.es && e.labels.es.value) || (e.labels.en && e.labels.en.value))) || '';
  const directorIds = [...new Set(entities.flatMap(e => values(e, 'P57').slice(0, 2).map(v => v.id)))].slice(0, 50);
  const link = (e, wiki) => e.sitelinks && e.sitelinks[wiki] && e.sitelinks[wiki].title;
  const [directors, enImages, esImages] = await Promise.all([
    directorIds.length ? getJSON(WIKIDATA + new URLSearchParams({ action: 'wbgetentities', ids: directorIds.join('|'), props: 'labels', languages: 'es|en' })).catch(() => ({})) : {},
    pageImages('en', entities.map(e => link(e, 'enwiki')).filter(Boolean)),
    pageImages('es', entities.map(e => link(e, 'eswiki')).filter(Boolean)),
  ]);
  const FILM_CLASSES = new Set(['Q11424', 'Q24869', 'Q93204', 'Q202866', 'Q506240', 'Q226730', 'Q24862', 'Q17517379']);
  const isFilm = e => values(e, 'P31').some(v => FILM_CLASSES.has(v.id)) || values(e, 'P136').some(v => v.id === 'Q93204');
  const isDoc = e => [...values(e, 'P31'), ...values(e, 'P136')].some(v => v.id === 'Q93204');
  const films = entities.filter(isFilm);
  const ordered = docs ? [...films.filter(isDoc), ...films.filter(e => !isDoc(e))] : films;
  return ordered.map(e => {
    const years = values(e, 'P577').map(v => String(v.time || '').slice(1, 5)).filter(y => /^\d{4}$/.test(y)).sort();
    const dur = values(e, 'P2047')[0];
    let length = dur ? Number(dur.amount) : 0;
    if (dur && /Q25235$/.test(dur.unit)) length *= 60; // horas
    if (dur && /Q11574$/.test(dur.unit)) length /= 60; // segundos
    const dirs = values(e, 'P57').slice(0, 2).map(v => label(directors.entities && directors.entities[v.id])).filter(Boolean);
    return {
      ref: 'wd:' + e.id, title: label(e), creator: dirs.join(', '), year: years[0] || '',
      length: Number.isFinite(length) ? Math.round(length) : 0,
      cover: enImages[link(e, 'enwiki')] || esImages[link(e, 'eswiki')] || '',
    };
  }).filter(r => r.title);
}

async function searchItunesMovies(q, docsFirst) {
  const results = await itunes({ term: q, media: 'movie', entity: 'movie', limit: '20' });
  const list = results.map(m => ({
    ref: 'it:' + m.trackId, title: m.trackName || '', creator: m.artistName || '',
    year: String(m.releaseDate || '').slice(0, 4), length: minutes(m.trackTimeMillis),
    cover: bigArt(m.artworkUrl100), genre: m.primaryGenreName || '',
  }));
  if (docsFirst) list.sort((a, b) => (b.genre === 'Documentary') - (a.genre === 'Documentary'));
  return list.map(({ genre, ...r }) => r);
}

async function searchMovies(q, docs) {
  const [wiki, apple] = await Promise.allSettled([searchWikidataFilms(q, docs), searchItunesMovies(q, docs)]);
  if (wiki.status === 'rejected') console.error('Estante Wikidata:', wiki.reason?.message);
  if (wiki.status === 'rejected' && apple.status === 'rejected') throw new HttpError(502, 'No pudimos buscar ahora. Probá de nuevo o cargalo a mano.');
  return dedupe([...(wiki.value || []), ...(apple.value || [])], 12);
}

async function searchPodcasts(q) {
  const [shows, episodes] = await Promise.all([
    itunes({ term: q, media: 'podcast', entity: 'podcast', limit: '4' }),
    itunes({ term: q, media: 'podcast', entity: 'podcastEpisode', limit: '10' }),
  ]);
  const list = [
    ...shows.map(p => ({ ref: 'itp:' + p.collectionId, title: p.collectionName || '', creator: p.artistName || '', sub: 'Podcast', year: '', length: 0, cover: bigArt(p.artworkUrl600 || p.artworkUrl100) })),
    ...episodes.map(e => ({ ref: 'ite:' + e.trackId, title: e.trackName || '', creator: e.collectionName || '', sub: 'Episodio', year: String(e.releaseDate || '').slice(0, 4), length: minutes(e.trackTimeMillis), cover: bigArt(e.artworkUrl600 || e.artworkUrl160) })),
  ];
  return dedupe(list, 14);
}

// Resultados fijos para las pruebas locales (ESTANTE_FAKE=1): no sale a internet.
const FAKE = {
  libro: [
    { ref: 'gb:hail', title: 'Proyecto Hail Mary', creator: 'Andy Weir', year: '2021', length: 496, cover: '' },
    { ref: 'gb:marciano', title: 'El marciano', creator: 'Andy Weir', year: '2014', length: 400, cover: '' },
    { ref: 'gb:artemisa', title: 'Artemisa', creator: 'Andy Weir', year: '2017', length: 384, cover: '' },
  ],
  peli: [
    { ref: 'it:1', title: 'Perfect Days', creator: 'Wim Wenders', year: '2023', length: 124, cover: '' },
    { ref: 'it:2', title: 'París, Texas', creator: 'Wim Wenders', year: '1984', length: 145, cover: '' },
  ],
  doc: [{ ref: 'it:3', title: 'Senna', creator: 'Asif Kapadia', year: '2010', length: 106, cover: '' }],
  pod: [
    { ref: 'itp:4', title: 'Acquired', creator: 'Ben Gilbert y David Rosenthal', sub: 'Podcast', year: '', length: 0, cover: '' },
    { ref: 'ite:5', title: 'Costco', creator: 'Acquired', sub: 'Episodio', year: '2023', length: 185, cover: '' },
  ],
};

async function search(q, tipo) {
  if (process.env.ESTANTE_FAKE === '1') return FAKE[tipo].filter(r => norm(r.title + ' ' + r.creator).includes(norm(q)));
  if (tipo === 'libro') return searchBooks(q);
  if (tipo === 'pod') return searchPodcasts(q);
  return searchMovies(q, tipo === 'doc');
}

// ---------- Descubrir: listas por categoría y recomendaciones con IA ----------

const { CATEGORIES, bestSellers, recommend, enabled: iaEnabled } = require('./_estante_ia');
const IA_DAILY_LIMIT = 6;
const argDay = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);

// Busca cada libro en Open Library para sumar portada, páginas y una referencia estable. El título de la IA manda.
async function enrich(book) {
  const base = { ...book, ref: 'ia:' + norm(book.title + ' ' + book.author).replace(/ /g, '-').slice(0, 70), cover: '', length: 0 };
  if (process.env.ESTANTE_FAKE === '1') return base;
  try {
    const j = await getJSON('https://openlibrary.org/search.json?' + new URLSearchParams({
      q: `${book.title} ${book.author}`, limit: '5', lang: 'es', fields: 'key,title,author_name,first_publish_year,number_of_pages_median,cover_i',
    }), 6000);
    const last = norm(book.author).split(' ').pop();
    const doc = (j.docs || []).find(d => !last || (d.author_name || []).some(n => norm(n).includes(last))) || null;
    if (!doc) return base;
    return {
      ...base, ref: 'ol:' + String(doc.key || '').replace('/works/', ''),
      cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : '',
      length: doc.number_of_pages_median || 0, year: book.year || (doc.first_publish_year ? String(doc.first_publish_year) : ''),
    };
  } catch { return base; }
}

async function spendIa(name) {
  const key = 'estante:ia:' + name + ':' + argDay();
  const used = await redis('INCR', key);
  if (used === 1) await redis('EXPIRE', key, 2 * 86400);
  if (used > IA_DAILY_LIMIT) throw new HttpError(429, 'Ya pediste muchas recomendaciones hoy. Probá mañana.');
}

// ---------- Sin IA: Open Library ----------
// Si la IA no está disponible, las listas salen de lo más leído en Open Library (registro de lectura de sus usuarios)
// entre las obras con edición en español, y las recomendaciones, de los temas de los libros mejor puntuados.
const OL_SUBJECTS = {
  desarrollo: ['self-help', 'personal development', 'success'], biografias: ['biography', 'autobiography'],
  ciencia: ['popular science', 'science', 'cosmology', 'evolution'], medicina: ['medicine', 'health', 'nutrition'],
  psicologia: ['psychology'], negocios: ['business', 'economics', 'entrepreneurship'], historia: ['history'],
  filosofia: ['philosophy'], novela: ['fiction'], policiales: ['detective and mystery stories', 'thrillers', 'suspense'],
  fantasia: ['science fiction', 'fantasy'], clasicos: ['classic literature', 'classics'],
};
const GENERIC_SUBJECT = /^(fiction|fiction, general|general|accessible book|protected daisy|in library|lending library|large type books|open library staff picks|reading level|translations|spanish language|english language|literature|nonfiction|non-fiction|juvenile|textbooks|ficción|novela|long now manual for civilization)|nyt:|award|bestseller|readers|collection|book club|staff picks|translations? into|language materials/i;

// Si Open Library devuelve la edición en español, se usa su título (y su tapa).
const spanishEdition = d => ((d.editions && d.editions.docs) || []).find(e => (e.language || []).includes('spa') && e.title);
const olDoc = d => ({
  ref: 'ol:' + String(d.key || '').replace('/works/', ''), title: (spanishEdition(d) || d).title || '', author: (d.author_name || []).slice(0, 2).join(', '),
  year: d.first_publish_year ? String(d.first_publish_year) : '', length: d.number_of_pages_median || 0,
  cover: (() => { const e = spanishEdition(d); const id = (e && e.cover_i) || d.cover_i; return id ? `https://covers.openlibrary.org/b/id/${id}-M.jpg` : ''; })(), why: '',
});

async function olPopular(subjects, { exclude = new Set(), limit = 12, perAuthor = 2 } = {}) {
  const q = '(' + subjects.map(x => `subject:"${x}"`).join(' OR ') + ') language:spa';
  const j = await getJSON('https://openlibrary.org/search.json?' + new URLSearchParams({
    q, sort: 'readinglog', limit: '60', lang: 'es', fields: 'key,title,author_name,first_publish_year,number_of_pages_median,cover_i,editions,editions.title,editions.language,editions.cover_i',
  }), 9000);
  const out = [], byAuthor = new Map();
  for (const d of j.docs || []) {
    const b = olDoc(d);
    const a = norm(b.author.split(',')[0]);
    if (!b.title || !d.cover_i || exclude.has(norm(b.title))) continue;
    if ((byAuthor.get(a) || 0) >= perAuthor) continue;
    byAuthor.set(a, (byAuthor.get(a) || 0) + 1);
    exclude.add(norm(b.title));
    out.push(b);
    if (out.length >= limit) break;
  }
  return out;
}

async function olCategory(cat) {
  if (process.env.ESTANTE_FAKE === '1') return [{ ref: 'ol:x1', title: 'Libro popular', author: 'Autora Ejemplo', year: '2020', length: 200, cover: '', why: '' }];
  return olPopular(OL_SUBJECTS[cat]);
}

async function olRecommendations(read, items) {
  if (process.env.ESTANTE_FAKE === '1') return [{ ref: 'ol:x2', title: 'Recomendado sin IA', author: 'Autor Ejemplo', year: '2019', length: 250, cover: '', why: `Para seguir con lo que te gustó de ${read[0].title}.` }];
  const top = read.filter(b => !b.rating || b.rating >= 3).slice(0, 6);
  const found = await Promise.all(top.map(b => getJSON('https://openlibrary.org/search.json?' + new URLSearchParams({
    q: `${b.title} ${b.creator}`, limit: '1', fields: 'subject',
  }), 6000).then(j => ({ book: b, subjects: ((j.docs && j.docs[0] && j.docs[0].subject) || []) })).catch(() => ({ book: b, subjects: [] }))));
  const score = new Map();
  for (const { book, subjects } of found) {
    for (const sub of subjects.slice(0, 25)) {
      const k = sub.trim().toLowerCase();
      if (k.length > 40 || k.includes(':') || GENERIC_SUBJECT.test(k)) continue;
      const cur = score.get(k) || { n: 0, from: book.title };
      cur.n += 1 + (book.rating || 3) / 5;
      score.set(k, cur);
    }
  }
  const best = [...score.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 4);
  if (!best.length) return [];
  const exclude = new Set(items.map(i => norm(i.title)));
  const lists = [];
  for (const [subject, info] of best) {
    const books = await olPopular([subject], { exclude, limit: 3, perAuthor: 1 }).catch(() => []);
    lists.push(books.map(b => ({ ...b, why: `Para seguir con lo que te gustó de ${info.from}.` })));
  }
  const out = [];
  for (let i = 0; out.length < 8 && lists.some(l => l[i]); i++) for (const l of lists) if (l[i] && out.length < 8) out.push(l[i]);
  return out;
}

async function categoryList(cat, req) {
  const month = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 7);
  const key = `estante:desc:${cat}:${month}`;
  const cached = await redis('GET', key);
  if (cached) return JSON.parse(cached);
  const olKey = `estante:desc-ol2:${cat}`;
  const olCached = await redis('GET', olKey);
  if (olCached) return JSON.parse(olCached);
  const fallback = async () => {
    const books = await olCategory(cat);
    if (!books.length) throw new HttpError(502, 'No pudimos armar la lista ahora. Probá de nuevo en un rato.');
    const data = { category: cat, label: CATEGORIES[cat].label, month, books, source: 'ol' };
    await redis('SET', olKey, JSON.stringify(data), 'EX', String(6 * 3600)); // reintenta con IA cada 6 horas
    return data;
  };
  if (!iaEnabled()) return fallback();
  // Una sola generación por categoría y por mes, aunque entren varios a la vez.
  if (!await redis('SET', key + ':lock', '1', 'NX', 'EX', '90')) return { pending: true };
  try {
    const books = await Promise.all((await bestSellers(cat, req)).map(enrich));
    if (!books.length) throw new Error('lista vacía');
    const data = { category: cat, label: CATEGORIES[cat].label, month, books };
    await redis('SET', key, JSON.stringify(data), 'EX', String(40 * 86400));
    return data;
  } catch (error) {
    await redis('DEL', key + ':lock');
    console.error('Estante lista', cat, error.message);
    try { return await fallback(); } catch (olError) {
      console.error('Estante lista Open Library', cat, olError.message);
      throw new HttpError(502, 'No pudimos armar la lista ahora. Probá de nuevo en un rato.');
    }
  }
}

async function makeRecommendations(name, req) {
  const stored = await redis('GET', itemsKey(name));
  let items = [];
  try { items = (JSON.parse(stored || '{}').items || []).filter(i => i && !i.deleted && i.type === 'libro'); } catch {}
  const read = items.filter(i => i.status === 'terminado')
    .sort((a, b) => (b.rating || 0) - (a.rating || 0) || String(b.finishedAt || '').localeCompare(String(a.finishedAt || '')))
    .slice(0, 50).map(i => ({ title: i.title, creator: i.creator, rating: i.rating || 0 }));
  if (!read.length) throw new HttpError(400, 'Marcá como terminado al menos un libro para que te recomendemos.');
  await spendIa(name);
  const skip = items.filter(i => i.status !== 'terminado').slice(0, 80).map(i => ({ title: i.title, creator: i.creator }));
  const mine = new Set(items.map(i => norm(i.title)));
  let books = null, source = 'ia';
  if (iaEnabled()) {
    try { books = (await Promise.all((await recommend({ read, skip }, req)).filter(b => !mine.has(norm(b.title))).map(enrich))); }
    catch (error) { console.error('Estante recomendaciones', error.message); }
  }
  if (!books || !books.length) {
    source = 'ol';
    try { books = await olRecommendations(read, items); } catch (error) { console.error('Estante recomendaciones Open Library', error.message); books = []; }
    if (!books.length) throw new HttpError(502, 'No pudimos pensar recomendaciones ahora. Probá de nuevo en un rato.');
  }
  const data = { books, basedOn: read.length, date: Date.now(), source };
  await redis('SET', 'estante:recs:' + name, JSON.stringify(data));
  return data;
}

module.exports = handler(async (req, res) => {
  const params = new URL(req.url, 'http://localhost').searchParams;

  if (req.method === 'GET' && params.has('q')) {
    const q = params.get('q').trim().slice(0, 120);
    const tipo = TYPES.includes(params.get('tipo')) ? params.get('tipo') : 'libro';
    if (q.length < 2) return { results: [] };
    const results = (await search(q, tipo)).map(r => ({ ...r, cover: httpsUrl(r.cover) }));
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=86400');
    return { results };
  }

  if (req.method === 'GET' && params.has('descubrir')) {
    const cat = params.get('descubrir');
    if (!CATEGORIES[cat]) throw new HttpError(400, 'Categoría desconocida.');
    const data = await categoryList(cat, req);
    if (!data.pending) res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=3600');
    return data;
  }

  const name = await requireUser(req);
  if (req.method === 'GET' && params.has('recomendaciones')) {
    const stored = await redis('GET', 'estante:recs:' + name);
    return stored ? JSON.parse(stored) : { books: null };
  }
  if (req.method === 'POST') {
    const data = body(req);
    if (data.action === 'recomendar') return makeRecommendations(name, req);
    const items = cleanItems(data.items);
    const updated = Date.now();
    await redis('SET', itemsKey(name), JSON.stringify({ items, updated }));
    return { ok: true, updated, count: items.length };
  }
  if (req.method !== 'GET') throw new HttpError(405, 'Método no permitido.');
  const stored = await redis('GET', itemsKey(name));
  let data = { items: [], updated: 0 };
  try { if (stored) data = JSON.parse(stored); } catch {}
  return { items: Array.isArray(data.items) ? data.items : [], updated: data.updated || 0 };
});
