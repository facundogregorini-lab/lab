// Biblioteca El Regreso: qué libros leyó, está leyendo o quiere leer cada persona.
// Usa las mismas cuentas que /api/auth.
// GET: { marks, readers: [{ name, leido, leyendo, quiero }], byBook: { id: { leido: [...], leyendo: [...], quiero: [...] } } }
// POST { marks: { [bookId]: 'leido' | 'leyendo' | 'quiero' } }: reemplaza las marcas propias.
const { redis, HttpError, requireUser, body, handler } = require('./_lib');

const STATUSES = ['leido', 'leyendo', 'quiero'];
const MAX_BOOKS = 2000, MAX_READERS = 60;
const marksKey = name => 'biblio:marks:' + name;
const READERS_KEY = 'biblio:readers';

function clean(marks) {
  if (!marks || typeof marks !== 'object' || Array.isArray(marks)) throw new HttpError(400, 'Marcas inválidas.');
  const out = {};
  for (const [id, status] of Object.entries(marks).slice(0, MAX_BOOKS)) {
    if (/^[a-z0-9-]{1,48}$/.test(id) && STATUSES.includes(status)) out[id] = status;
  }
  return out;
}

const parse = (json, fallback) => { try { return json ? JSON.parse(json) : fallback; } catch { return fallback; } };

module.exports = handler(async req => {
  const name = await requireUser(req);

  if (req.method === 'POST') {
    const marks = clean(body(req).marks);
    await redis('SET', marksKey(name), JSON.stringify(marks));
    const readers = parse(await redis('GET', READERS_KEY), []);
    if (!readers.includes(name) && readers.length < MAX_READERS) {
      readers.push(name);
      await redis('SET', READERS_KEY, JSON.stringify(readers));
    }
    return { ok: true };
  }
  if (req.method !== 'GET') throw new HttpError(405, 'Método no permitido.');

  const readers = parse(await redis('GET', READERS_KEY), []);
  const all = await Promise.all(readers.map(r => redis('GET', marksKey(r)).then(j => [r, parse(j, {})])));
  const byBook = {};
  const summary = all.map(([reader, marks]) => {
    const count = { name: reader, leido: 0, leyendo: 0, quiero: 0 };
    for (const [id, status] of Object.entries(marks)) {
      if (!STATUSES.includes(status)) continue;
      count[status]++;
      ((byBook[id] ??= {})[status] ??= []).push(reader);
    }
    return count;
  }).sort((a, b) => b.leido - a.leido || a.name.localeCompare(b.name));
  const mine = all.find(([reader]) => reader === name);
  return { marks: mine ? mine[1] : {}, readers: summary, byBook };
});
