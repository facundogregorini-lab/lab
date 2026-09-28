// Freemium + Mercado Pago flow against a fake Mercado Pago API. Run: node tests/billing.cjs
const http = require('node:http'), assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SITE = 'http://127.0.0.1:4181', MP = 'http://127.0.0.1:4191';
Object.assign(process.env, { MP_ACCESS_TOKEN: 'TEST-token', MP_PRICE: '5000', MP_API_BASE: MP, APP_URL: SITE, MANUELITA_PREMIUM_USERS: 'regalo' });
const { createServer } = require('./server.cjs');

// Fake Mercado Pago: subscriptions become "authorized" the first time they are read back (as if the user paid).
const subs = new Map();
const fakeMP = http.createServer(async (req, res) => {
  let raw = ''; for await (const c of req) raw += c;
  const url = new URL(req.url, MP), send = d => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(d)); };
  if (req.headers.authorization !== 'Bearer TEST-token') { res.statusCode = 401; return send({ message: 'bad token' }); }
  if (req.method === 'POST' && url.pathname === '/preapproval') {
    const body = JSON.parse(raw), id = 'pre_' + (subs.size + 1);
    assert.equal(body.auto_recurring.transaction_amount, 5000);
    subs.set(id, { id, status: 'pending', external_reference: body.external_reference, payer_email: body.payer_email, init_point: body.back_url });
    return send(subs.get(id));
  }
  const m = /^\/preapproval\/(pre_\d+)$/.exec(url.pathname);
  if (m && subs.has(m[1])) {
    const s = subs.get(m[1]);
    if (s.status === 'pending') Object.assign(s, { status: 'authorized', next_payment_date: new Date(Date.now() + 30 * 864e5).toISOString() });
    return send(s);
  }
  if (url.pathname === '/preapproval/search') return send({ results: [...subs.values()].filter(s => s.external_reference === url.searchParams.get('external_reference')) });
  res.statusCode = 404; send({ message: 'not found' });
});

const reports = []; const check = (name, ok) => { assert.ok(ok, name); reports.push(name); console.log('PASS', name); };
(async () => {
  const site = createServer();
  await Promise.all([new Promise(r => site.listen(4181, '127.0.0.1', r)), new Promise(r => fakeMP.listen(4191, '127.0.0.1', r))]);
  const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ['--enable-unsafe-swiftshader'] });
  const errors = [];
  try {
    const open = async () => { const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); const page = await ctx.newPage(); page.on('pageerror', e => errors.push(e.message)); await page.goto(SITE); await page.waitForFunction(() => typeof manuelitaDebug === 'function'); return page; };
    const st = page => page.evaluate(() => manuelitaDebug());
    const move = async page => { const p = (await st(page)).pieces.find(p => !p.placed); await page.mouse.move(p.screen.x, p.screen.y); await page.mouse.down(); await page.mouse.move(p.home.x, p.home.y, { steps: 6 }); await page.mouse.up(); };
    const register = async (page, name) => { await page.click('#account'); await page.fill('#username', name); await page.fill('#password', 'secreto1'); await page.click('#loginForm button[value=register]'); await page.waitForFunction(n => document.getElementById('accountLabel').textContent === n, name); await page.waitForTimeout(300); };

    // Guest: one free puzzle, no own photos.
    const guest = await open();
    check('Guest is limited', (await st(guest)).limited);
    await guest.click('#photo'); check('Photos need the paid plan', (await st(guest)).planOpen && (await guest.textContent('#planReason')).includes('fotos')); await guest.click('#closePlan');
    await move(guest); check('First puzzle of the day is free', (await st(guest)).placed === 1);
    await guest.click('#restart'); check('Second puzzle shows the plan', (await st(guest)).planOpen && (await st(guest)).placed === 1);
    check('Guest is asked to sign in to subscribe', (await guest.textContent('#planSubmit')).includes('Crear cuenta') && await guest.locator('#planEmail').isHidden());
    await guest.click('#closePlan'); await guest.reload(); await guest.waitForFunction(() => typeof manuelitaDebug === 'function');
    await move(guest); check('Reload does not reset the daily limit', (await st(guest)).planOpen && (await st(guest)).placed === 0);

    // Account: the limit follows the user across devices.
    const ana = await open(); await register(ana, 'ana'); await move(ana); await ana.waitForTimeout(400);
    const ana2 = await open(); await ana2.click('#account'); await ana2.fill('#username', 'ana'); await ana2.fill('#password', 'secreto1'); await ana2.click('#loginForm button[value=login]'); await ana2.waitForFunction(() => manuelitaDebug().placed === 1);
    await ana2.click('#restart'); check('Daily limit is shared between devices', (await st(ana2)).planOpen);
    await ana2.click('#planSubmit'); await ana2.waitForFunction(() => document.getElementById('planError').textContent); check('Email is required to subscribe', (await ana2.textContent('#planError')).includes('email'));
    await ana2.fill('#planEmail', 'ana@example.com'); await Promise.all([ana2.waitForURL(SITE + '/'), ana2.click('#planSubmit')]);
    await ana2.waitForFunction(() => typeof manuelitaDebug === 'function' && manuelitaDebug().premium);
    check('Returning from Mercado Pago activates the plan', (await ana2.textContent('#toast')).includes('Gracias'));
    await ana2.click('#restart'); await ana2.click('#confirmRestart'); await move(ana2); await ana2.click('#restart'); check('Subscribers play without limit', !(await st(ana2)).planOpen);
    await ana2.click('#confirmRestart'); await ana2.click('#photo'); check('Subscribers can upload photos', !(await st(ana2)).planOpen);
    await ana2.click('#account'); await ana2.waitForFunction(() => document.getElementById('planStatus').textContent.includes('activo')); check('Account shows the active plan', await ana2.locator('#upgrade').isHidden());

    // Webhook: a cancellation keeps access until the paid period ends.
    subs.get('pre_1').status = 'cancelled';
    const hook = await fetch(SITE + '/api/mercadopago', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'subscription_preapproval', data: { id: 'pre_1' } }) });
    check('Webhook accepted', hook.status === 200);
    const token = await ana2.evaluate(() => localStorage.getItem('manuelita-token'));
    const plan = await (await fetch(SITE + '/api/billing', { headers: { Authorization: 'Bearer ' + token } })).json();
    check('Cancelled plan lasts until the paid period ends', plan.premium && plan.subscription.status === 'cancelled');

    // Server-side checks.
    const bob = await open(); await register(bob, 'bobo');
    const bobToken = await bob.evaluate(() => localStorage.getItem('manuelita-token'));
    const photo = await fetch(SITE + '/api/data', { method: 'POST', headers: { Authorization: 'Bearer ' + bobToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'photo', photo: 'data:image/jpeg;base64,AAAA' }) });
    check('Server rejects photos from free accounts', photo.status === 402);
    const play = () => fetch(SITE + '/api/billing', { method: 'POST', headers: { Authorization: 'Bearer ' + bobToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'play' }) });
    check('Server allows one free play and blocks the second', (await play()).status === 200 && (await play()).status === 402);
    const gift = await open(); await register(gift, 'regalo'); await gift.waitForFunction(() => manuelitaDebug().premium, null, { timeout: 5000 }).catch(() => {}); check('Courtesy users are premium', (await st(gift)).premium);
    check('No uncaught browser errors', errors.length === 0);
    console.log(JSON.stringify({ passed: reports.length, errors }, null, 2));
  } finally { await browser.close(); site.close(); fakeMP.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
