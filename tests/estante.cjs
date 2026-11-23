// Estante: agregar desde la búsqueda, ficha (estado, puntaje, nota, etiquetas), biblioteca, tu año y cuenta.
const assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const shots = path.join(root, 'test-results'); fs.mkdirSync(shots, { recursive: true });
process.env.ESTANTE_FAKE = '1'; // búsqueda simulada: no sale a internet
const server = require('./server.cjs').createServer();
const check = (name, ok) => { assert.ok(ok, name); console.log('PASS', name); };
const URL = 'http://127.0.0.1:4181/estante/';

(async () => {
  await new Promise(r => server.listen(4181, '127.0.0.1', r));
  const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), headless: true });
  try {
    const errors = [];
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => d.accept());
    const debug = () => page.evaluate(() => estanteDebug());
    const shot = name => page.screenshot({ path: path.join(shots, 'estante-' + name + '.png') });

    await page.goto(URL);
    await page.waitForFunction(() => typeof estanteDebug === 'function');
    check('Empty home invites to add', (await page.textContent('.empty-hero')).includes('vacío'));
    await shot('vacio');

    // Agregar desde la búsqueda
    await page.click('.tabbar .tab-add');
    await page.waitForSelector('#q');
    await page.fill('#q', 'weir');
    await page.waitForSelector('.result');
    check('Book search shows results', await page.locator('.result').count() === 3);
    await shot('agregar');
    await page.click('.result:nth-of-type(1) [data-v="encurso"]');
    check('Adding marks it as reading', (await debug()).items[0].status === 'encurso' && (await debug()).items[0].startedAt);
    check('Result shows it is already in the shelf', await page.locator('.result .in-lib').count() === 1);
    await page.click('.result:nth-of-type(2) [data-v="pendiente"]');
    await page.click('.type-tile[data-v="peli"]');
    await page.fill('#q', 'wenders');
    await page.waitForSelector('.result >> text=Perfect Days');
    await page.click('.result:nth-of-type(1) [data-v="terminado"]');
    await page.click('#toast button');
    await page.waitForSelector('.stars');
    check('Toast opens the item to rate it', (await page.textContent('.item-head h1')) === 'Perfect Days');
    await page.click('.stars button:nth-child(4)');
    check('Rating is saved', (await debug()).items.find(i => i.title === 'Perfect Days').rating === 4);
    await page.fill('#note', 'Me la recomendó Juli.');
    await page.waitForTimeout(700);
    check('Note autosaves', (await debug()).items.find(i => i.title === 'Perfect Days').note === 'Me la recomendó Juli.');
    await page.fill('#tagInput', 'Japón');
    await page.press('#tagInput', 'Enter');
    check('Tags can be added', (await debug()).items.find(i => i.title === 'Perfect Days').tags[0] === 'Japón');
    await shot('ficha');

    // Podcast y carga manual
    await page.goto(URL + '#/agregar');
    await page.click('.type-tile[data-v="pod"]');
    await page.fill('#q', 'acquired');
    await page.waitForSelector('.result >> text=Costco');
    check('Podcast search shows shows and episodes', (await page.textContent('#results')).includes('Episodio'));
    await page.click('.result:nth-of-type(2) [data-v="encurso"]');
    await page.fill('#q', 'algo que no existe');
    await page.waitForSelector('#results .empty');
    await page.click('[data-action="manual"]');
    await page.waitForSelector('#manualDialog[open]');
    check('Manual form keeps the type', await page.inputValue('#manualForm [name=type]') === 'pod');
    await page.selectOption('#manualForm [name=type]', 'libro');
    await page.fill('#manualForm [name=title]', 'Rayuela');
    await page.fill('#manualForm [name=creator]', 'Julio Cortázar');
    await page.fill('#manualForm [name=length]', '600');
    await page.selectOption('#manualForm [name=status]', 'pendiente');
    await page.click('#manualForm [type=submit]');
    await page.waitForSelector('.item-head >> text=Rayuela');
    check('Manual add opens the new item', (await debug()).items.length === 5);
    await page.click('[data-action="status"][data-v="encurso"]');
    await page.fill('#page', '150');
    await page.press('#page', 'Tab');
    check('Book progress by page', (await debug()).items.find(i => i.title === 'Rayuela').progress === 150);

    // Inicio
    await page.goto(URL + '#/');
    check('Home shows things in progress', await page.locator('.now-card').count() === 3);
    check('Home shows the year counters', (await page.textContent('.stat.t-peli b')) === '1');
    check('Home lists what is next', await page.locator('.list .row-link').count() === 1);
    await shot('inicio');

    // Biblioteca
    await page.click('.tabbar a[data-tab="biblioteca"]');
    await page.waitForSelector('.grid');
    check('Library opens on the first non-empty status', (await debug()).lib.status === 'terminado');
    await page.click('[data-action="libStatus"][data-v="encurso"]');
    check('Library filters by status', await page.locator('.grid .tile').count() === 3);
    await page.click('[data-action="libType"][data-v="libro"]');
    check('Library filters by type', await page.locator('.grid .tile').count() === 2);
    await page.click('[data-action="libSearch"]');
    await page.fill('#libQ', 'rayu');
    check('Library search', await page.locator('.grid .tile').count() === 1);
    await page.click('[data-action="libSearch"]');
    await page.click('[data-action="libType"][data-v="todo"]');
    await shot('biblioteca');

    // Tu año
    await page.click('.tabbar a[data-tab="anio"]');
    check('Year shows the total', (await page.textContent('.year-card .big b')) === '1');
    check('Year shows the best rated', await page.locator('.best .tile').count() === 1);
    await shot('anio');

    // Quitar y deshacer
    const id = (await debug()).items.find(i => i.title === 'El marciano').id;
    await page.goto(URL + '#/item/' + id);
    await page.click('[data-action="delete"]');
    check('Delete removes the item', !(await debug()).items.some(i => i.id === id));
    await page.click('#toast button');
    check('Undo brings it back', (await debug()).items.some(i => i.id === id));

    // Cuenta: lo local sube a la cuenta y vuelve en otro dispositivo
    await page.goto(URL + '#/perfil');
    await shot('perfil');
    await page.fill('#username', 'lectora');
    await page.fill('#password', 'estante1');
    await page.click('#loginForm button[value=register]');
    await page.waitForFunction(() => estanteDebug().token && estanteDebug().sync === 'ok');
    check('Account syncs', true);
    const other = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const page2 = await other.newPage();
    page2.on('pageerror', e => errors.push(e.message));
    await page2.goto(URL + '#/perfil');
    await page2.waitForSelector('#username');
    await page2.fill('#username', 'lectora');
    await page2.fill('#password', 'estante1');
    await page2.click('#loginForm button[value=login]');
    await page2.waitForFunction(() => estanteDebug().sync === 'ok' && estanteDebug().items.length === 5);
    check('Another device gets the same shelf', true);
    await page2.goto(URL + '#/biblioteca');
    const pid = (await page2.evaluate(() => estanteDebug().items)).find(i => i.title === 'Perfect Days').id;
    await page2.goto(URL + '#/item/' + pid);
    await page2.click('.stars button:nth-child(5)');
    await page2.waitForFunction(() => estanteDebug().sync === 'ok');
    await page2.waitForTimeout(1500);
    await page2.waitForFunction(() => estanteDebug().sync === 'ok');
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.waitForFunction(() => estanteDebug().items.find(i => i.title === 'Perfect Days').rating === 5, null, { timeout: 5000 });
    check('Changes from another device arrive', true);
    await other.close();

    check('No page-level horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    check('No uncaught errors', errors.length === 0);
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); server.close(); process.exitCode = 1; });
