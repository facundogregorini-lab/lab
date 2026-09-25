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

## Accesibilidad

Los controles pueden usarse con Tab. Con foco en la mesa, Enter selecciona la siguiente pieza disponible, las flechas la mueven (Shift permite ajustar en pasos pequeños), Enter la suelta y Escape cancela. Los diálogos retienen el foco y se cierran con Escape. Se respeta `prefers-reduced-motion`.

Los mejores tiempos y la foto elegida se guardan únicamente en `localStorage` del navegador; la foto nunca se sube a ningún servidor. No hay cuentas, backend ni analítica. Las conexiones externas se limitan al motor 3D y las fuentes.

## Publicación

Es un sitio estático. Puede publicarse con GitHub Pages seleccionando la rama que contenga esta edición y la carpeta raíz. Subir el código por sí solo no activa GitHub Pages.

## Pruebas

Requieren Node.js y Playwright. Desde la raíz del repositorio:

```sh
npm install
npx playwright install chromium
npm test
```

La prueba inicia un servidor HTTP local y un navegador temporal. Verifica arrastre real, subida de fotos propias, encaje, victoria, teclado, pistas, reinicios, las cinco dificultades, pantalla móvil, arrastre táctil y manejo de fallos de red. No interactúa con sesiones personales del navegador. Requiere internet para cargar Three.js.
