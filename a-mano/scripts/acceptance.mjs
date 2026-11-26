// Prueba de aceptación de punta a punta por HTTP, contra el servidor real (next start) y una base SQLite temporal.
// Uso: npm run build && npm run test:acceptance
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.ACCEPTANCE_PORT || 3123);
const BASE = `http://127.0.0.1:${PORT}`;
const dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'amano-')), 'acceptance.db');
let server;
let failures = 0;
const results = [];

function start() {
  server = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '-p', String(PORT), '-H', '127.0.0.1'], {
    cwd: root, env: { ...process.env, AMANO_DB_PATH: dbFile }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stderr.on('data', (d) => process.env.DEBUG && process.stderr.write(d));
  return waitUp();
}
async function waitUp() {
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(`${BASE}/api/estado`); if (r.ok) return; } catch { /* todavía no */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('El servidor no arrancó');
}
function stop() {
  return new Promise((resolve) => { server.once('exit', resolve); server.kill('SIGTERM'); });
}

async function login(como) {
  const r = await fetch(`${BASE}/api/demo/entrar?como=${como}`, { redirect: 'manual' });
  return r.headers.get('set-cookie').split(';')[0];
}
async function action(cookie, action, payload = {}) {
  const r = await fetch(`${BASE}/api/accion`, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ action, ...payload }) });
  return { status: r.status, body: await r.json() };
}
async function control(op) {
  const r = await fetch(`${BASE}/api/demo/control`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op }) });
  return r.json();
}
async function html(cookie, p) {
  return (await fetch(`${BASE}${p}`, { headers: cookie ? { cookie } : {} })).text();
}
async function saldo(cookie) {
  const page = await html(cookie, '/persona');
  const m = /data-testid="saldo">\$\s?([\d.]+)</.exec(page);
  if (!m) throw new Error('No encontré el saldo en la billetera');
  return Number(m[1].replace(/\./g, ''));
}
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}
const fmt = (n) => `$ ${n.toLocaleString('es-AR')}`;
async function expectSaldo(cookie, step, expected) {
  const got = await saldo(cookie);
  check(step, got === expected, `esperado ${fmt(expected)}, billetera muestra ${fmt(got)}`);
}

try {
  await start();
  const dani = await login('persona:p_dani');
  const marta = await login('referente:r_marta');
  const julian = await login('referente:r_julian');
  const tokenMatch = /\/a\/([A-Za-z0-9_-]{16,})/.exec(await html(dani, '/persona/aportes'));
  const token = tokenMatch[1];

  console.log('\nTabla de aceptación del brief');
  await expectSaldo(dani, '1. Demo limpia con una carga base', 15000);
  const compra = await action(dani, 'comprar', { productId: 'pr_ana_plato', idempotencyKey: 'acept-compra-0001' });
  await expectSaldo(dani, '2. Comprar el plato de Comedor de Ana por $ 4.500', 10500);
  // "Otra sesión": sin cookie, solo el enlace público.
  const ap = await fetch(`${BASE}/api/publico/aporte`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, amount: 2000, idempotencyKey: 'acept-aporte-0001' }) });
  check('   el aporte responde sin datos de la billetera', ap.ok && !('balance' in (await ap.json())));
  await expectSaldo(dani, '3. Aporte de $ 2.000 desde el enlace público en otra sesión', 12500);
  const elegido = await action(dani, 'elegirPaso', { templateId: 't_dni' });
  const stepId = elegido.body.result.id;
  await action(dani, 'yaFui', { stepId });
  await expectSaldo(dani, '4. Elegir el paso del DNI y tocar “Ya fui”', 12500);
  const conf = await action(marta, 'confirmar', { stepId });
  check('   confirmación de Marta aceptada', conf.status === 200);
  await expectSaldo(dani, '5. Confirmar desde el panel de su referente', 15500);
  const reconf = await action(marta, 'confirmar', { stepId });
  check('   el reintento no vuelve a acreditar', reconf.status === 200 && reconf.body.result.alreadyCredited === true);
  await expectSaldo(dani, '6. Reintentar confirmar y recargar la pantalla', 15500);
  await control('avanzar');
  await control('procesar');
  await expectSaldo(dani, '7. Avanzar una semana financiada y procesar su carga', 30500);
  const again = await control('procesar');
  check('   el reintento de carga no acredita nada', again.result.credited.length === 0);
  await expectSaldo(dani, '8. Reintentar la carga de la misma semana', 30500);

  const paso = await html(dani, `/persona/pasos/${stepId}`);
  check('   pantalla final “Recibiste $ 3.000. Ya está en tu saldo disponible.”', paso.includes('Recibiste $ 3.000') && paso.includes('Ya está en tu saldo disponible.'));

  console.log('\nVerificaciones adicionales');
  const dup = await action(dani, 'comprar', { productId: 'pr_ana_plato', idempotencyKey: 'acept-compra-0001' });
  check('Operación duplicada (misma clave) no debita otra vez', dup.status === 200 && dup.body.result.replay === true && dup.body.result.movementId === compra.body.result.movementId);
  await expectSaldo(dani, '   saldo sin cambios tras el duplicado', 30500);
  const caro = await action(dani, 'comprar', { productId: 'pr_rop_campera', idempotencyKey: 'acept-campera-01' });
  check('Saldo insuficiente: compra de $ 32.000 rechazada', caro.status === 409 && caro.body.error === 'saldo_insuficiente', caro.body.message);
  // Dos compras simultáneas que juntas superan el saldo.
  await action(dani, 'comprar', { productId: 'pr_puente_mila', idempotencyKey: 'acept-mila-00001' }); // 30.500 - 5.200 = 25.300
  const conc = await Promise.all(Array.from({ length: 8 }, (_, i) => action(dani, 'comprar', { productId: 'pr_ana_plato', idempotencyKey: `acept-conc-000${i}` })));
  const okConc = conc.filter((r) => r.status === 200).length;
  const after = await saldo(dani);
  check('Compras simultáneas nunca dejan saldo negativo', after >= 0 && okConc === 5 && after === 25300 - 5 * 4500, `${okConc} de 8 aceptadas, saldo ${fmt(after)}`);

  const s2 = (await action(dani, 'elegirPaso', { templateId: 't_salud' })).body.result.id;
  await action(dani, 'yaFui', { stepId: s2 });
  const asDani = await action(dani, 'confirmar', { stepId: s2 });
  const asJulian = await action(julian, 'confirmar', { stepId: s2 });
  check('Rol incorrecto: la persona no puede aprobar su paso', asDani.status === 403, asDani.body.message);
  check('Rol incorrecto: un referente no asignado no puede aprobar', asJulian.status === 403, asJulian.body.message);
  const noRole = await fetch(`${BASE}/api/accion`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'confirmar', stepId: s2 }) });
  check('Sin rol: la aprobación se rechaza', noRole.status === 401);
  await action(marta, 'pedirInfo', { stepId: s2, note: 'Contame en qué centro fue' });
  await action(dani, 'reenviar', { stepId: s2, note: 'Centro barrial' });
  await action(marta, 'confirmar', { stepId: s2 });

  const pub = await html(null, `/a/${token}`);
  const leaks = ['Base semanal', 'Movimientos', 'AM-2048-0137', 'Tramitar', 'Visitar un centro', 'Marta', 'Red Abrigo', '15.000', 'saldo', 'Demo</strong>', 'Cambiar de rol'];
  const found = leaks.filter((l) => pub.includes(l));
  check('Privacidad del enlace público (sin saldo, identidad, organización, hitos, movimientos ni selector de rol)', found.length === 0 && pub.includes('Aportá a Dani'), found.join(', '));
  const bad = await fetch(`${BASE}/api/publico/aporte`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, amount: -500, idempotencyKey: 'acept-negativo-1' }) });
  check('Aporte con monto inválido rechazado', bad.status === 400);

  const before = await saldo(dani);
  const s3 = (await action(dani, 'elegirPaso', { templateId: 't_aloj' })).body.result.id;
  const future = new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10);
  const rep = await action(dani, 'reprogramar', { stepId: s3, scheduledAt: `${future}T15:30` });
  await action(dani, 'pausar', { stepId: s3 });
  await action(dani, 'retomar', { stepId: s3 });
  check('Reprogramar y pausar sin pérdida de saldo', rep.status === 200 && (await saldo(dani)) === before, `${fmt(before)} → ${fmt(await saldo(dani))}`);

  const final = await saldo(dani);
  await stop();
  await start();
  const dani2 = await login('persona:p_dani');
  check('Persistencia después de reiniciar el servidor', (await saldo(dani2)) === final, fmt(final));
  const s3state = (await html(dani2, `/persona/pasos/${s3}`)).includes('Elegido');
  check('   el paso reprogramado sigue en curso tras reiniciar', s3state);
} catch (e) {
  failures++;
  console.error('✗ Error inesperado:', e);
} finally {
  if (server && server.exitCode === null) await stop();
  fs.rmSync(path.dirname(dbFile), { recursive: true, force: true });
}

console.log(`\n${results.length - failures} de ${results.length} verificaciones OK`);
process.exit(failures ? 1 : 0);
