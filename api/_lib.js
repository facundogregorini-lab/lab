// Shared helpers for the Vercel functions. Files starting with "_" are not exposed as routes.
const crypto = require('node:crypto');

// Upstash Redis over its REST API. The Vercel ↔ Upstash integration sets either the KV_* or the UPSTASH_* names.
// Names may carry a custom prefix chosen when connecting the store (e.g. STORAGE_KV_REST_API_URL).
function dbConfig() {
  for (const suffix of ['KV_REST_API', 'UPSTASH_REDIS_REST']) {
    const urlKey = Object.keys(process.env).find(k => k.endsWith(suffix + '_URL'));
    if (!urlKey) continue;
    const url = process.env[urlKey];
    const token = process.env[urlKey.slice(0, -'_URL'.length) + '_TOKEN'];
    if (url && token) return { url, token };
  }
  return null;
}

// In-memory store, only for local development and tests (MANUELITA_MEMORY_DB=1).
const memory = new Map();
function memoryCommand([cmd, key, ...args]) {
  switch (cmd.toUpperCase()) {
    case 'GET': return memory.has(key) ? memory.get(key) : null;
    case 'SET': {
      if (args.includes('NX') && memory.has(key)) return null;
      memory.set(key, String(args[0])); return 'OK';
    }
    case 'DEL': return memory.delete(key) ? 1 : 0;
    case 'INCR': { const n = Number(memory.get(key) || 0) + 1; memory.set(key, String(n)); return n; }
    case 'EXPIRE': return 1;
    case 'LPUSH': { const list = memory.get(key) || []; list.unshift(...args.reverse()); memory.set(key, list); return list.length; }
    case 'LTRIM': { const list = memory.get(key) || []; memory.set(key, list.slice(Number(args[0]), Number(args[1]) + 1)); return 'OK'; }
    case 'LRANGE': { const list = memory.get(key) || []; const end = Number(args[1]); return list.slice(Number(args[0]), end < 0 ? undefined : end + 1); }
    default: throw new Error('Unsupported command ' + cmd);
  }
}

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function redis(...command) {
  const config = dbConfig();
  if (!config) {
    if (process.env.MANUELITA_MEMORY_DB === '1') return memoryCommand(command.map(String));
    throw new HttpError(503, 'Falta conectar la base de datos (Upstash) en Vercel.');
  }
  const response = await fetch(config.url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + config.token, 'Content-Type': 'application/json' },
    body: JSON.stringify(command.map(String)),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.error) throw new Error('Redis: ' + (json.error || response.status));
  return json.result;
}

const SESSION_DAYS = 30;
const tokenKey = token => 'session:' + crypto.createHash('sha256').update(token).digest('hex');

async function createSession(name) {
  const token = crypto.randomBytes(32).toString('base64url');
  await redis('SET', tokenKey(token), name, 'EX', SESSION_DAYS * 86400);
  return token;
}

function bearer(req) {
  const match = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  return match ? match[1] : null;
}

// Returns the logged-in username or throws 401.
async function requireUser(req) {
  const token = bearer(req);
  const name = token && await redis('GET', tokenKey(token));
  if (!name) throw new HttpError(401, 'Tu sesión expiró. Volvé a entrar.');
  return name;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function checkPassword(password, { salt, hash }) {
  const candidate = Buffer.from(hashPassword(password, salt).hash, 'hex');
  const stored = Buffer.from(hash, 'hex');
  return candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored);
}

function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { throw new HttpError(400, 'Pedido inválido.'); }
}

// Wraps a handler with JSON responses and uniform error handling.
function handler(fn) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const result = await fn(req, res);
      res.status(200).json(result ?? { ok: true });
    } catch (error) {
      if (!(error instanceof HttpError)) console.error(error);
      const status = error instanceof HttpError ? error.status : 500;
      res.status(status).json({ error: status === 500 ? 'Algo salió mal en el servidor. Probá de nuevo.' : error.message });
    }
  };
}

module.exports = { redis, HttpError, createSession, tokenKey, bearer, requireUser, hashPassword, checkPassword, body, handler };
