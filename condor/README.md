# Condor · Filmación y fotografía aérea (Vancouver)

Web de Condor: filmación y fotografía con dron en Vancouver, el Sea-to-Sky, el Fraser Valley y la Sunshine Coast. Es una página estática (`index.html`, `styles.css`, `main.js` y `assets/`), sin compilación ni dependencias.

## Qué tiene

- **Portada con video aéreo y visor de dron**: un loop de ~13 s (montañas sobre un mar de nubes, una cresta nevada y Vancouver desde el aire) con el visor encima: REC, timecode y un altímetro que llega a 120 m (el límite legal en Canadá) al hacer scroll. Debajo hay una ilustración de las Coast Mountains hecha en código, que se ve mientras carga el video, si falla, si la persona pidió "reducir movimiento" o si tiene activado el ahorro de datos.
- **Dónde volamos**: seis lugares, cada uno con un mapa topográfico animado y una ruta de vuelo. Se reemplazan por material real cuando esté listo (ver abajo).
- Servicios, proceso, la historia de la marca (Andes + Canadá) y formulario de contacto.
- **Inglés y español**: el botón **ES/EN** cambia el idioma. Los navegadores en español abren en español.
- Se ve bien en celular, respeta "reducir movimiento" y tiene imagen para compartir en redes (Open Graph).

## Antes de publicar: configuración

Arriba de todo en `main.js`, en `SITE`:

| Ajuste | Para qué |
| --- | --- |
| `email` | A dónde llegan las consultas del formulario (abre la app de email del visitante con el mensaje listo). **Sin esto el formulario no puede enviar.** |
| `formEndpoint` | Opcional. Una URL de [Formspree](https://formspree.io) (o similar) para recibir las consultas sin abrir la app de email. |
| `instagram` | Usuario sin la @. Aparece un botón en Contacto. |
| `whatsapp` | Número con código de país, solo dígitos (ej. `16045551234`). |
| `heroVideo` | Los videos de la portada: `wide` (1080p, pantallas grandes), `medium` (720p), `portrait` (vertical, celulares) y sus imágenes `poster`. Con `null` queda solo la ilustración. |
| `showreel` | Video del showreel. Activa el botón ▶. |

## Agregar material real

En `index.html`, cada lugar es un `<li class="card place" data-video="" data-poster="">`:

- `data-poster="assets/work/squamish.jpg"`: muestra esa foto en lugar del mapa.
- `data-video="assets/work/squamish.mp4"`: al hacer clic se abre el video en un reproductor.

Videos para la web: MP4 H.264, 1080p, menos de ~15 MB para la portada y las tarjetas. Para videos largos lo mejor es subirlos a Vimeo o YouTube y usar su link directo.

## Video de la portada: de dónde sale y cómo cambiarlo

El loop actual es **material de stock**, no filmado por Condor. Son clips de [Mixkit](https://mixkit.co) con la *Stock Video Free License* (uso comercial gratis y sin obligación de citar la fuente): [3365](https://mixkit.co/free-stock-video/beautiful-landscape-of-snowy-mountains-aerial-3365/), [3384](https://mixkit.co/free-stock-video/snow-covered-mountain-above-the-clouds-3384/), [3422](https://mixkit.co/free-stock-video/vancouver-city-seen-from-above-3422/) y [3308](https://mixkit.co/free-stock-video/mist-at-the-base-of-a-snowy-mountain-3308/). Están editados con fundidos y una corrección de color suave. Sirve para mostrar el estilo del producto mientras tanto, pero **no hay que presentarlo como trabajo propio** (en el portfolio, propuestas o redes). Conviene reemplazarlo por tomas propias apenas existan.

Para cambiarlo, exportá tres versiones sin sonido, de 10 a 15 s y en loop, y reemplazá los archivos de `assets/video/`:

```bash
# 16:9 → 1080p y 720p (H.264, sin audio, listo para streaming)
ffmpeg -i master.mov -an -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -movflags +faststart hero-1080.mp4
ffmpeg -i master.mov -vf scale=1280:720 -an -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart hero-720.mp4
# vertical 9:16 para celulares
ffmpeg -i vertical.mov -vf scale=720:1280 -an -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -movflags +faststart hero-portrait.mp4
# posters (primer cuadro que se ve)
ffmpeg -ss 2 -i hero-1080.mp4 -frames:v 1 -vf scale=1280:-1 -q:v 5 hero-poster.jpg
ffmpeg -ss 1 -i hero-portrait.mp4 -frames:v 1 -q:v 5 hero-poster-portrait.jpg
```

Apuntá a menos de 5 MB para el de 1080p: el texto blanco se lee mejor si la toma no es demasiado clara en la mitad izquierda.

## Verlo en local

Abrí `condor/index.html` en el navegador. Publicado (por ejemplo en Vercel, con el repo `lab`), queda en `/condor/`.

## Textos para revisar

- Si el piloto tiene certificado de Transport Canada (Basic o Advanced), conviene sumarlo en "Proceso" o en el pie: da mucha confianza.
- Los lugares y coordenadas son reales de la región. Antes de cada trabajo hay que revisar el espacio aéreo (NAV CANADA, por ejemplo con la app NAV Drone) y las reglas de parques: en muchos parques provinciales y municipales volar requiere permiso o está prohibido.
