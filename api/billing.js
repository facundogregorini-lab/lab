// GET: plan info (public part + the user's plan when logged in)
// POST { action: 'play' }: counts today's free puzzle · { action: 'subscribe', email } · { action: 'sync' }
const { redis, HttpError, requireUser, bearer, body, handler } = require('./_lib');
const { settings, playsKey, mp, storeSubscription, status } = require('./_billing');

async function userInfo(name, options) {
  const { premium, sub, gift } = await status(name, options);
  const played = Number(await redis('GET', playsKey(name))) > 0;
  return { premium, played, gift: Boolean(gift), subscription: sub && { status: sub.status, paidUntil: sub.paidUntil } };
}

module.exports = handler(async req => {
  const s = settings();
  const base = { enabled: s.enabled, price: s.label };

  if (req.method === 'GET') {
    if (!bearer(req)) return base;
    return { ...base, ...await userInfo(await requireUser(req)) };
  }
  if (req.method !== 'POST') throw new HttpError(405, 'Método no permitido.');
  const name = await requireUser(req);
  const data = body(req);

  if (data.action === 'play') {
    if (!s.enabled || (await status(name)).premium) return { ok: true };
    const count = await redis('INCR', playsKey(name));
    if (count === 1) await redis('EXPIRE', playsKey(name), 2 * 86400);
    if (count > 1) throw new HttpError(402, 'Ya usaste tu rompecabezas gratis de hoy.');
    return { ok: true };
  }

  if (data.action === 'sync') return { ...base, ...await userInfo(name, { forceRefresh: true }) };

  if (data.action === 'subscribe') {
    if (!s.enabled) throw new HttpError(503, 'Los pagos todavía no están configurados.');
    const email = String(data.email || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Escribí el email de tu cuenta de Mercado Pago.');
    const origin = process.env.APP_URL || 'https://' + req.headers.host;
    const pre = await mp('/preapproval', {
      method: 'POST',
      body: JSON.stringify({
        reason: 'Manuelita Ilimitado',
        external_reference: name,
        payer_email: email,
        back_url: origin + '/?suscripcion=ok',
        status: 'pending',
        auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: s.price, currency_id: s.currency },
      }),
    });
    await storeSubscription(pre);
    if (!pre.init_point) throw new HttpError(502, 'Mercado Pago no devolvió el enlace de pago.');
    return { url: pre.init_point };
  }

  throw new HttpError(400, 'Acción desconocida.');
});
