// Dibujos de la biblioteca: molduras, vetas de la madera y los adornos que hay en los estantes reales.
(function () {
  const svg = (box, body, cls = '') => `<svg class="${cls}" viewBox="${box}" aria-hidden="true" focusable="false">${body}</svg>`;

  // Veta de roble generada con ruido fractal estirado (horizontal para estantes, vertical para columnas).
  const grain = (fx, fy, seed) => `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='${fx} ${fy}' numOctaves='4' seed='${seed}'/><feColorMatrix values='0 0 0 0 .32  0 0 0 0 .2  0 0 0 0 .1  0 0 0 1.25 -.42'/></filter><rect width='100%' height='100%' filter='url(#g)'/></svg>`)}")`;
  const noise = `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`)}")`;
  const root = document.documentElement.style;
  root.setProperty('--grain-h', grain(0.0035, 0.16, 7));
  root.setProperty('--grain-v', grain(0.16, 0.0035, 3));
  root.setProperty('--paper', noise);

  const woodDefs = id => `<defs>
    <linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d0a676"/><stop offset=".55" stop-color="#b8895a"/><stop offset="1" stop-color="#9a6d43"/></linearGradient>
    <linearGradient id="${id}d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2bd8f"/><stop offset=".4" stop-color="#b98a5a"/><stop offset="1" stop-color="#7d5532"/></linearGradient>
    <filter id="${id}g" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.004 0.12" numOctaves="4" seed="11"/><feColorMatrix values="0 0 0 0 .3  0 0 0 0 .18  0 0 0 0 .08  0 0 0 1.3 -.45"/><feComposite in2="SourceGraphic" operator="in"/></filter>
  </defs>`;

  // Frontón curvo con el medallón central, como el mueble real.
  function pediment(id) {
    const shape = 'M30,178 L30,82 C230,82 345,34 500,34 C655,34 770,82 970,82 L970,178 Z';
    return svg('0 0 1000 192', `${woodDefs(id)}
      <path d="${shape}" fill="url(#${id}w)"/>
      <path d="${shape}" fill="#000" filter="url(#${id}g)"/>
      <path d="M0,80 C215,80 338,24 500,24 C662,24 785,80 1000,80" fill="none" stroke="#7a522e" stroke-width="26" stroke-linecap="round"/>
      <path d="M0,73 C215,73 338,17 500,17 C662,17 785,73 1000,73" fill="none" stroke="url(#${id}d)" stroke-width="17" stroke-linecap="round"/>
      <path d="M0,68 C215,68 338,12 500,12 C662,12 785,68 1000,68" fill="none" stroke="#efd2a6" stroke-opacity=".55" stroke-width="2.5"/>
      <path d="M92,164 L92,120 C200,116 318,104 432,128 L432,164 Z" fill="none" stroke="#7d5532" stroke-opacity=".55" stroke-width="4"/>
      <path d="M908,164 L908,120 C800,116 682,104 568,128 L568,164 Z" fill="none" stroke="#7d5532" stroke-opacity=".55" stroke-width="4"/>
      <path d="M95,162 L95,123 C200,119 318,107 430,131" fill="none" stroke="#f0d3a8" stroke-opacity=".35" stroke-width="2"/>
      <path d="M905,162 L905,123 C800,119 682,107 570,131" fill="none" stroke="#f0d3a8" stroke-opacity=".35" stroke-width="2"/>
      <circle cx="500" cy="116" r="47" fill="#000" fill-opacity=".14"/>
      <circle cx="500" cy="113" r="45" fill="url(#${id}w)" stroke="#7d5532" stroke-opacity=".6" stroke-width="4"/>
      <circle cx="500" cy="113" r="34" fill="none" stroke="#f0d3a8" stroke-opacity=".3" stroke-width="2"/>
      <rect x="-4" y="168" width="1008" height="24" rx="3" fill="url(#${id}d)"/>
      <rect x="-4" y="168" width="1008" height="3.5" fill="#f3d9b3" fill-opacity=".6"/>
      <rect x="-4" y="187" width="1008" height="5" fill="#5e3d20" fill-opacity=".55"/>`, 'pediment');
  }

  // Capitel tallado de las columnas.
  const capital = svg('0 0 60 70', `<defs><linearGradient id="cap" x1="0" x2="1"><stop offset="0" stop-color="#8a6038"/><stop offset=".45" stop-color="#d7b081"/><stop offset="1" stop-color="#8a6038"/></linearGradient></defs>
    <rect x="2" y="0" width="56" height="10" fill="url(#cap)"/>
    <path d="M6,10 C10,26 4,40 12,52 L48,52 C56,40 50,26 54,10 Z" fill="url(#cap)"/>
    <path d="M30,14 C24,24 22,36 30,50 C38,36 36,24 30,14 Z M15,16 C16,30 12,40 18,50 M45,16 C44,30 48,40 42,50" fill="none" stroke="#5e3d20" stroke-opacity=".55" stroke-width="2.2"/>
    <rect x="4" y="52" width="52" height="8" fill="url(#cap)"/><rect x="0" y="60" width="60" height="10" fill="url(#cap)"/>`, 'capital');

  const bronze = `<linearGradient id="bz" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8d8f93"/><stop offset=".35" stop-color="#3b3a3c"/><stop offset=".7" stop-color="#1d1c1e"/><stop offset="1" stop-color="#4b4232"/></linearGradient>`;

  const decor = {
    // El pensador de Rodin, en bronce oscuro, sobre su roca.
    thinker: svg('0 0 170 240', `<defs>${bronze}<radialGradient id="rock" cx=".4" cy=".3"><stop offset="0" stop-color="#6b5a3a"/><stop offset="1" stop-color="#1b1712"/></radialGradient></defs>
      <path d="M48,238 C40,210 60,186 92,178 C120,170 150,180 160,200 C168,218 162,236 156,238 Z" fill="url(#rock)"/>
      <path d="M60,214 C80,204 96,212 112,206 M120,196 C134,192 146,200 150,214" stroke="#c8a96a" stroke-opacity=".35" stroke-width="2" fill="none"/>
      <g stroke="url(#bz)" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="M86,72 C100,98 118,130 128,176" stroke-width="40"/>
        <path d="M126,172 C110,170 84,166 62,162" stroke-width="30"/>
        <path d="M60,162 C58,182 60,200 64,222" stroke-width="20"/>
        <path d="M118,182 C106,188 92,192 86,196 C86,206 88,216 90,226" stroke-width="18"/>
        <path d="M84,80 C70,104 60,128 58,152" stroke-width="17"/>
        <path d="M58,150 C54,128 52,104 56,80" stroke-width="13"/>
        <path d="M100,86 C110,110 112,130 104,150" stroke-width="12"/>
      </g>
      <ellipse cx="66" cy="62" rx="17" ry="19" fill="url(#bz)" transform="rotate(-25 66 62)"/>
      <path d="M52,52 C58,44 70,42 78,48" stroke="#9fa1a5" stroke-opacity=".55" stroke-width="3" fill="none"/>
      <path d="M92,82 C104,104 116,128 124,160" stroke="#a7a9ad" stroke-opacity=".4" stroke-width="4" fill="none"/>
      <path d="M64,222 L54,232 L76,232 Z M90,226 L84,234 L102,234 Z" fill="url(#bz)"/>`, 'decor-svg'),

    // Bastet: la gata egipcia negra sobre su base.
    bastet: svg('0 0 120 250', `<defs><linearGradient id="cat" x1="0" x2="1"><stop offset="0" stop-color="#0d0d0f"/><stop offset=".55" stop-color="#2a2a2e"/><stop offset=".8" stop-color="#3b3b40"/><stop offset="1" stop-color="#121214"/></linearGradient></defs>
      <path d="M30,222 C14,176 24,122 50,96 C57,88 60,80 60,70 L60,42 L64,14 L76,36 L84,16 L86,44 C95,50 99,56 99,61 C95,65 89,67 84,69 C82,84 84,100 86,116 C88,152 90,186 92,220 Z" fill="url(#cat)"/>
      <path d="M30,222 C40,232 70,234 96,226 L96,232 C70,240 40,240 26,230 Z" fill="#1a1a1c"/>
      <path d="M62,78 C70,84 80,84 86,80" stroke="#55565c" stroke-width="2.5" fill="none"/>
      <path d="M64,86 C70,92 78,92 84,88" stroke="#4a4b50" stroke-width="1.6" fill="none"/>
      <path d="M68,104 L74,96 L80,104 L74,112 Z" fill="none" stroke="#4a4b50" stroke-width="1.6"/>
      <circle cx="84" cy="52" r="2.2" fill="#3b3c42"/>
      <path d="M86,120 C88,150 90,180 92,218" stroke="#4a4b52" stroke-opacity=".6" stroke-width="2" fill="none"/>
      <rect x="4" y="226" width="112" height="24" rx="2" fill="#141416"/><rect x="4" y="226" width="112" height="4" fill="#2c2c30"/>`, 'decor-svg'),

    // Cabeza de caballo de cerámica verde agua, sobre una lámina.
    horse: svg('0 0 150 200', `<defs><linearGradient id="hz" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dfe9e3"/><stop offset=".5" stop-color="#a9bfb3"/><stop offset="1" stop-color="#6f8a7c"/></linearGradient></defs>
      <path d="M8,190 L60,168 L148,176 L104,198 Z" fill="#b9c9bf" stroke="#7d968a" stroke-width="1.5"/>
      <path d="M44,176 C40,148 42,124 50,106 C36,102 18,96 12,84 C9,74 15,66 24,64 C34,52 46,36 60,26 L64,8 L73,22 L80,8 L84,28 C102,40 112,70 108,102 C106,130 104,154 104,176 Z" fill="url(#hz)"/>
      <path d="M84,30 C96,48 100,74 98,100" stroke="#eef5f0" stroke-opacity=".7" stroke-width="5" fill="none"/>
      <path d="M26,70 C36,74 46,78 54,90 M30,66 L58,52 M58,52 L66,80" stroke="#6f8a7c" stroke-width="2.4" fill="none"/>
      <circle cx="58" cy="52" r="3.5" fill="none" stroke="#6f8a7c" stroke-width="2"/>
      <circle cx="62" cy="40" r="2.6" fill="#55705f"/>
      <path d="M50,150 C66,156 86,156 102,150 M48,162 C66,168 86,168 104,162" stroke="#7d968a" stroke-width="3" fill="none"/>`, 'decor-svg'),

    // Toro negro de cerámica, con la cabeza baja.
    bull: svg('0 0 210 150', `<defs><linearGradient id="bl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4d55"/><stop offset=".4" stop-color="#22242a"/><stop offset="1" stop-color="#101114"/></linearGradient></defs>
      <path d="M58,62 C70,34 108,22 146,28 C178,32 200,52 198,82 C196,104 184,116 168,118 L72,118 C52,116 42,100 44,86 Z" fill="url(#bl)"/>
      <path d="M60,64 C46,66 34,76 28,92 C22,106 22,120 30,128 C38,134 50,130 56,120 C62,110 66,96 70,84 Z" fill="url(#bl)"/>
      <path d="M40,78 C30,70 22,72 18,80 M58,70 C62,60 70,58 76,62" stroke="#2a2c33" stroke-width="5" stroke-linecap="round" fill="none"/>
      <path d="M78,112 L74,142 L88,142 L92,116 Z M104,114 L104,140 L118,140 L118,114 Z M156,114 L158,142 L172,142 L170,112 Z M178,104 L188,138 L200,136 L192,100 Z" fill="#17181c"/>
      <path d="M196,72 C206,84 206,104 200,118" stroke="#17181c" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M90,34 C120,26 160,30 184,48" stroke="#8a8e98" stroke-opacity=".45" stroke-width="4" fill="none"/>`, 'decor-svg'),

    // Sujetalibros de bronce: figura sentada con manto.
    bookend: svg('0 0 120 210', `<defs>${bronze}</defs>
      <path d="M14,204 C10,168 18,140 30,120 C24,100 26,74 44,58 C40,40 50,20 70,18 C90,18 98,36 94,52 C110,64 116,88 112,110 C120,140 118,176 112,204 Z" fill="url(#bz)"/>
      <path d="M44,60 C60,70 80,68 94,54 M34,122 C56,132 86,130 112,114 M30,150 C50,170 80,172 110,156 M60,80 C58,110 56,140 60,200" stroke="#7e8085" stroke-opacity=".45" stroke-width="3" fill="none"/>
      <rect x="6" y="200" width="110" height="10" rx="2" fill="#1b1a1c"/>`, 'decor-svg'),
  };

  const tops = {
    // Microscopio blanco que está arriba de la Biblioteca I.
    microscope: svg('0 0 130 150', `<rect x="18" y="128" width="96" height="16" rx="4" fill="#f3f3f1"/><rect x="18" y="140" width="96" height="6" rx="2" fill="#c9c9c6"/>
      <rect x="76" y="40" width="22" height="92" rx="8" fill="#f6f6f4"/><path d="M84,50 L52,70 L48,60 L80,38 Z" fill="#1d1d1f"/>
      <rect x="40" y="92" width="58" height="8" rx="2" fill="#1d1d1f"/><rect x="50" y="70" width="10" height="22" fill="#9a9a9a"/><rect x="60" y="72" width="8" height="20" fill="#6d6d6d"/>
      <path d="M58,40 L76,16 L86,22 L70,46 Z" fill="#1d1d1f"/><path d="M50,36 L64,14 L72,19 L60,40 Z" fill="#2c2c2e"/>
      <circle cx="98" cy="110" r="9" fill="#1d1d1f"/><circle cx="98" cy="110" r="4" fill="#5a5a5a"/>`, 'top-svg'),
    // Las dos sillitas de esterilla que hay arriba de la Biblioteca II.
    chairs: svg('0 0 60 90', `<g fill="none" stroke="#7a5230" stroke-width="5" stroke-linecap="round"><path d="M16,86 L16,8 M44,86 L44,8 M16,50 L48,50 M50,86 L50,50"/></g>
      <rect x="18" y="12" width="24" height="34" fill="#c9a46a" opacity=".85"/><path d="M18,20 H42 M18,28 H42 M18,36 H42" stroke="#8a6a3a" stroke-width="1.2"/>`, 'top-svg'),
  };

  window.DECOR = { pediment, capital, decor, tops };
})();
