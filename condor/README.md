# Condor · Filmación y fotografía aérea (Vancouver)

Web de Condor: filmación y fotografía con dron en Vancouver, el Sea-to-Sky, el Fraser Valley y la Sunshine Coast. Es una página estática (`index.html`, `styles.css`, `main.js` y `assets/`), sin compilación ni dependencias.

## Qué tiene

- **Portada tipo visor de dron**: las Coast Mountains al amanecer, el puerto y la ciudad, dibujados en código. Al hacer scroll la cámara "sube" y el altímetro llega a 120 m, el límite legal en Canadá. Tiene timecode corriendo y parallax con el mouse.
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
| `heroVideo` | Opcional. Un video corto y sin sonido para la portada (ej. `assets/hero.mp4`). Reemplaza la ilustración. |
| `showreel` | Video del showreel. Activa el botón ▶. |

## Agregar material real

En `index.html`, cada lugar es un `<li class="card place" data-video="" data-poster="">`:

- `data-poster="assets/work/squamish.jpg"`: muestra esa foto en lugar del mapa.
- `data-video="assets/work/squamish.mp4"`: al hacer clic se abre el video en un reproductor.

Videos para la web: MP4 H.264, 1080p, menos de ~15 MB para la portada y las tarjetas. Para videos largos lo mejor es subirlos a Vimeo o YouTube y usar su link directo.

## Verlo en local

Abrí `condor/index.html` en el navegador. Publicado (por ejemplo en Vercel, con el repo `lab`), queda en `/condor/`.

## Textos para revisar

- Si el piloto tiene certificado de Transport Canada (Basic o Advanced), conviene sumarlo en "Proceso" o en el pie: da mucha confianza.
- Los lugares y coordenadas son reales de la región. Antes de cada trabajo hay que revisar el espacio aéreo (NAV CANADA, por ejemplo con la app NAV Drone) y las reglas de parques: en muchos parques provinciales y municipales volar requiere permiso o está prohibido.
