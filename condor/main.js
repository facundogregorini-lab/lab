/* Condor · site behaviour: hero scene, drone HUD, topographic cards, ES/EN, contact form. No dependencies. */

/* ======================================================================
   SETTINGS. Edit these values; nothing else needs to change.
   ====================================================================== */
const SITE = {
  email: '',            // where the contact form sends requests, e.g. 'hello@yourdomain.com'
  formEndpoint: '',     // optional: a Formspree/Basin URL to receive the form without opening the email app
  instagram: '',        // handle without @, e.g. 'condor.aerials'
  whatsapp: '',         // number with country code, digits only, e.g. '16045551234'
  heroVideo: {          // the hero loop; set to null to show only the illustrated scene
    wide: 'assets/video/hero-1080.mp4',       // large screens
    medium: 'assets/video/hero-720.mp4',      // laptops and tablets
    portrait: 'assets/video/hero-portrait.mp4', // phones held upright
    poster: 'assets/video/hero-poster.jpg',
    posterPortrait: 'assets/video/hero-poster-portrait.jpg',
  },
  showreel: '',         // optional: the showreel video, e.g. 'assets/showreel.mp4' or a direct .mp4 URL
};

const ES = {
  'skip': 'Saltar al contenido',
  'nav.work': 'Lugares', 'nav.services': 'Servicios', 'nav.process': 'Proceso', 'nav.story': 'Historia', 'nav.cta': 'Reservá un vuelo',
  'hero.eyebrow': 'Filmación y fotografía aérea · Vancouver, BC',
  'hero.title': 'La costa oeste,<br>desde una perspectiva más alta.',
  'hero.lead': 'Video y fotografía con dron, con calidad de cine, para marcas, inmobiliarias, eventos y aventura en Vancouver, el Sea-to-Sky y el Fraser Valley.',
  'hero.cta1': 'Reservá un vuelo', 'hero.cta2': 'Dónde volamos',
  'work.kicker': '01 · Bitácora de vuelo', 'work.title': 'Dónde volamos',
  'work.lead': 'De los rascacielos del puerto a los fiordos alimentados por glaciares: la región de Vancouver es uno de los lugares más cinematográficos del planeta para filmar desde el aire. Estos son los lugares en nuestro plan de vuelo.',
  'work.reel': 'Showreel 2026',
  'work.reelSoon': 'El primer corte está en producción. Seguí los primeros vuelos en Instagram.',
  'work.reelReady': 'Mirá el reel completo.',
  'place.vancouver': 'Rascacielos, hidroaviones y la ciudad en la hora azul.',
  'place.north': 'Bosques nativos que suben directo desde el océano.',
  'place.howe': 'El fiordo más austral de Norteamérica, isla por isla.',
  'place.squamish': 'Paredes de granito, escaladores y kitesurf en el Spit.',
  'place.fraser': 'Campos, ríos y cultivos en la hora dorada.',
  'place.sunshine': 'Calas, ferris y costa sin fin.',
  'work.note': 'Antes de despegar revisamos cada lugar contra el espacio aéreo de NAV CANADA y las normas de parques y municipios. Algunos lugares necesitan autorización especial y otros son zonas de exclusión aérea: te lo decimos desde el principio.',
  'services.kicker': '02 · Servicios', 'services.title': 'Qué filmamos',
  'services.lead': 'Un piloto, una cámara en el cielo y una historia contada desde arriba. Contanos para qué lo necesitás y armamos el vuelo a medida.',
  'svc.re.t': 'Inmuebles y arquitectura', 'svc.re.d': 'Propiedades que muestran la vista, el terreno y el barrio, no solo la cocina.',
  'svc.brand.t': 'Marcas y turismo', 'svc.brand.d': 'Tomas de apertura y momentos clave para marcas, hoteles, bodegas y destinos.',
  'svc.events.t': 'Bodas y eventos', 'svc.events.d': 'El lugar, la costa y todos juntos, desde un ángulo que ningún invitado puede lograr.',
  'svc.build.t': 'Obras y avance', 'svc.build.d': 'Vuelos repetibles desde los mismos puntos para documentar una obra mes a mes.',
  'svc.adv.t': 'Outdoor y aventura', 'svc.adv.d': 'Trail running, bicis, botes y tablas, seguidos desde arriba a través del paisaje.',
  'svc.social.t': 'Contenido para redes', 'svc.social.d': 'Reels verticales y edits cortos pensados para Instagram y TikTok desde el primer cuadro.',
  'spec.4k': 'Másters entregados en 4K', 'spec.vertical': 'Cortes verticales para redes', 'spec.photo': 'Fotos en alta resolución', 'spec.legal': 'Dentro de los límites de Canadá',
  'process.kicker': '03 · Proceso', 'process.title': 'Del brief al corte final',
  'step1.t': 'Brief', 'step1.d': 'Contanos el lugar, la historia y la fecha límite. Te respondemos con un plan y un presupuesto.',
  'step2.t': 'Plan', 'step2.d': 'Espacio aéreo, permisos, clima, mareas y el ángulo del sol, todo revisado antes de salir.',
  'step3.t': 'Vuelo', 'step3.d': 'Filmamos con la mejor luz, con varias pasadas y ángulos, y fotos mientras estamos arriba.',
  'step4.t': 'Entrega', 'step4.d': 'Material editado y con corrección de color, listo para la web, la pantalla grande y el celular.',
  'story.kicker': '04 · Historia', 'story.title': 'De los Andes a las Coast Mountains.',
  'story.p1': 'El cóndor andino es una de las aves voladoras más grandes del planeta, con alas que llegan a 3,3 metros. Casi no las bate: lee el viento, sube con las térmicas y ve la cordillera entera de una vez.',
  'story.p2': 'Condor nació en Argentina y despegó en Vancouver. El Sol de Mayo y la hoja de arce comparten el mismo emblema porque este proyecto es las dos cosas: ojos del sur mirando el noroeste del Pacífico desde arriba.',
  'contact.kicker': '05 · Contacto', 'contact.title': 'Planeemos tu vuelo.',
  'contact.lead': 'Contanos dónde y cuándo. Te respondemos qué se puede hacer en ese espacio aéreo, cuál es la mejor luz para la toma y un presupuesto.',
  'form.name': 'Nombre', 'form.email': 'Email', 'form.type': 'Proyecto', 'form.date': 'Fecha (aprox.)', 'form.where': 'Lugar', 'form.msg': 'Contanos más', 'form.send': 'Enviar consulta',
  'opt.re': 'Inmuebles y arquitectura', 'opt.brand': 'Video de marca o turismo', 'opt.events': 'Boda o evento', 'opt.build': 'Avance de obra', 'opt.adv': 'Outdoor y aventura', 'opt.social': 'Contenido para redes', 'opt.other': 'Otra cosa',
  'facts.area.t': 'Cobertura', 'facts.area.d': 'Metro Vancouver · Sea-to-Sky · Fraser Valley · Sunshine Coast',
  'facts.lang.t': 'Idiomas', 'facts.out.t': 'Recibís', 'facts.out.d': 'Video editado, fotos y cortes verticales para redes',
  'footer.based': 'Con base en Vancouver, Columbia Británica',
};

const MSG = {
  en: {
    missing: 'Please fill in your name, a valid email and a few words about the project.',
    opening: 'Opening your email app with the request ready to send…',
    sending: 'Sending…', sent: 'Thanks! Your request is on its way. We usually reply within a day.',
    failed: 'That didn\'t go through. Please try again or write to us directly.',
    noEmail: 'The contact email isn\'t set up yet. Please reach out on social media for now.',
    subject: 'Flight request', title: 'Condor · Aerial film & photography in Vancouver', langLabel: 'Cambiar a español',
  },
  es: {
    missing: 'Completá tu nombre, un email válido y unas palabras sobre el proyecto.',
    opening: 'Abriendo tu app de email con la consulta lista para enviar…',
    sending: 'Enviando…', sent: '¡Gracias! Tu consulta ya está en camino. Solemos responder en el día.',
    failed: 'No se pudo enviar. Probá de nuevo o escribinos directo.',
    noEmail: 'El email de contacto todavía no está configurado. Por ahora escribinos por redes.',
    subject: 'Consulta de vuelo', title: 'Condor · Filmación y fotografía aérea en Vancouver', langLabel: 'Switch to English',
  },
};

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('js');

/* ---------- Small helpers ---------- */
function rng(seed) {                       // mulberry32: deterministic, so every visit draws the same landscape
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const svgNS = 'http://www.w3.org/2000/svg';
function el(tag, attrs = {}, parent) {
  const node = document.createElementNS(svgNS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.append(node);
  return node;
}

/* ======================================================================
   HERO SCENE: Coast Mountains at dawn, the harbour and the city, in layers.
   ====================================================================== */
function ridge(rand, yBase, peaks, height, jag) {
  // A handful of peaks with sharp, slightly asymmetric flanks, roughened by midpoint displacement.
  const tops = Array.from({ length: peaks }, () => ({
    x: -60 + rand() * 1720, h: height * (.45 + rand() * .55),
    wl: 120 + rand() * 260, wr: 120 + rand() * 260,
  }));
  const at = (x) => {
    let lift = 0;
    for (const p of tops) {
      const d = x < p.x ? (p.x - x) / p.wl : (x - p.x) / p.wr;
      if (d < 1) lift = Math.max(lift, p.h * Math.pow(1 - d, 1.35));
    }
    return yBase - lift;
  };
  let pts = [];
  for (let x = -120; x <= 1720; x += 40) pts.push([x, at(x)]);
  let d = jag;
  for (let i = 0; i < 3; i++) {
    const next = [];
    for (let j = 0; j < pts.length - 1; j++) {
      const [x0, y0] = pts[j], [x1, y1] = pts[j + 1];
      next.push(pts[j], [(x0 + x1) / 2, (y0 + y1) / 2 + (rand() - .5) * d]);
    }
    next.push(pts[pts.length - 1]);
    pts = next;
    d *= .55;
  }
  return pts;
}
function ridgePath(pts) {
  return 'M-120,1000 L' + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L') + ' L1720,1000 Z';
}
function snowPath(pts, line, rand) {
  // Snow follows the ridge down from each summit and ends in a ragged edge, never a straight cut.
  const lower = pts.map(([x, y]) => [x, y < line ? Math.min(line + 6, y + (line - y) * (.55 + rand() * .35)) : y]);
  return 'M' + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L') + ' L' +
    lower.reverse().map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L') + ' Z';
}

function buildScene(host) {
  const svg = el('svg', { viewBox: '0 0 1600 900', preserveAspectRatio: 'xMidYMax slice' }, host);
  const defs = el('defs', {}, svg);

  const glow = el('radialGradient', { id: 'g-sun', cx: '.5', cy: '.5', r: '.5' }, defs);
  el('stop', { offset: '0', 'stop-color': '#ffe2a8', 'stop-opacity': '.95' }, glow);
  el('stop', { offset: '.25', 'stop-color': '#f6b65a', 'stop-opacity': '.55' }, glow);
  el('stop', { offset: '1', 'stop-color': '#f0a93b', 'stop-opacity': '0' }, glow);
  const blur = el('filter', { id: 'f-cloud', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
  el('feGaussianBlur', { stdDeviation: '18' }, blur);

  const layers = [];
  const add = (depth) => { const g = el('g', { class: 'layer' }, svg); g.dataset.depth = depth; layers.push(g); return g; };

  // Stars fading into the dawn
  const stars = add(.02);
  const r = rng(2026);
  for (let i = 0; i < 90; i++) {
    el('circle', { cx: r() * 1600, cy: r() * 360, r: (r() * 1.1 + .3).toFixed(2), fill: '#fff', opacity: (r() * .6 * (1 - i / 120)).toFixed(2) }, stars);
  }

  // Sun and its glow, low on the horizon behind the peaks
  const sun = add(.06);
  el('circle', { cx: 1130, cy: 640, r: 360, fill: 'url(#g-sun)' }, sun);
  el('circle', { cx: 1130, cy: 640, r: 46, fill: '#ffd78c' }, sun);

  // Clouds drifting
  const clouds = add(.1);
  clouds.setAttribute('filter', 'url(#f-cloud)');
  [[260, 300, 260, 34, .22], [980, 240, 340, 30, .18], [1420, 380, 220, 26, .2], [620, 430, 300, 22, .14]].forEach(([cx, cy, rx, ry, o], i) => {
    const c = el('ellipse', { cx, cy, rx, ry, fill: '#dbe9f7', opacity: o }, clouds);
    if (!reduceMotion) c.style.animation = `drift ${70 + i * 18}s linear infinite alternate`;
  });

  // Mountain ranges, from hazy and far to dark and close
  const ranges = [
    { y: 610, peaks: 9, height: 250, jag: 22, top: '#7c9dbf', bottom: '#b3a58f', depth: .12, seed: 3, snow: .82 },
    { y: 670, peaks: 8, height: 220, jag: 22, top: '#55799f', bottom: '#6d8299', depth: .2, seed: 8, snow: .72 },
    { y: 730, peaks: 7, height: 160, jag: 18, top: '#2f5880', bottom: '#3a536f', depth: .3, seed: 13 },
    { y: 785, peaks: 6, height: 100, jag: 12, top: '#18365a', bottom: '#162a42', depth: .42, seed: 21 },
  ];
  ranges.forEach((m, i) => {
    const g = add(m.depth);
    const grad = el('linearGradient', { id: `g-m${i}`, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: '0', 'stop-color': m.top }, grad);
    el('stop', { offset: '1', 'stop-color': m.bottom }, grad);
    const rr = rng(m.seed);
    const pts = ridge(rr, m.y, m.peaks, m.height, m.jag);
    el('path', { d: ridgePath(pts), fill: `url(#g-m${i})` }, g);
    if (m.snow) {                                  // snow on the high, distant peaks
      const top = Math.min(...pts.map(p => p[1]));
      el('path', { d: snowPath(pts, top + (m.y - top) * (1 - m.snow), rr), fill: '#eef4fa', opacity: i ? .62 : .8 }, g);
    }
  });

  // The harbour: water, a skyline with lit windows, and the shimmer of dawn on the water
  const city = add(.5);
  const water = el('linearGradient', { id: 'g-water', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  el('stop', { offset: '0', 'stop-color': '#3f6e98' }, water);
  el('stop', { offset: '.4', 'stop-color': '#16304d' }, water);
  el('stop', { offset: '1', 'stop-color': '#07111e' }, water);
  el('rect', { x: -120, y: 790, width: 1840, height: 220, fill: 'url(#g-water)' }, city);
  const rc = rng(77);
  for (let i = 0; i < 26; i++) {
    const w = 60 + rc() * 220, x = 900 + rc() * 520 - w / 2, y = 800 + i * 4 + rc() * 4;
    el('rect', { x, y, width: w, height: 1.4, fill: '#ffd78c', opacity: (.5 - i * .017).toFixed(2), class: 'shimmer' }, city);
  }
  const rb = rng(404);
  let x = 760;
  const towers = el('g', { fill: '#0b1a2c' }, city);
  const lights = el('g', { fill: '#ffcf7a' }, city);
  while (x < 1260) {
    const w = 14 + rb() * 22, h = 18 + rb() * rb() * 150 * (1 - Math.abs(x - 1000) / 330);
    el('rect', { x: x.toFixed(1), y: (792 - h).toFixed(1), width: w.toFixed(1), height: (h + 2).toFixed(1) }, towers);
    for (let wy = 792 - h + 6; wy < 786; wy += 7) for (let wx = x + 4; wx < x + w - 3; wx += 6) {
      if (rb() < .16) el('rect', { x: wx.toFixed(1), y: wy.toFixed(1), width: 2, height: 2, opacity: (.5 + rb() * .5).toFixed(2) }, lights);
    }
    x += w + 2 + rb() * 6;
  }

  // Foreground conifers that fall away as the camera climbs
  const trees = add(.9);
  const rt = rng(9);
  const tree = (cx, base, h) => {
    const w = h * .32;
    let d = `M${cx},${base - h}`;
    for (let k = 1; k <= 6; k++) {
      const t = k / 6, y = base - h + h * t * .92;
      d += ` L${cx + w * t * (1 + rt() * .25)},${y} L${cx + w * t * .45},${y - h * .04}`;
    }
    d += ` L${cx + 3},${base} L${cx - 3},${base}`;
    for (let k = 6; k >= 1; k--) {
      const t = k / 6, y = base - h + h * t * .92;
      d += ` L${cx - w * t * .45},${y - h * .04} L${cx - w * t * (1 + rt() * .25)},${y}`;
    }
    el('path', { d: d + ' Z', fill: '#040b14' }, trees);
  };
  [[-10, 300], [60, 380], [130, 260], [1480, 340], [1560, 420], [1400, 240], [1630, 300]].forEach(([cx, h]) => tree(cx, 940, h));
  el('rect', { x: -120, y: 900, width: 1840, height: 120, fill: '#040b14' }, trees);

  return layers;
}

/* Real footage over the drawn scene. The scene stays underneath as the fallback: before the first
   frame, when the video can't load, and when the visitor asks for less motion or to save data. */
function addHeroVideo(host) {
  const hv = SITE.heroVideo;
  if (!hv) return null;
  const portrait = window.matchMedia('(orientation: portrait) and (max-width: 820px)').matches;
  const saveData = navigator.connection && navigator.connection.saveData;
  const v = document.createElement('video');
  v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
  v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
  v.poster = portrait ? hv.posterPortrait : hv.poster;
  v.className = 'hero-video';
  host.append(v);
  if (reduceMotion || saveData) { v.classList.add('ready'); return v; }   // poster only, no autoplay
  v.src = portrait ? hv.portrait : (window.innerWidth * (window.devicePixelRatio || 1) > 1600 ? hv.wide : hv.medium);
  v.addEventListener('playing', () => { v.classList.add('ready'); host.classList.add('has-video'); }, { once: true });
  v.addEventListener('error', () => v.remove(), { once: true });
  v.play().catch(() => v.classList.add('ready'));   // autoplay blocked: show the poster frame
  return v;
}

/* Scroll and pointer parallax; the HUD altimeter climbs to the 120 m legal ceiling as you scroll. */
function heroMotion(layers, video) {
  const hero = document.querySelector('.hero');
  const altEl = document.getElementById('alt');
  const tcEl = document.getElementById('tc');
  let px = 0, py = 0, tx = 0, ty = 0, visible = true;
  const start = performance.now();

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);
  if (!reduceMotion) window.addEventListener('pointermove', (e) => {
    tx = (e.clientX / innerWidth - .5) * 2;
    ty = (e.clientY / innerHeight - .5) * 2;
  }, { passive: true });

  function frame(now) {
    if (visible) {
      const s = Math.min(1, scrollY / hero.offsetHeight);
      altEl.textContent = String(Math.round(12 + s * 108)).padStart(3, '0');
      if (!reduceMotion) {
        px += (tx - px) * .05; py += (ty - py) * .05;
        if (video) video.style.transform = `translate3d(${(-px * 10).toFixed(1)}px, ${(s * 140).toFixed(1)}px, 0) scale(${(1.06 + s * .08).toFixed(3)})`;
        if (!video || !video.classList.contains('ready')) for (const g of layers) {
          const d = +g.dataset.depth;
          g.setAttribute('transform', `translate(${(-px * d * 40).toFixed(2)} ${(s * d * 520 - py * d * 14).toFixed(2)})`);
        }
        const f = Math.floor((now - start) / (1000 / 24));
        const ff = f % 24, ss = Math.floor(f / 24) % 60, mm = Math.floor(f / 1440) % 60, hh = Math.floor(f / 86400);
        tcEl.textContent = [hh, mm, ss, ff].map(n => String(n).padStart(2, '0')).join(':');
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ======================================================================
   TOPOGRAPHIC MAPS: contour lines and a flight path, one per location.
   ====================================================================== */
const PALETTES = {
  sky:     { bg: ['#0e2d4c', '#081627'], line: '143,208,251' },
  night:   { bg: ['#101a38', '#060b18'], line: '240,169,59' },
  forest:  { bg: ['#0d2c27', '#061411'], line: '120,214,168' },
  granite: { bg: ['#262b35', '#0c0f14'], line: '214,222,234' },
  gold:    { bg: ['#2d2410', '#110d05'], line: '240,190,96' },
  ocean:   { bg: ['#0a3040', '#05141c'], line: '110,214,226' },
};

function noise2(seed) {
  const r = rng(seed);
  const perm = new Uint8Array(512), vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) { perm[i] = i; vals[i] = r(); }
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  const v = (x, y) => vals[perm[(x & 255) + perm[y & 255]]];
  const sm = t => t * t * (3 - 2 * t);
  const base = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi);
    const a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
  return (x, y) => {
    let sum = 0, amp = 1, f = 1, norm = 0;
    for (let o = 0; o < 4; o++) { sum += base(x * f, y * f) * amp; norm += amp; amp *= .5; f *= 2.03; }
    return sum / norm;
  };
}

function drawTopo(canvas) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const seed = +canvas.dataset.seed || 1;
  const pal = PALETTES[canvas.dataset.hue] || PALETTES.sky;

  const bg = ctx.createLinearGradient(0, 0, w * .4, h);
  bg.addColorStop(0, pal.bg[0]); bg.addColorStop(1, pal.bg[1]);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

  // light map grid
  ctx.strokeStyle = `rgba(${pal.line},.06)`; ctx.lineWidth = 1;
  for (let gx = 0; gx < w; gx += 48) { ctx.beginPath(); ctx.moveTo(gx + .5, 0); ctx.lineTo(gx + .5, h); ctx.stroke(); }
  for (let gy = 0; gy < h; gy += 48) { ctx.beginPath(); ctx.moveTo(0, gy + .5); ctx.lineTo(w, gy + .5); ctx.stroke(); }

  // height field sampled on a grid, then contours by marching squares
  const n = noise2(seed), cell = 7, scale = 1 / 210;
  const cols = Math.ceil(w / cell) + 1, rows = Math.ceil(h / cell) + 1;
  const f = new Float32Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) f[j * cols + i] = n(i * cell * scale + seed, j * cell * scale);
  const levels = 18;
  for (let l = 1; l < levels; l++) {
    const t = .18 + (l / levels) * .66, major = l % 4 === 0;
    ctx.strokeStyle = `rgba(${pal.line},${major ? .55 : .22})`;
    ctx.lineWidth = major ? 1.3 : .8;
    ctx.beginPath();
    for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
      const a = f[j * cols + i], b = f[j * cols + i + 1], c = f[(j + 1) * cols + i + 1], d = f[(j + 1) * cols + i];
      const k = (a > t ? 8 : 0) | (b > t ? 4 : 0) | (c > t ? 2 : 0) | (d > t ? 1 : 0);
      if (k === 0 || k === 15) continue;
      const x = i * cell, y = j * cell;
      const top = [x + cell * (t - a) / (b - a), y], right = [x + cell, y + cell * (t - b) / (c - b)];
      const bottom = [x + cell * (t - d) / (c - d), y + cell], left = [x, y + cell * (t - a) / (d - a)];
      const seg = (p, q) => { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); };
      switch (k) {
        case 1: case 14: seg(left, bottom); break;
        case 2: case 13: seg(bottom, right); break;
        case 3: case 12: seg(left, right); break;
        case 4: case 11: seg(top, right); break;
        case 5: seg(left, top); seg(bottom, right); break;
        case 6: case 9: seg(top, bottom); break;
        case 7: case 8: seg(left, top); break;
        case 10: seg(left, bottom); seg(top, right); break;
      }
    }
    ctx.stroke();
  }

  // flight path with waypoints
  const r = rng(seed * 97);
  const pts = [[w * (.08 + r() * .1), h * (.25 + r() * .5)], [w * (.35 + r() * .1), h * (.15 + r() * .3)], [w * (.6 + r() * .1), h * (.45 + r() * .35)], [w * (.85 + r() * .08), h * (.2 + r() * .3)]];
  ctx.setLineDash([6, 7]); ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    ctx.bezierCurveTo((x0 + x1) / 2, y0, (x0 + x1) / 2, y1, x1, y1);
  }
  ctx.stroke(); ctx.setLineDash([]);
  pts.forEach(([x, y], i) => {
    ctx.beginPath(); ctx.arc(x, y, i === pts.length - 1 ? 6 : 4, 0, Math.PI * 2);
    ctx.fillStyle = i === pts.length - 1 ? '#f0a93b' : '#fff'; ctx.fill();
    if (i === pts.length - 1) { ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(240,169,59,.5)'; ctx.lineWidth = 1.2; ctx.stroke(); }
  });
}

function initTopos() {
  const canvases = [...document.querySelectorAll('canvas.topo')];
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { drawTopo(e.target); io.unobserve(e.target); e.target.dataset.drawn = '1'; }
  }, { rootMargin: '300px' });
  canvases.forEach(c => io.observe(c));
  let t;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(() => canvases.filter(c => c.dataset.drawn).forEach(drawTopo), 200);
  });
}

/* Real footage: a card with data-poster shows that image; with data-video it opens the player. */
function initMedia() {
  const box = document.getElementById('lightbox'), video = document.getElementById('lightbox-video');
  const open = (src) => { video.src = src; box.hidden = false; video.play().catch(() => {}); document.getElementById('lightbox-close').focus(); };
  const close = () => { video.pause(); video.removeAttribute('src'); video.load(); box.hidden = true; };
  document.getElementById('lightbox-close').addEventListener('click', close);
  box.addEventListener('click', (e) => { if (e.target === box) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !box.hidden) close(); });

  document.querySelectorAll('.place').forEach((card) => {
    const { poster, video: src } = card.dataset;
    if (poster) {
      const img = document.createElement('img');
      img.src = poster; img.alt = ''; img.loading = 'lazy';
      card.querySelector('canvas').replaceWith(img);
    }
    if (src) {
      card.tabIndex = 0; card.setAttribute('role', 'button');
      card.addEventListener('click', () => open(src));
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(src); } });
    }
  });

  if (SITE.showreel) {
    const play = document.getElementById('reel-play');
    play.disabled = false;
    play.addEventListener('click', () => open(SITE.showreel));
    document.getElementById('reel-sub').dataset.i18n = 'work.reelReady';
  }
}

/* ======================================================================
   LANGUAGE: English by default, Spanish for Spanish-speaking browsers.
   ====================================================================== */
const EN = {};
let lang = 'en';
function setLang(next) {
  lang = next;
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const key = node.dataset.i18n;
    if (!(key in EN)) EN[key] = key === 'work.reelReady' ? 'Watch the full reel.' : node.innerHTML;
    node.innerHTML = next === 'es' ? (ES[key] ?? EN[key]) : EN[key];
  });
  document.documentElement.lang = next;
  document.title = MSG[next].title;
  const btn = document.getElementById('lang');
  btn.textContent = next === 'es' ? 'EN' : 'ES';
  btn.setAttribute('aria-label', MSG[next].langLabel);
  try { localStorage.setItem('condor-lang', next); } catch (e) { /* private mode */ }
}
function initLang() {
  let saved = null;
  try { saved = localStorage.getItem('condor-lang'); } catch (e) { /* private mode */ }
  const initial = saved || (/^es\b/i.test(navigator.language || '') ? 'es' : 'en');
  setLang(initial);
  document.getElementById('lang').addEventListener('click', () => setLang(lang === 'es' ? 'en' : 'es'));
}

/* ---------- Navigation ---------- */
function initNav() {
  const nav = document.getElementById('nav'), menu = document.getElementById('menu');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  const setOpen = (open) => {
    nav.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  };
  menu.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
  document.querySelectorAll('#nav-links a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
}

function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || reduceMotion) { items.forEach(i => i.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: .12, rootMargin: '0px 0px -40px' });
  items.forEach((item, i) => { item.style.transitionDelay = `${(i % 3) * 90}ms`; io.observe(item); });
}

/* ---------- Contact ---------- */
const ICONS = {
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.3-4A8 8 0 1 1 8 18.8z"/><path d="M9 9.5c.3 1.7 1.8 3.4 3.6 4.1l1.2-1 1.7.8c-.2 1-1 1.6-2 1.6-3 0-6-3-6-6 0-1 .6-1.8 1.6-2l.8 1.7z"/></svg>',
  email: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
};
function initContact() {
  const list = document.getElementById('socials');
  const add = (href, icon, label) => {
    const li = document.createElement('li');
    li.innerHTML = `<a href="${href}" target="_blank" rel="noopener">${ICONS[icon]}<span></span></a>`;
    li.querySelector('span').textContent = label;
    list.append(li);
  };
  if (SITE.instagram) add(`https://instagram.com/${encodeURIComponent(SITE.instagram)}`, 'instagram', `@${SITE.instagram}`);
  if (SITE.whatsapp) add(`https://wa.me/${SITE.whatsapp.replace(/\D/g, '')}`, 'whatsapp', 'WhatsApp');
  if (SITE.email) add(`mailto:${SITE.email}`, 'email', SITE.email);

  const form = document.getElementById('contact-form'), status = document.getElementById('form-status');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    let ok = true;
    for (const name of ['name', 'email', 'message']) {
      const input = form.elements[name];
      const valid = input.value.trim() !== '' && input.checkValidity();
      input.setAttribute('aria-invalid', String(!valid));
      ok = ok && valid;
    }
    const m = MSG[lang];
    if (!ok) { status.textContent = m.missing; return; }

    if (SITE.formEndpoint) {
      status.textContent = m.sending;
      try {
        const res = await fetch(SITE.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
        if (!res.ok) throw new Error(res.status);
        form.reset(); status.textContent = m.sent;
      } catch (err) { status.textContent = m.failed; }
      return;
    }
    if (!SITE.email) { status.textContent = m.noEmail; return; }
    const body = [
      `${data.name} <${data.email}>`, '',
      `${data.type}`, data.date ? `📅 ${data.date}` : '', data.where ? `📍 ${data.where}` : '', '',
      data.message,
    ].filter((line, i, all) => line !== '' || all[i - 1] !== '').join('\n');
    status.textContent = m.opening;
    location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(`${m.subject}: ${data.type} · ${data.name}`)}&body=${encodeURIComponent(body)}`;
  });
}

/* ---------- Start ---------- */
const style = document.createElement('style');
style.textContent = '@keyframes drift { to { transform: translateX(120px); } } .shimmer { animation: shimmer 4s ease-in-out infinite alternate; } @keyframes shimmer { to { opacity: .1; } }';
document.head.append(style);

const sceneHost = document.getElementById('scene');
const sceneLayers = buildScene(sceneHost);
heroMotion(sceneLayers, addHeroVideo(sceneHost));
initTopos();
initMedia();
initLang();
initNav();
initReveal();
initContact();
document.getElementById('year').textContent = new Date().getFullYear();
