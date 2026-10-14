// Biblioteca El Regreso: completa un aporte con IA (lee la foto, corrige título y autor, escribe los resúmenes).
// GET: { enabled, model } · GET ?resumen=<aporteId>: { corto, largo } · POST { id }: { aporte } (requiere cuenta)
const { redis, HttpError, requireUser, body, handler } = require('./_lib');
const { analyze, enabled, MODEL } = require('./_ia');

const KEY = 'biblio:aportes', DAILY_LIMIT = 40;
const today = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);

module.exports = handler(async req => {
  if (req.method === 'GET') {
    const id = new URL(req.url, 'http://x').searchParams.get('resumen');
    if (!id) return { enabled: enabled(), model: MODEL };
    if (!/^[a-z0-9]{8,24}$/.test(id)) throw new HttpError(400, 'Resumen inválido.');
    const json = await redis('GET', 'biblio:resumen:' + id);
    return json ? JSON.parse(json) : { corto: null, largo: null };
  }
  if (req.method !== 'POST') throw new HttpError(405, 'Método no permitido.');
  const name = await requireUser(req);
  if (!enabled()) throw new HttpError(503, 'La IA no está configurada: falta ANTHROPIC_API_KEY en Vercel.');

  // Tope diario por persona, para que el gasto nunca se dispare.
  const countKey = 'biblio:ia:' + name + ':' + today();
  const used = await redis('INCR', countKey);
  if (used === 1) await redis('EXPIRE', countKey, 2 * 86400);
  if (used > DAILY_LIMIT) throw new HttpError(429, 'Llegaste al máximo de análisis con IA por hoy. Probá mañana.');

  const id = String(body(req).id || '');
  const list = JSON.parse(await redis('GET', KEY) || '[]');
  const aporte = list.find(a => a.id === id);
  if (!aporte) throw new HttpError(404, 'Ese aporte ya no existe.');
  if (aporte.by !== name) throw new HttpError(403, 'Solo quien lo cargó puede analizarlo.');

  const photo = aporte.photo ? await redis('GET', 'biblio:foto:' + id) : null;
  let result;
  try {
    result = await analyze({ photo, title: aporte.title || aporte.originalTitle, author: aporte.author || aporte.originalAuthor, note: aporte.note, category: aporte.category });
  } catch (error) {
    console.error('IA', error.message);
    throw new HttpError(502, error.message.startsWith('La ') ? error.message : 'La IA no respondió. Probá de nuevo en un rato.');
  }

  await redis('SET', 'biblio:resumen:' + id, JSON.stringify({ corto: result.corto, largo: result.largo }));
  aporte.ai = { title: result.title, author: result.author, year: result.year, category: result.category, confident: result.confident, model: result.model, summary: true, date: Date.now() };
  // Lo que escribió la persona manda; la IA completa lo que falta.
  if (aporte.type === 'fix' && result.confident) {
    if (!aporte.title && result.title && result.title !== aporte.originalTitle) aporte.title = result.title;
    if (!aporte.author && result.author && result.author !== aporte.originalAuthor) aporte.author = result.author;
  }
  if (aporte.type === 'new') {
    if (!aporte.author && result.author) aporte.author = result.author;
    if (!aporte.year && result.year) aporte.year = result.year;
  }
  // Se vuelve a leer la lista por si otro aporte entró mientras la IA trabajaba.
  const fresh = JSON.parse(await redis('GET', KEY) || '[]');
  const i = fresh.findIndex(a => a.id === id);
  if (i >= 0) { fresh[i] = aporte; await redis('SET', KEY, JSON.stringify(fresh)); }
  if (result.usage) console.log('IA tokens', JSON.stringify({ in: result.usage.input_tokens, out: result.usage.output_tokens, cache: result.usage.cache_read_input_tokens }));
  return { aporte };
});
