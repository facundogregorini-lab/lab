// Biblioteca El Regreso: correcciones de libros (con foto del lomo) y libros nuevos que suma la familia.
// GET: { aportes: [...] } (sin fotos) · GET ?foto=<id>: { photo } · POST { action: 'add' | 'delete', ... } (requiere cuenta)
const crypto = require('node:crypto');
const { redis, HttpError, requireUser, body, handler } = require('./_lib');

const KEY = 'biblio:aportes', photoKey = id => 'biblio:foto:' + id;
const MAX_ENTRIES = 500, MAX_PHOTO = 900_000;
const CATEGORIES = ['clasicos', 'aventura', 'latam', 'infantil', 'filosofia', 'biografias', 'hist-arg', 'hist-mundial', 'patagonia', 'politica', 'economia', 'desarrollo', 'psicologia', 'ciencia', 'campo', 'religion'];
const text = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const isJpeg = s => typeof s === 'string' && /^data:image\/(jpeg|webp);base64,/.test(s);
const load = async () => { try { return JSON.parse(await redis('GET', KEY) || '[]'); } catch { return []; } };

module.exports = handler(async req => {
  if (req.method === 'GET') {
    const foto = new URL(req.url, 'http://x').searchParams.get('foto');
    if (foto) {
      if (!/^[a-z0-9]{8,24}$/.test(foto)) throw new HttpError(400, 'Foto inválida.');
      return { photo: await redis('GET', photoKey(foto)) };
    }
    return { aportes: await load() };
  }
  if (req.method !== 'POST') throw new HttpError(405, 'Método no permitido.');
  const name = await requireUser(req);
  const data = body(req);
  const list = await load();

  if (data.action === 'delete') {
    const i = list.findIndex(a => a.id === data.id);
    if (i < 0) throw new HttpError(404, 'Ese aporte ya no existe.');
    if (list[i].by !== name) throw new HttpError(403, 'Solo quien lo cargó puede borrarlo.');
    const [gone] = list.splice(i, 1);
    await redis('SET', KEY, JSON.stringify(list));
    if (gone.photo) await redis('DEL', photoKey(gone.id));
    return { ok: true };
  }
  if (data.action !== 'add') throw new HttpError(400, 'Acción desconocida.');

  const type = data.type === 'fix' ? 'fix' : 'new';
  const entry = {
    id: crypto.randomBytes(6).toString('hex'), type, by: name, date: Date.now(),
    title: text(data.title, 160), author: text(data.author, 120), note: text(data.note, 2000),
  };
  if (type === 'fix') {
    entry.bookId = text(data.bookId, 48);
    entry.originalTitle = text(data.originalTitle, 160);
    entry.originalAuthor = text(data.originalAuthor, 120);
    if (!/^[a-z0-9-]{1,48}$/.test(entry.bookId)) throw new HttpError(400, 'Libro inválido.');
    if (!data.photo && !entry.title && !entry.author && !entry.note) throw new HttpError(400, 'Sumá una foto o escribí la corrección.');
  } else {
    if (!entry.title) throw new HttpError(400, 'Falta el título del libro.');
    entry.category = CATEGORIES.includes(data.category) ? data.category : 'clasicos';
    entry.year = Number.isInteger(data.year) && Math.abs(data.year) < 3000 ? data.year : null;
    entry.bookcase = data.bookcase === 'B' ? 'B' : 'A';
    entry.shelf = Math.min(5, Math.max(1, Number(data.shelf) || 5));
    entry.color = /^#[0-9a-f]{6}$/i.test(data.color || '') ? data.color : null;
  }
  if (data.photo) {
    if (!isJpeg(data.photo) || data.photo.length > MAX_PHOTO) throw new HttpError(413, 'La foto es demasiado grande.');
    await redis('SET', photoKey(entry.id), data.photo);
    entry.photo = true;
  }
  list.push(entry);
  while (list.length > MAX_ENTRIES) {
    const old = list.shift();
    if (old.photo) await redis('DEL', photoKey(old.id));
  }
  await redis('SET', KEY, JSON.stringify(list));
  return { aporte: entry };
});
