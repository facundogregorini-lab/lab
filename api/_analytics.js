// Server-side PostHog events (subscriptions confirmed by Mercado Pago). Only in Vercel production,
// unless POSTHOG_KEY is set, so local runs and tests send nothing. Never throws.
const KEY = (process.env.POSTHOG_KEY || '').trim() || (process.env.VERCEL_ENV === 'production' ? 'phc_tPTtLds2LH6udzJtXWcZzHsXyxUrTgxjSDyMmDThg3gz' : '');
const HOST = (process.env.POSTHOG_HOST || '').trim() || 'https://us.i.posthog.com';

async function capture(distinctId, event, properties = {}) {
  if (!KEY) return;
  try {
    await fetch(HOST + '/i/v0/e/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: KEY, event, distinct_id: distinctId, properties: { ...properties, $lib: 'manuelita-server' } }),
      signal: AbortSignal.timeout(2000),
    });
  } catch (error) {
    console.error('PostHog unreachable', error.message);
  }
}

module.exports = { capture };
