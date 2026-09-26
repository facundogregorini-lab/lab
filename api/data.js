// Saved puzzles for the logged-in user.
// GET: { game, photo, done } · POST { type: 'progress' | 'photo' | 'finish', ... }
const { redis, HttpError, requireUser, body, handler } = require('./_lib');

const MAX_GAME = 20_000, MAX_PHOTO = 900_000, MAX_THUMB = 60_000, MAX_DONE = 30;
const isJpeg = s => typeof s === 'string' && s.startsWith('data:image/jpeg;base64,');

module.exports = handler(async req => {
  const name = await requireUser(req);

  if (req.method === 'GET') {
    const [game, photo, done] = await Promise.all([
      redis('GET', 'save:' + name),
      redis('GET', 'photo:' + name),
      redis('LRANGE', 'done:' + name, 0, MAX_DONE - 1),
    ]);
    return { game: game ? JSON.parse(game) : null, photo: photo || null, done: (done || []).map(d => JSON.parse(d)) };
  }
  if (req.method !== 'POST') throw new HttpError(405, 'Método no permitido.');
  const data = body(req);

  if (data.type === 'progress') {
    if (data.game === null) { await redis('DEL', 'save:' + name); return { ok: true }; }
    const json = JSON.stringify(data.game);
    if (!data.game || typeof data.game !== 'object' || json.length > MAX_GAME) throw new HttpError(400, 'Partida inválida.');
    await redis('SET', 'save:' + name, json);
    return { ok: true };
  }

  if (data.type === 'photo') {
    if (data.photo === null) { await redis('DEL', 'photo:' + name); return { ok: true }; }
    if (!isJpeg(data.photo) || data.photo.length > MAX_PHOTO) throw new HttpError(413, 'La foto es demasiado grande.');
    await redis('SET', 'photo:' + name, data.photo);
    return { ok: true };
  }

  if (data.type === 'finish') {
    const e = data.entry || {};
    const entry = {
      level: String(e.level || '').slice(0, 10),
      time: Math.max(0, Number(e.time) || 0),
      moves: Math.max(0, Number(e.moves) || 0),
      hints: Math.max(0, Number(e.hints) || 0),
      thumb: isJpeg(e.thumb) && e.thumb.length <= MAX_THUMB ? e.thumb : null,
      date: Date.now(),
    };
    await redis('LPUSH', 'done:' + name, JSON.stringify(entry));
    await redis('LTRIM', 'done:' + name, 0, MAX_DONE - 1);
    await redis('DEL', 'save:' + name);
    return { ok: true };
  }

  throw new HttpError(400, 'Tipo de dato desconocido.');
});
