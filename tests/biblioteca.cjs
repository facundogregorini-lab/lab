// Biblioteca El Regreso: render, filtros, ficha, marcas locales y cuenta con la API en memoria.
const assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const shots = path.join(root, 'test-results'); fs.mkdirSync(shots, { recursive: true });
const server = require('./server.cjs').createServer();
const check = (name, ok) => { assert.ok(ok, name); console.log('PASS', name); };
const URL = 'http://127.0.0.1:4179/biblioteca-el-regreso/';

(async () => {
  await new Promise(r => server.listen(4179, '127.0.0.1', r));
  const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), headless: true });
  try {
    const errors = [];
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(URL);
    await page.waitForFunction(() => typeof biblioDebug === 'function');
    const state = () => page.evaluate(() => biblioDebug());
    check('Catalog loads 300+ books', (await state()).total > 300);
    check('Bookcase I renders its spines', await page.locator('.case[data-case="A"] .book').count() > 150);

    await page.locator('.book[data-id="montecristo"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await page.locator('.book[data-id="montecristo"]').hover();
    await page.waitForSelector('#peek.on');
    check('Hover shows summary', (await page.textContent('#peek')).includes('Montecristo'));
    await page.click('[data-len="l"]');
    await page.locator('.book[data-id="montecristo"]').click();
    await page.waitForSelector('#bookDialog[open]');
    check('Long summary in dialog', (await page.textContent('#bookDialog .summary')).length > 400);
    await page.click('#bookDialog [data-mark="leido"]');
    check('Marking read updates counter', (await page.textContent('#readCount')).startsWith('1 '));
    await page.keyboard.press('Escape');
    check('Read book shows bookmark', await page.locator('.book[data-id="montecristo"].m-leido').count() === 1);

    await page.fill('#search', 'balmaceda');
    await page.waitForTimeout(300);
    check('Search hint offers the other bookcase', (await page.textContent('#shelfHint')).includes('Biblioteca II'));
    await page.click('[data-go="B"]');
    check('Search highlights matches', await page.locator('.case[data-case="B"] .book.hit').count() >= 6);
    await page.fill('#search', '');
    await page.click('.tab[data-view="catalog"]');
    await page.click('.chip[data-cat="campo"]');
    check('Category filter in catalog', (await page.locator('#catalog li').count()) === (await page.evaluate(() => Object.values(BIBLIO.books).filter(b => b.c === 'campo').length)));
    await page.click('.chip[data-cat="campo"]');
    await page.click('.tab[data-view="stats"]');
    check('Stats render', await page.locator('.bar').count() > 10);

    await page.click('#account');
    await page.fill('#username', 'lector');
    await page.fill('#password', 'regreso1');
    await page.click('#loginForm button[value=register]');
    await page.waitForFunction(() => document.getElementById('accountLabel').textContent === 'lector');
    await page.waitForTimeout(800);
    await page.reload();
    await page.waitForFunction(() => typeof biblioDebug === 'function' && biblioDebug().marks.montecristo === 'leido');
    check('Local marks move into the account and survive reload', true);
    const other = await browser.newPage();
    await other.goto(URL + '#libro/montecristo');
    await other.waitForSelector('#bookDialog[open]');
    check('Book links open the dialog', (await other.textContent('#bookTitle')).includes('Montecristo'));
    await other.close();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(URL + '#A');
    await page.waitForTimeout(400);
    check('No page-level horizontal overflow on mobile', await page.evaluate(() => document.documentElement.scrollWidth === innerWidth));
    await page.screenshot({ path: path.join(shots, 'biblioteca-mobile.png') });
    check('No uncaught errors', errors.length === 0);
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); server.close(); process.exitCode = 1; });
