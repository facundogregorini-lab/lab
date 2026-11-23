# Estante

Registro personal de libros, películas, documentales y podcasts. Se abre en `/estante/` y está pensado para el celular: se puede instalar como app desde el navegador (Android: "Instalar app"; iPhone: Compartir → "Agregar a inicio"). Es un sitio estático (`index.html`, `styles.css`, `app.js`), sin compilación.

## Qué tiene

- **Inicio**: lo que estás leyendo, viendo o escuchando (con progreso), los terminados del año por tipo y lo próximo de tu lista.
- **Biblioteca**: grilla de portadas con filtros por tipo y estado (terminados, en curso, pendientes) y buscador por título, autor o etiqueta.
- **Ficha**: estado, progreso (página en libros, porcentaje en lo demás), puntaje de 1 a 5, fechas de inicio y fin, nota y etiquetas.
- **Agregar**: buscás y la portada y los datos se completan solos. Libros desde Google Books y Open Library (también por ISBN, y en Android se puede escanear el código de barras); películas y documentales desde Wikidata (con el póster de Wikipedia), y podcasts (programas y episodios) desde la búsqueda de Apple. Si algo no aparece, se carga a mano.
- **Tu año**: total de terminados, reparto por tipo, gráfico por mes, páginas y horas, y lo mejor puntuado.
- **Descubrir**: best sellers por categoría (desarrollo personal, biografías, ciencia, medicina y salud, psicología, negocios, historia, filosofía, novela, policiales, ciencia ficción y fantasía, clásicos) y **Para vos**: recomendaciones de libros según los que terminaste y su puntaje, con el porqué de cada una.
- **Perfil** (desde el avatar del inicio): cuenta, instalación y copia de seguridad (bajar e importar un JSON).

## Datos

Todo se guarda en el navegador (`localStorage`). Con la cuenta del Lab (`/api/auth`) también se guarda en Redis vía `/api/estante` y se sincroniza entre dispositivos: cada título tiene `updatedAt` y, al fusionar, gana el cambio más nuevo. Lo borrado queda como marca para que no reaparezca desde otro dispositivo.

`GET /api/estante?q=texto&tipo=libro|peli|doc|pod` es la búsqueda (no requiere cuenta, se cachea un día en Vercel). Opcional: `GOOGLE_BOOKS_KEY` en Vercel si Google Books empieza a limitar las búsquedas sin clave.

## IA (Descubrir)

Las listas por categoría las arma la IA a partir de los libros más vendidos y leídos en español, y cada libro se busca en Open Library para sumar portada y páginas. Se generan una vez por mes por categoría y quedan en Redis, así que cuestan casi nada. Las recomendaciones requieren cuenta, usan los libros guardados en el servidor y tienen un tope de 6 por día por persona.

Sin IA disponible, Descubrir sigue funcionando: las listas salen de lo más leído en Open Library (temas exactos, obras con edición en español, título y tapa de esa edición) y las recomendaciones, de los temas de los libros mejor puntuados. Esas listas se guardan 6 horas y después se vuelve a intentar con IA.

Usa `ANTHROPIC_API_KEY` si está cargada; si no, el AI Gateway de Vercel con el token OIDC del proyecto (no hace falta configurar nada). Modelo: Claude Haiku 5.5 (`ESTANTE_IA_MODEL` / `ESTANTE_GATEWAY_MODEL` para cambiarlo). El código está en `api/_estante_ia.js`.

## Pruebas

`node tests/estante.cjs` (incluido en `npm test`) levanta el sitio con la API en memoria y búsqueda simulada (`ESTANTE_FAKE=1`), y prueba agregar, ficha, biblioteca, tu año, borrar y deshacer, y la sincronización entre dos dispositivos.
