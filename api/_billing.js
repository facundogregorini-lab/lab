// Freemium rules and Mercado Pago subscriptions (preapproval API).
const { redis, HttpError } = require('./_lib');

const DAY_MS = 86400e3, GRACE_MS = 3 * DAY_MS;
const env = name => (process.env[name] || '').trim();

function settings() {
  const token = env('MP_ACCESS_TOKEN'), price = Number(env('MP_PRICE'));
  return {
    enabled: Boolean(token && price > 0),
    token, price,
    currency: env('MP_CURRENCY') || 'ARS',
    label: env('PRICE_LABEL') || 'US$ 5 por mes',
    api: env('MP_API_BASE') || 'https://api.mercadopago.com',
    freeUsers: env('MANUELITA_PREMIUM_USERS').toLowerCase().split(',').map(s => s.trim()).filter(Boolean),
  };
}

// Calendar day in Argentina (UTC-3, no daylight saving).
const today = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const playsKey = name => 'plays:' + name + ':' + today();

async function mp(path, options = {}) {
  const s = settings();
  const response = await fetch(s.api + path, {
    ...options,
    headers: { Authorization: 'Bearer ' + s.token, 'Content-Type': 'application/json', ...options.headers },
  }).catch(error => {
    console.error('Mercado Pago unreachable', error.message);
    throw new HttpError(502, 'No pudimos conectarnos con Mercado Pago. Probá de nuevo en un rato.');
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('Mercado Pago', response.status, JSON.stringify(json));
    throw new HttpError(502, 'Mercado Pago no respondió bien: ' + (json.message || response.status));
  }
  return json;
}

const readSub = async name => JSON.parse(await redis('GET', 'sub:' + name) || 'null');

// Stores what Mercado Pago says about a subscription. Access lasts until the next charge (+3 days of grace).
async function storeSubscription(pre) {
  const name = String(pre.external_reference || '');
  if (!/^[a-z0-9_.-]{3,20}$/.test(name)) return null;
  const old = await readSub(name);
  let paidUntil = old?.id === pre.id ? old.paidUntil || 0 : 0;
  if (pre.status === 'authorized') {
    const next = Date.parse(pre.next_payment_date || '') || Date.now() + 31 * DAY_MS;
    paidUntil = Math.max(paidUntil, next + GRACE_MS);
  }
  // An older authorized subscription keeps priority over a new pending attempt.
  if (old && old.id !== pre.id && old.paidUntil > Date.now() && pre.status !== 'authorized') return old;
  const sub = { id: pre.id, status: pre.status, paidUntil, updated: Date.now() };
  await redis('SET', 'sub:' + name, JSON.stringify(sub));
  return sub;
}

async function refresh(name, sub) {
  if (!settings().enabled) return sub;
  try {
    if (sub?.id) return await storeSubscription(await mp('/preapproval/' + encodeURIComponent(sub.id)));
    const found = await mp('/preapproval/search?external_reference=' + encodeURIComponent(name) + '&sort=date_created:desc');
    const best = (found.results || []).find(p => p.status === 'authorized') || found.results?.[0];
    return best ? await storeSubscription(best) : sub;
  } catch (error) {
    console.error('Could not refresh subscription', error.message);
    return sub;
  }
}

// { premium, sub }. Refreshes from Mercado Pago when a stored subscription is pending or about to lapse.
async function status(name, { forceRefresh = false } = {}) {
  const s = settings();
  if (s.freeUsers.includes(name)) return { premium: true, sub: null, gift: true };
  let sub = await readSub(name);
  const stale = sub && Date.now() - sub.updated > 10 * 60e3;
  const unsure = sub && (sub.status === 'pending' || (sub.status === 'authorized' && sub.paidUntil < Date.now() + DAY_MS));
  if (forceRefresh || (stale && unsure)) sub = await refresh(name, sub);
  return { premium: Boolean(sub && sub.paidUntil > Date.now()), sub };
}

async function isPremium(name) {
  return !settings().enabled || (await status(name)).premium;
}

module.exports = { settings, today, playsKey, mp, storeSubscription, status, isPremium };
