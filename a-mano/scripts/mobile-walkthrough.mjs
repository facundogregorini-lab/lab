// Recorre la demo completa en un navegador a 390 px, con tres "teléfonos" (Dani, donante y Marta) sobre el mismo servidor.
// Uso: npm run build && npm run test:mobile   (capturas en test-results/shots, o en SHOTS_DIR)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 3124;
const BASE = `http://127.0.0.1:${PORT}`;
const shots = process.env.SHOTS_DIR || path.join(root, 'test-results', 'shots');
fs.mkdirSync(shots, { recursive: true });
const dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'amano-ui-')), 'ui.db');
const server = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '-p', String(PORT), '-H', '127.0.0.1'], {
  cwd: root, env: { ...process.env, AMANO_DB_PATH: dbFile }, stdio: 'ignore',
});
for (let i = 0; i < 100; i++) {
  try { if ((await fetch(`${BASE}/api/estado`)).ok) break; } catch { /* esperando */ }
  await new Promise((r) => setTimeout(r, 200));
}

const browser = await chromium.launch();
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: Number(process.env.DSF || 1), isMobile: true, hasTouch: true };
let n = 0;
const errors = [];
const shot = async (page, name) => page.screenshot({ path: path.join(shots, `${String(++n).padStart(2, '0')}-${name}.png`), fullPage: true });
const saldo = async (page) => Number((await page.getByTestId('saldo').innerText()).replace(/\D/g, ''));
const expectSaldo = async (page, v, label) => {
  await page.waitForFunction((x) => document.querySelector('[data-testid="saldo"]')?.textContent?.replace(/\D/g, '') === String(x), v, { timeout: 8000 }).catch(() => {});
  const got = await saldo(page);
  console.log(`${got === v ? '✓' : '✗'} ${label}: $ ${got.toLocaleString('es-AR')}`);
  if (got !== v) errors.push(label);
};
const noHScroll = async (page, label) => {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - (window.visualViewport?.width ?? window.innerWidth)) + Math.max(0, (await page.evaluate(() => document.documentElement.scrollWidth)) - (page.viewportSize()?.width ?? 390));
  if (over > 0) { errors.push(`scroll horizontal en ${label}`); console.log(`✗ scroll horizontal en ${label} (${over}px)`); }
};

try {
  const daniCtx = await browser.newContext(phone);
  const dani = await daniCtx.newPage();
  dani.on('pageerror', (e) => errors.push(`error JS: ${e.message}`));
  await dani.goto(`${BASE}/demo`);
  await shot(dani, 'demo');
  await dani.getByRole('link', { name: /Persona: Dani/ }).click();
  await dani.waitForURL('**/persona');
  await expectSaldo(dani, 15000, 'Billetera limpia');
  await shot(dani, 'inicio');
  await noHScroll(dani, 'Inicio');

  await dani.getByRole('link', { name: 'Dónde comprar' }).click();
  await dani.getByRole('link', { name: 'San Telmo', exact: true }).click();
  await dani.waitForURL('**barrio=San**');
  await shot(dani, 'donde-comprar-filtro');
  await dani.getByRole('link', { name: /Comedor de Ana/ }).click();
  await dani.getByRole('button', { name: /Plato caliente del día/ }).click();
  await shot(dani, 'revisar-compra');
  const pay = dani.getByRole('button', { name: /Confirmar y pagar/ });
  await pay.dblclick(); // doble toque a propósito: debe debitar una sola vez
  await dani.waitForURL('**/comprobante/**');
  await shot(dani, 'comprobante');
  await dani.getByRole('link', { name: 'Ver mi saldo' }).click();
  await expectSaldo(dani, 10500, 'Después del plato (con doble toque)');

  await dani.getByRole('link', { name: 'Recibir aportes' }).click();
  await dani.waitForSelector('.qr svg');
  const link = await dani.getByTestId('enlace-publico').inputValue();
  const qrUrl = await dani.locator('[data-qr-url]').getAttribute('data-qr-url');
  console.log(`${qrUrl === link && link.startsWith(BASE) ? '✓' : '✗'} El QR codifica la URL pública con el origen actual: ${qrUrl}`);
  await shot(dani, 'recibir-aportes');
  await noHScroll(dani, 'Recibir aportes');
  await dani.goto(`${BASE}/persona`);

  // Otro teléfono, sin cookies: el donante.
  const donorCtx = await browser.newContext(phone);
  const donor = await donorCtx.newPage();
  await donor.goto(link);
  await shot(donor, 'donante');
  const body = await donor.locator('body').innerText();
  const leak = ['Base semanal', 'Movimientos', 'Marta', 'Demo\n', 'Cambiar de rol', 'AM-2048'].filter((w) => body.includes(w));
  console.log(`${leak.length ? '✗' : '✓'} La vista pública no expone datos de la billetera${leak.length ? `: ${leak}` : ''}`);
  if (leak.length) errors.push('privacidad');
  await donor.getByRole('button', { name: '$ 2.000' }).click();
  await donor.getByRole('button', { name: 'Confirmar aporte de prueba' }).click();
  await donor.getByText(/Gracias/).waitFor();
  await shot(donor, 'donante-gracias');
  await expectSaldo(dani, 12500, 'Billetera de Dani se actualiza sola tras el aporte');

  await dani.getByRole('link', { name: 'Mis pasos' }).click();
  await dani.waitForURL('**/persona/pasos');
  await shot(dani, 'elegir-paso');
  await noHScroll(dani, 'Mis pasos');
  await dani.getByLabel(/Tramitar mi DNI/).check();
  await dani.getByRole('button', { name: 'Elegir este paso' }).click();
  await dani.getByRole('button', { name: 'Ya fui' }).waitFor();
  await dani.getByRole('button', { name: 'Necesito ayuda para ir' }).click();
  await dani.getByRole('button', { name: 'Pedir ayuda a mi referente' }).click();
  await dani.getByText('Pediste ayuda para ir.').waitFor();
  await shot(dani, 'paso-elegido');
  await dani.getByRole('button', { name: 'Ya fui' }).click();
  await dani.getByTestId('estado-paso').filter({ hasText: 'Pendiente de confirmación' }).waitFor();
  await shot(dani, 'paso-pendiente');
  await dani.getByRole('link', { name: 'Inicio' }).click();
  await expectSaldo(dani, 12500, 'Después de “Ya fui” (sin extra todavía)');

  const martaCtx = await browser.newContext(phone);
  const marta = await martaCtx.newPage();
  await marta.goto(`${BASE}/api/demo/entrar?como=referente:r_marta`);
  await marta.waitForURL('**/referente');
  await shot(marta, 'referente-390');
  await noHScroll(marta, 'Panel del referente');
  await marta.getByRole('button', { name: 'Registrar resolución' }).click();
  await marta.getByLabel('¿Cómo se resuelve el traslado?').fill('Pasamos a buscarte por el parador a las 9:15.');
  await marta.getByRole('button', { name: 'Guardar' }).click();
  await marta.getByText('Resuelto', { exact: true }).waitFor();
  const confirmBtn = marta.getByRole('button', { name: /Confirmar y acreditar/ });
  await confirmBtn.dblclick();
  await marta.getByText('No hay nada para confirmar.').waitFor();
  await shot(marta, 'referente-confirmado');

  await expectSaldo(dani, 15500, 'Billetera tras la confirmación de Marta');
  await dani.getByRole('link', { name: 'Mis pasos' }).click();
  await dani.getByTestId('recibiste').waitFor();
  const fin = await dani.getByTestId('recibiste').innerText();
  console.log(`${fin === 'Recibiste $ 3.000' ? '✓' : '✗'} Pantalla final: ${fin}`);
  await shot(dani, 'recibiste');
  await dani.getByRole('link', { name: 'Ver mi saldo' }).click();
  await expectSaldo(dani, 15500, 'Ver mi saldo');
  await shot(dani, 'inicio-final');

  await dani.getByRole('link', { name: 'Mi tarjeta' }).click();
  await dani.waitForSelector('.qr svg');
  await shot(dani, 'mi-tarjeta');
  await dani.getByRole('link', { name: /Ficha imprimible/ }).click();
  await dani.waitForSelector('.qr svg');
  await shot(dani, 'ficha-imprimible');

  await marta.getByRole('link', { name: 'Nueva alta' }).click();
  await marta.getByLabel('Nombre elegido').fill('Ale');
  await marta.getByLabel(/consentimiento/).check();
  await marta.getByRole('button', { name: 'Acreditar y asignar tarjeta' }).click();
  await marta.getByText('Listo: Ale quedó acreditado').waitFor();
  await shot(marta, 'alta');
  await marta.getByRole('link', { name: 'Seguimiento 90 días' }).click();
  await marta.getByRole('heading', { name: 'Seguimiento a 90 días' }).waitFor();
  await shot(marta, 'seguimiento');
  await noHScroll(marta, 'Seguimiento');

  const desk = await (await browser.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
  await desk.goto(`${BASE}/api/demo/entrar?como=referente:r_marta`);
  await shot(desk, 'referente-escritorio');
  await desk.goto(`${BASE}/api/demo/entrar?como=persona:p_dani`);
  await shot(desk, 'billetera-escritorio');
  await expectSaldo(desk, 15500, 'Dani sin cambios después del alta de Ale');
} catch (e) {
  errors.push(String(e));
  console.error(e);
} finally {
  await browser.close();
  server.kill('SIGTERM');
}
console.log(errors.length ? `\n✗ ${errors.length} problemas: ${errors.join(' | ')}` : `\n✓ Recorrido completo sin errores. Capturas en ${shots}`);
process.exit(errors.length ? 1 : 0);
