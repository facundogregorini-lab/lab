// GET: who am I · POST {action: 'register' | 'login' | 'logout'}
const { redis, HttpError, createSession, tokenKey, bearer, requireUser, hashPassword, checkPassword, body, handler } = require('./_lib');

const MAX_FAILURES = 10, LOCK_SECONDS = 15 * 60;

function credentials(data) {
  const name = String(data.username || '').trim().toLowerCase();
  const password = String(data.password || '');
  if (!/^[a-z0-9_.-]{3,20}$/.test(name)) throw new HttpError(400, 'El usuario debe tener entre 3 y 20 letras, números, puntos o guiones.');
  if (password.length < 6 || password.length > 100) throw new HttpError(400, 'La contraseña debe tener al menos 6 caracteres.');
  return { name, password };
}

module.exports = handler(async req => {
  if (req.method === 'GET') return { user: { name: await requireUser(req) } };
  if (req.method !== 'POST') throw new HttpError(405, 'Método no permitido.');
  const data = body(req);

  if (data.action === 'logout') {
    const token = bearer(req);
    if (token) await redis('DEL', tokenKey(token));
    return { ok: true };
  }

  const { name, password } = credentials(data);

  if (data.action === 'register') {
    const created = await redis('SET', 'user:' + name, JSON.stringify({ ...hashPassword(password), created: Date.now() }), 'NX');
    if (!created) throw new HttpError(409, 'Ese usuario ya existe. Elegí otro o entrá con tu contraseña.');
    return { token: await createSession(name), user: { name } };
  }

  if (data.action === 'login') {
    const failKey = 'fail:' + name;
    if (Number(await redis('GET', failKey)) >= MAX_FAILURES) throw new HttpError(429, 'Demasiados intentos. Esperá 15 minutos y probá de nuevo.');
    const stored = await redis('GET', 'user:' + name);
    if (!stored || !checkPassword(password, JSON.parse(stored))) {
      if (await redis('INCR', failKey) === 1) await redis('EXPIRE', failKey, LOCK_SECONDS);
      throw new HttpError(401, 'Usuario o contraseña incorrectos.');
    }
    await redis('DEL', failKey);
    return { token: await createSession(name), user: { name } };
  }

  throw new HttpError(400, 'Acción desconocida.');
});
