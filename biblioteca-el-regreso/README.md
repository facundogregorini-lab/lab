# Biblioteca El Regreso

La biblioteca del campo El Regreso, recreada libro por libro a partir de fotos de los muebles reales. Se abre en `/biblioteca-el-regreso/`. Es un sitio estático (`index.html`, `styles.css`, `decor.js`, `app.js` y `data/`), sin compilación.

## Qué tiene

- **Dos bibliotecas dibujadas** con las molduras, columnas y adornos de los muebles reales (El pensador, la gata Bastet, el caballo, el toro, el microscopio y las sillitas de arriba). Cada lomo tiene el color, el alto, el grosor y la tipografía aproximados del libro real, en el mismo orden de izquierda a derecha.
- **354 libros** con título, autor, año, categoría y tres resúmenes: corto, medio y largo.
- **Al pasar el mouse** por un lomo aparece el resumen del largo elegido. **Al tocarlo o hacer clic** se abre la ficha: tapa en 3D, ubicación exacta (biblioteca, estante y lugar), resumen y el estado de lectura. Con las flechas se pasa al libro de al lado.
- **16 categorías** (historia argentina, biografías, clásicos, campo y veterinaria, etc.) que iluminan los libros en el estante, **buscador** (tecla `/`) y filtro por estado.
- **Leído / Leyendo / Quiero leerlo**: cada libro marcado muestra un señalador de color que asoma por arriba del lomo. Un contador arriba muestra cuántos se leyeron.
- **Cuentas**: se entra con la misma cuenta de los otros proyectos del Lab (`/api/auth`). Las marcas se guardan en `/api/biblioteca`, y en **Estadísticas** y en cada ficha se ve qué leyó cada persona de la familia. Sin cuenta (o donde no hay API, como GitHub Pages) las marcas quedan en el navegador; al entrar se suman a la cuenta.
- **¿Qué leo?** elige al azar un libro no leído, respetando los filtros.
- **Catálogo** en lista ordenable, **Estadísticas** y las **Fotos** originales.
- Cada libro tiene su link: `#libro/montecristo`.

## Corregir o agregar libros

Cada archivo de `data/` es un estante, en orden (`a1.js` es el de arriba de la Biblioteca I). El formato está explicado en `data/core.js`. El campo `q` indica qué tan segura es la identificación: los que tienen `q: 2` o `q: 3` (lomos que no se leen bien en las fotos) aparecen en **Estadísticas → Por confirmar** para revisarlos. Los libros de Javier Gregorini (`fam: true`) tienen resúmenes provisorios para que los complete la familia.

## Pruebas

`node tests/biblioteca.cjs` (incluido en `npm test`) levanta el sitio con la API en memoria y prueba lomos, vista previa, ficha, marcas, búsqueda, categorías, estadísticas, cuenta y celular.
