# Estante

Registro personal de libros, películas, documentales y podcasts. Se abre en `/estante/` y está pensado para el celular: se puede instalar como app desde el navegador (Android: "Instalar app"; iPhone: Compartir → "Agregar a inicio"). Es un sitio estático (`index.html`, `styles.css`, `app.js`), sin compilación.

## Qué tiene

- **Inicio**: lo que estás leyendo, viendo o escuchando (con progreso), los terminados del año por tipo y lo próximo de tu lista.
- **Biblioteca**: grilla de portadas con filtros por tipo y estado (terminados, en curso, pendientes) y buscador por título, autor o etiqueta.
- **Ficha**: estado, progreso (página en libros, porcentaje en lo demás), puntaje de 1 a 5, fechas de inicio y fin, nota y etiquetas.
- **Agregar**: buscás y la portada y los datos se completan solos. Libros desde Google Books y Open Library (también por ISBN, y en Android se puede escanear el código de barras); películas, documentales y podcasts (programas y episodios) desde la búsqueda de Apple. Si algo no aparece, se carga a mano.
- **Tu año**: total de terminados, reparto por tipo, gráfico por mes, páginas y horas, y lo mejor puntuado.
- **Perfil**: cuenta, instalación y copia de seguridad (bajar e importar un JSON).

## Datos

Todo se guarda en el navegador (`localStorage`). Con la cuenta del Lab (`/api/auth`) también se guarda en Redis vía `/api/estante` y se sincroniza entre dispositivos: cada título tiene `updatedAt` y, al fusionar, gana el cambio más nuevo. Lo borrado queda como marca para que no reaparezca desde otro dispositivo.

`GET /api/estante?q=texto&tipo=libro|peli|doc|pod` es la búsqueda (no requiere cuenta, se cachea un día en Vercel). Opcional: `GOOGLE_BOOKS_KEY` en Vercel si Google Books empieza a limitar las búsquedas sin clave.

## Pruebas

`node tests/estante.cjs` (incluido en `npm test`) levanta el sitio con la API en memoria y búsqueda simulada (`ESTANTE_FAKE=1`), y prueba agregar, ficha, biblioteca, tu año, borrar y deshacer, y la sincronización entre dos dispositivos.
