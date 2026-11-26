# A mano · MVP de demo

Billetera de acompañamiento para personas en situación de calle en Buenos Aires. Una persona acreditada por una organización recibe una **base semanal patrocinada**, puede **recibir aportes por QR** y **elegir pasos** que suman extras cuando su referente los confirma. Nada genera deuda.

> **Todo es ficticio.** Personas, organizaciones, comercios, fondos e importes son sintéticos. Los pagos, la emisión de tarjetas y la verificación están simulados. No hay cuentas reales ni credenciales externas.

## Arrancar

Requiere Node 20 o más nuevo.

```bash
cd a-mano
npm install
npm run demo          # compila y abre en http://localhost:3000 (escucha en toda la red local)
```

Para desarrollo: `npm run dev`. La base se crea sola en `data/amano.db` la primera vez.

**Restablecer solo los datos de la demo** (se puede correr con el servidor prendido):

```bash
npm run demo:reset
```

También hay un botón "Restablecer la demo" en `/demo`.

## Rutas

| Rol | Ruta |
|---|---|
| Entrada y selector de rol (solo demo) | `/demo` |
| Persona (Dani) | `/persona` · `/persona/comprar` · `/persona/aportes` · `/persona/pasos` · `/persona/tarjeta` · `/persona/tarjeta/imprimir` |
| Donante (pública, sin selector de rol) | `/a/<token>` (el enlace sale del QR de Dani) |
| Referente (Marta, asignada a Dani) | `/referente` · `/referente/alta` · `/referente/seguimiento` |
| Otro referente (Julián, no asignado) | entrar desde `/demo` |

Accesos directos: `/api/demo/entrar?como=persona:p_dani` y `/api/demo/entrar?como=referente:r_marta`.

## Versión publicada (Vercel)

Proyecto Vercel `a-mano` (raíz `a-mano/`). Ahí la base SQLite se guarda como un único archivo privado en Vercel Blob (`BLOB_READ_WRITE_TOKEN`, ya conectado). Cada escritura lee la última versión, aplica la operación en una transacción y la guarda solo si nadie la cambió en el medio (ETag + `ifMatch`); si chocan dos, reintenta. Así funciona el flujo entre dos teléfonos aunque Vercel use varias instancias. Sin ese token, la app usa el archivo local `data/amano.db`. Para restablecer la demo publicada, usá el botón de `/demo`.

## Escanear el QR desde otro teléfono

El QR usa el origen con el que abriste la app. Si abrís `localhost`, otro teléfono no lo puede abrir (la pantalla lo avisa y sugiere la IP).

1. Computadora y teléfonos en la misma Wi-Fi.
2. `npm run demo` (ya escucha en `0.0.0.0:3000`).
3. Buscá la IP de la computadora: macOS `ipconfig getifaddr en0`, Linux `hostname -I`, Windows `ipconfig`.
4. Abrí la billetera **en esa dirección**, por ejemplo `http://192.168.0.23:3000/demo`, y el QR va a apuntar ahí.
5. Si no hay cámara: "Copiar enlace" y pegalo en otra ventana o navegador.

Si el firewall pregunta, permití conexiones entrantes para Node.

## Pruebas

```bash
npm test                  # reglas monetarias y de hitos (vitest, base en memoria)
npm run build
npm run test:acceptance   # tabla de aceptación del brief por HTTP contra next start, incluido reinicio del servidor
npm run test:mobile       # recorrido completo en Chromium a 390 px con tres "teléfonos" (requiere Playwright)
```

## Cómo está hecho

- **Next.js 15 (App Router) + TypeScript + SQLite** (`better-sqlite3`). Una sola app, una sola base: las tres vistas leen y escriben lo mismo.
- **Saldo = suma del libro de movimientos** (`movements`), en pesos enteros. Nunca se guarda un saldo aparte.
- Reglas en `lib/domain.ts`, todas validadas en el servidor: montos, comercio habilitado y abierto, precio tomado del servidor, rol, referente asignado, transiciones de estado.
- **Idempotencia**: cada compra, aporte, extra y carga tiene una clave única (`idempotency_key UNIQUE`). Doble clic o reintento devuelven la operación original.
- **Concurrencia**: cada operación corre en una transacción `BEGIN IMMEDIATE`; el saldo se revisa dentro de la transacción, así dos compras simultáneas no dejan saldo negativo.
- **Confirmar un hito** cambia el estado y asienta el extra en la misma transacción. Una instancia, un solo extra (`extra_movement_id UNIQUE`).
- **Hitos**: meta elegida (`goals`) → acción verificable (`step_instances.action_title`) → resultado posterior (`outcome_title`, `outcome_reached_at`). El extra se gana con la acción. Estados: elegido, pendiente de confirmación, para revisar, en pausa, extra acreditado, más propuesto (paso propio) y cambiado. Historial en `step_events`.
- **Patrocinio**: fondo ficticio de 4 × $ 15.000 para Dani. Reloj de demo por semanas (`demo_state`). "Procesar cargas" acredita una vez por persona y semana (`UNIQUE(period_id, week_index)`) y no carga semanas sin fondo.
- **Enlace público**: token opaco aleatorio. La página y la API pública solo devuelven el nombre elegido.
- Las pantallas abiertas consultan `/api/estado` cada 3 s y se refrescan si algo cambió (por ejemplo, un aporte desde otro teléfono).

## Decisiones tomadas (reversibles)

- Vive en la carpeta `a-mano/` del repo `lab`. El proyecto Vercel `lab` redirige `/a-mano/*` a su inicio (`vercel.json`); la app se publica como proyecto aparte, `a-mano`.
- Rol de demo por cookie, elegido en `/demo`. No es autenticación real.
- "Ya fui" se acepta en cualquier momento (en un piloto real, a partir de la fecha del turno).
- Un paso en curso por vez. Cambiar de meta cancela el actual sin tocar el saldo.
- Paso propio: lo acuerda el referente con un extra de hasta $ 5.000.
- Aporte máximo de prueba: $ 100.000. La demo acredita el 100 %.
- Comercio "Lavadero Burbujas" figura cerrado para mostrar el bloqueo de compra; "Campera de abrigo" ($ 32.000) sirve para mostrar saldo insuficiente.
- Seguimiento a 90 días con una cohorte histórica ficticia de 20 personas (agosto 2026) y una reciente fuera de plazo. Es descriptivo, sin puntajes individuales.
- Tipografía del sistema (sin fuentes externas) para que arranque sin internet.

## Guion de 3 minutos

1. **0:00 Billetera.** `/demo` → Persona: Dani. Saldo $ 15.000, base semanal, próxima carga y hasta cuándo hay fondos.
2. **0:30 Compra.** Dónde comprar → filtro San Telmo → Comedor de Ana → Plato caliente del día → Confirmar y pagar. Comprobante, quedan $ 10.500.
3. **1:00 Aporte.** Ver mi saldo → Recibir aportes. Escaneá el QR con otro teléfono (o Copiar enlace → otra ventana). Elegí $ 2.000 → Confirmar aporte de prueba. La billetera de Dani pasa sola a $ 12.500. Mostrá que la vista pública no muestra saldo ni datos.
4. **1:40 Paso.** Mis pasos → Tramitar mi DNI (+ $ 3.000) → Elegir este paso. Mostrá la ficha y "Necesito ayuda para ir". Tocá Ya fui: "Pendiente de confirmación", el saldo sigue en $ 12.500.
5. **2:10 Referente.** Cambiar de rol → Referente: Marta. Registrá la resolución del traslado y tocá Confirmar y acreditar + $ 3.000.
6. **2:40 Cierre.** Cambiar de rol → Dani → Mis pasos: "Recibiste $ 3.000. Ya está en tu saldo disponible." → Ver mi saldo: $ 15.500.

Extra si sobra tiempo: en `/demo`, "Avanzar una semana" + "Procesar cargas" lleva a $ 30.500; procesar otra vez no cambia nada.
