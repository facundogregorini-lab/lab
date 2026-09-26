# Manuelita · Un pequeño gran viaje

Un rompecabezas 3D en español: de Pehuajó a París, pieza por pieza.

## Jugar

Abrí `index.html` en un navegador moderno con WebGL 2. No requiere instalación ni compilación. Esta edición **necesita internet** para descargar Three.js 0.180.0 desde jsDelivr; las tipografías de Google Fonts son opcionales y tienen fuentes de respaldo.

- Arrastrá una pieza con mouse o dedo: se levanta de la mesa y encaja al acercarse a su lugar.
- Elegí entre 9, 12, 20, 30 o 48 piezas.
- **📷 Tu foto** arma el rompecabezas con una imagen propia (también podés arrastrarla a la mesa). Se recorta al formato 4:3 y queda guardada en tu navegador; el botón 🐢 vuelve a la postal de Manuelita.
- **Guía** superpone la postal completa sobre el tablero.
- **Pista** coloca una pieza; hay tres por partida y los récords se registran solo sin pistas.
- **Vista cenital** alterna entre una cámara inclinada y una vista desde arriba.
- **♫** activa sonidos sintetizados; el juego empieza en silencio.
- El reloj comienza con la primera interacción y se pausa cuando la pestaña está oculta o hay un diálogo abierto.
- Reiniciar o cambiar de dificultad pide confirmación si ya hubo movimientos.

La escena incluye piezas extruidas con bordes dorados, sombras, una miniatura de Manuelita modelada con geometría, la Torre Eiffel y partículas al completar el viaje. La ilustración original se conserva, integrada en el mismo HTML. No se cargan modelos ni imágenes externas.

## Cuentas

Con **👤 Entrar** cada persona crea un usuario y contraseña. Mientras juega, se guardan solos en el servidor la partida en curso (piezas, tiempo, movimientos y pistas), la foto elegida y la lista de rompecabezas terminados, para seguir desde cualquier dispositivo. Sin cuenta, el juego funciona igual que antes.

El servidor son dos funciones de Vercel en `api/` (`auth.js` y `data.js`) y los datos van a una base Redis de Upstash. Las contraseñas se guardan con `scrypt` y salt; las sesiones duran 30 días y hay un límite de 10 intentos fallidos cada 15 minutos por usuario.

### Configurar la base de datos en Vercel

1. En el proyecto de Vercel, abrí **Storage → Create Database** (o **Marketplace**) y elegí **Upstash for Redis** (plan gratuito).
2. Conectala al proyecto. Vercel agrega solo las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN` (también sirven `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`).
3. Volvé a desplegar (**Deployments → Redeploy**) para que las funciones tomen las variables.

Si falta la base, el juego sigue andando sin cuenta y el formulario avisa que falta conectarla.

Para probar localmente sin Vercel: `npm run dev` levanta el sitio y la API en http://127.0.0.1:3000 con una base en memoria.

## Accesibilidad

Los controles pueden usarse con Tab. Con foco en la mesa, Enter selecciona la siguiente pieza disponible, las flechas la mueven (Shift permite ajustar en pasos pequeños), Enter la suelta y Escape cancela. Los diálogos retienen el foco y se cierran con Escape. Se respeta `prefers-reduced-motion`.

Sin cuenta, los mejores tiempos y la foto elegida se guardan únicamente en `localStorage` del navegador. Con cuenta, la partida, la foto y los terminados se guardan en tu base de Upstash. No hay analítica. Las conexiones externas se limitan al motor 3D, las fuentes y la API propia del juego.

## Publicación

Es un sitio estático. Puede publicarse con GitHub Pages seleccionando la rama que contenga esta edición y la carpeta raíz. Subir el código por sí solo no activa GitHub Pages.

## Pruebas

Requieren Node.js y Playwright. Desde la raíz del repositorio:

```sh
npm install
npx playwright install chromium
npm test
```

La prueba inicia un servidor HTTP local y un navegador temporal. Verifica arrastre real, subida de fotos propias, registro, inicio de sesión y guardado de partidas, encaje, victoria, teclado, pistas, reinicios, las cinco dificultades, pantalla móvil, arrastre táctil y manejo de fallos de red. No interactúa con sesiones personales del navegador. Requiere internet para cargar Three.js.
