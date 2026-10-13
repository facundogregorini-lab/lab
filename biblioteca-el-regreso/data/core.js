// Catálogo de la Biblioteca El Regreso.
// Cada archivo de esta carpeta es un estante, en el orden real de izquierda a derecha.
//
// Formato de un libro:
//   { id, t: título, a: autor, c: categoría, y: año de la obra original,
//     s: [fondo, texto, alto (0-1 del estante), grosor (px), estilo, acento, tipografía],
//     q: confianza de la identificación (1 segura · 2 probable · 3 dudosa),
//     r: resumen corto, m: resumen, l: resumen largo,
//     fam: true si el autor es de la familia, dup: id del otro ejemplar }
// Estilos de lomo: plain, band, ornate, classic, label, aged, split, stripe.
// Tipografías: serif, sans, cond, script.
// Un objeto { decor: 'thinker' | 'bastet' | 'horse' | 'bull' | 'bookend' } es un adorno del estante.
window.BIBLIO = {
  bookcases: [
    { id: 'A', name: 'Biblioteca I', subtitle: 'Clásicos, literatura y pensamiento', top: 'microscope' },
    { id: 'B', name: 'Biblioteca II', subtitle: 'Historia, campo y actualidad', top: 'chairs' },
  ],
  categories: {
    'clasicos':     { name: 'Clásicos universales',             color: '#9b3b2f', icon: '🏛️' },
    'aventura':     { name: 'Misterio, terror y aventura',      color: '#5a4a8a', icon: '🕯️' },
    'latam':        { name: 'Literatura argentina y latinoamericana', color: '#2f7d6d', icon: '🧉' },
    'infantil':     { name: 'Infantil y juvenil',               color: '#d08a1e', icon: '🪄' },
    'filosofia':    { name: 'Filosofía y pensamiento',          color: '#6b5a3e', icon: '🦉' },
    'biografias':   { name: 'Biografías y memorias',            color: '#a2476b', icon: '👤' },
    'hist-arg':     { name: 'Historia argentina',               color: '#3a6ea5', icon: '🇦🇷' },
    'hist-mundial': { name: 'Historia universal',               color: '#7a5230', icon: '🌍' },
    'patagonia':    { name: 'Patagonia, viajes y frontera',     color: '#4f8a9e', icon: '🧭' },
    'politica':     { name: 'Política y actualidad argentina',  color: '#b0413e', icon: '🗞️' },
    'economia':     { name: 'Economía e inversión',             color: '#3f7d3a', icon: '📈' },
    'desarrollo':   { name: 'Desarrollo personal',              color: '#c0662c', icon: '🌱' },
    'psicologia':   { name: 'Psicología',                       color: '#7b5ea7', icon: '🧠' },
    'ciencia':      { name: 'Ciencia, tecnología y futuro',     color: '#2c6f8f', icon: '🔭' },
    'campo':        { name: 'Campo y veterinaria',              color: '#6f8a2c', icon: '🐖' },
    'religion':     { name: 'Religión y espiritualidad',        color: '#8a6d2c', icon: '🕊️' },
  },
  shelves: [],
  books: {},
};

// Registra un estante: BIBLIO.shelf('A', 1, [libro, libro, { decor: 'thinker' }, ...])
BIBLIO.shelf = function (bookcase, n, items) {
  const entries = items.map(item => {
    if (item.decor) return item;
    if (BIBLIO.books[item.id]) throw new Error('Libro repetido: ' + item.id);
    item.bookcase = bookcase;
    item.shelf = n;
    BIBLIO.books[item.id] = item;
    return { id: item.id };
  });
  BIBLIO.shelves.push({ bookcase, n, items: entries });
};
