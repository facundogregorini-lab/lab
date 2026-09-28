// Webhook for Mercado Pago subscription events. The payload is only a hint:
// the subscription is always re-read from Mercado Pago before changing anything.
const { handler } = require('./_lib');
const { settings, mp, storeSubscription } = require('./_billing');

module.exports = handler(async req => {
  if (!settings().enabled) return { ok: true };
  const payload = req.body && typeof req.body === 'object' ? req.body : {};
  const query = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const type = String(payload.type || payload.topic || query.type || query.topic || '');
  const id = String(payload.data?.id || query['data.id'] || query.id || '');
  if (!/^[\w-]{1,64}$/.test(id)) return { ok: true };

  if (type.includes('preapproval')) {
    await storeSubscription(await mp('/preapproval/' + id));
  } else if (type === 'subscription_authorized_payment') {
    const payment = await mp('/authorized_payments/' + id);
    if (payment.preapproval_id) await storeSubscription(await mp('/preapproval/' + encodeURIComponent(payment.preapproval_id)));
  }
  return { ok: true };
});
