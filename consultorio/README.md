# Consultorio Odontológico Dr. Guerra y Dr. Mininni

Web del consultorio (Aráoz 2879, 1° D, Buenos Aires), hecha a partir del boceto `landing-consultorio`. Es una página estática (`index.html`, `styles.css`, `main.js` y `assets/`), sin compilación ni dependencias. Se abre en `/consultorio/`.

## Secciones

- **Portada** con la foto del consultorio, "Desde 1969" y botón directo a WhatsApp con el mensaje listo.
- **El consultorio**: galería (se amplía al tocar) y recorrido en video; los videos cargan y se reproducen solo cuando están en pantalla.
- **Tratamientos**: operatoria, rehabilitación oral (destacada), mantenimiento periodontal y tecnología digital, y cómo es la atención.
- **Planificación digital**: los dos casos (implante inmediato y diseño de sonrisa) en pestañas, paso a paso. Las fotos de la cirugía quedan difuminadas hasta que la persona elige verlas.
- **Casos clínicos**: 20 casos de antes y después con filtros y visor a pantalla completa (flechas del teclado o deslizar en el celular).
- **Equipo**: la historia desde 1969 y los profesionales.
- **Contacto**: WhatsApp, mail, reseñas en Google Maps y mapa.

En el celular, las fotos y los videos del consultorio se deslizan de costado, los casos muestran 6 y el resto con "Ver todos", y una barra fija abajo tiene "Pedir turno" (WhatsApp) y "Cómo llegar"; se esconde al llegar a Contacto.

Respeta "reducir movimiento" y el ahorro de datos, funciona con teclado y tiene datos estructurados (`Dentist`) para buscadores.

## Cambiar contenido

- Teléfono: buscar `5491124037668` en `index.html`.
- Fotos: en `assets/img` y `assets/casos` (WebP). Para sumar un caso, copiar un `<figure data-c="...">` dentro de `#cases`; `data-c` es la categoría del filtro (`blanq`, `oper`, `rehab`).
