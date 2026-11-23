// IA de Estante: listas de libros por categoría y recomendaciones personalizadas.
// Con ANTHROPIC_API_KEY usa la API de Anthropic; si no, el AI Gateway de Vercel con el token OIDC del proyecto
// (no hace falta cargar ninguna clave). Modelo económico, respuestas en JSON con esquema.

const MODEL = (process.env.ESTANTE_IA_MODEL || 'claude-haiku-5-5').trim();
const GATEWAY_MODEL = (process.env.ESTANTE_GATEWAY_MODEL || 'anthropic/claude-haiku-5.5').trim();

const CATEGORIES = {
  desarrollo: { label: 'Desarrollo personal', hint: 'hábitos, productividad, autoayuda, crecimiento personal, mentalidad' },
  biografias: { label: 'Biografías', hint: 'biografías, autobiografías y memorias de personas reales' },
  ciencia: { label: 'Ciencia', hint: 'divulgación científica: física, biología, cosmos, evolución, matemática' },
  medicina: { label: 'Medicina y salud', hint: 'medicina, salud, nutrición, sueño, longevidad, cerebro, divulgación médica' },
  psicologia: { label: 'Psicología', hint: 'psicología, emociones, comportamiento, terapia, neurociencia aplicada' },
  negocios: { label: 'Negocios', hint: 'negocios, emprendimiento, liderazgo, finanzas personales, economía' },
  historia: { label: 'Historia', hint: 'historia universal y latinoamericana, ensayo histórico de divulgación' },
  filosofia: { label: 'Filosofía', hint: 'filosofía clásica y contemporánea, ensayo de ideas, estoicismo' },
  novela: { label: 'Novela', hint: 'novela contemporánea, ficción literaria reciente' },
  policiales: { label: 'Policiales', hint: 'policial, thriller, suspenso, novela negra' },
  fantasia: { label: 'Ciencia ficción y fantasía', hint: 'ciencia ficción y fantasía' },
  clasicos: { label: 'Clásicos', hint: 'clásicos de la literatura universal y latinoamericana' },
};

const BOOK = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'author', 'year', 'why'],
  properties: {
    title: { type: 'string', description: 'Título como se publicó en español (o el original si no tiene traducción).' },
    author: { type: 'string' },
    year: { anyOf: [{ type: 'integer' }, { type: 'null' }], description: 'Año de la primera publicación; null si no se sabe.' },
    why: { type: 'string' },
  },
};
const LIST_SCHEMA = { type: 'object', additionalProperties: false, required: ['books'], properties: { books: { type: 'array', items: BOOK } } };
const RECS_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['books'],
  properties: { books: { type: 'array', items: { ...BOOK, required: [...BOOK.required, 'category'], properties: { ...BOOK.properties, category: { type: 'string', enum: Object.keys(CATEGORIES) } } } } },
};

const LIST_SYSTEM = `Sos un librero de Buenos Aires con mucho oficio. Armás la lista de los libros más vendidos y más leídos de una categoría para lectores en español.
- Mezclá best sellers de los últimos años con long-sellers que se siguen vendiendo mucho, ordenados del más vendido al menos.
- Solo libros reales que existan con certeza. Nada inventado: si dudás de un título o de su autor, no lo pongas.
- Título como se publicó en español; si no tiene traducción, el original.
- Como máximo dos libros por autor.
- "why": una sola frase de hasta 18 palabras, en español rioplatense neutro, sobre de qué trata y por qué se lee tanto. Sin spoilers.`;

const RECS_SYSTEM = `Sos un librero que conoce muy bien a sus lectores y recomienda con criterio, en español rioplatense (vos).
Recibís los libros que la persona terminó, con su puntaje (1 a 5; 0 es sin puntuar), y los que ya tiene pendientes o está leyendo.
- Recomendá 8 libros que NO estén en ninguna de esas listas (tampoco otras ediciones ni traducciones de esos mismos libros).
- Guiate sobre todo por los que puntuó alto; evitá lo parecido a lo que puntuó bajo.
- 5 o 6 muy afines a sus gustos y 2 o 3 que lo saquen un poco de su zona de confort pero que probablemente le gusten.
- Solo libros reales que existan con certeza. Título como se publicó en español; si no tiene traducción, el original.
- "why": una o dos frases, máximo 30 palabras, dirigidas a la persona, que expliquen por qué le va a gustar mencionando alguno de sus libros. Sin spoilers.
- "category": la categoría que mejor le corresponde.`;

const FAKE_LIST = [
  { title: 'Hábitos atómicos', author: 'James Clear', year: 2018, why: 'Cómo pequeños cambios diarios se acumulan en grandes resultados.' },
  { title: 'El poder del ahora', author: 'Eckhart Tolle', year: 1997, why: 'Una guía para dejar de vivir en el pasado y el futuro.' },
  { title: 'Los 7 hábitos de la gente altamente efectiva', author: 'Stephen R. Covey', year: 1989, why: 'Un clásico sobre principios de efectividad personal.' },
];
const FAKE_RECS = [
  { title: 'El marciano', author: 'Andy Weir', year: 2011, why: 'Si te gustó Proyecto Hail Mary, vas a disfrutar este ingenio científico.', category: 'fantasia' },
  { title: 'Sapiens', author: 'Yuval Noah Harari', year: 2011, why: 'Una mirada amplia que te va a dar contexto para todo lo que leés.', category: 'historia' },
];

const enabled = () => process.env.ESTANTE_FAKE === '1' || Boolean((process.env.ANTHROPIC_API_KEY || '').trim())
  || Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL);

function parseJson(text) {
  const start = text.indexOf('{'), end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('La IA no devolvió JSON.');
  return JSON.parse(text.slice(start, end + 1));
}

async function complete({ system, user, schema, req, maxTokens = 4000 }) {
  if ((process.env.ANTHROPIC_API_KEY || '').trim()) {
    const Anthropic = require('@anthropic-ai/sdk');
    const response = await new Anthropic().messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      output_config: { effort: 'low', format: { type: 'json_schema', schema } },
      messages: [{ role: 'user', content: user }],
    });
    if (response.stop_reason === 'refusal') throw new Error('La IA no pudo responder.');
    if (response.stop_reason === 'max_tokens') throw new Error('La respuesta de la IA quedó cortada.');
    console.log('Estante IA tokens', JSON.stringify({ in: response.usage.input_tokens, out: response.usage.output_tokens }));
    return parseJson(response.content.filter(b => b.type === 'text').map(b => b.text).join(''));
  }
  const token = process.env.AI_GATEWAY_API_KEY || (req && req.headers && req.headers['x-vercel-oidc-token']) || process.env.VERCEL_OIDC_TOKEN;
  if (!token) throw new Error('La IA no está configurada.');
  const res = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
    method: 'POST',
    signal: AbortSignal.timeout(50000),
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GATEWAY_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      response_format: { type: 'json_schema', json_schema: { name: 'respuesta', strict: true, schema } },
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error('AI Gateway ' + res.status + ': ' + ((json.error && (json.error.message || json.error.type)) || ''));
  if (json.usage) console.log('Estante IA tokens', JSON.stringify({ in: json.usage.prompt_tokens, out: json.usage.completion_tokens }));
  const choice = json.choices && json.choices[0];
  if (choice && choice.finish_reason === 'length') throw new Error('La respuesta de la IA quedó cortada.');
  return parseJson((choice && choice.message && choice.message.content) || '');
}

const clean = (books, max) => (Array.isArray(books) ? books : []).filter(b => b && typeof b.title === 'string' && b.title.trim()).slice(0, max).map(b => ({
  title: b.title.trim().slice(0, 200), author: String(b.author || '').trim().slice(0, 160),
  year: Number.isInteger(b.year) && b.year > 0 && b.year <= new Date().getFullYear() ? String(b.year) : '',
  why: String(b.why || '').trim().slice(0, 300), ...(b.category && CATEGORIES[b.category] ? { category: b.category } : {}),
}));

async function bestSellers(cat, req) {
  const c = CATEGORIES[cat];
  if (process.env.ESTANTE_FAKE === '1') return clean(FAKE_LIST, 12);
  const data = await complete({ system: LIST_SYSTEM, user: `Categoría: ${c.label} (${c.hint}).\nDevolvé 12 libros.`, schema: LIST_SCHEMA, req });
  return clean(data.books, 12);
}

// read: [{ title, creator, rating }] · skip: [{ title, creator }]
async function recommend({ read, skip }, req) {
  if (process.env.ESTANTE_FAKE === '1') return clean(FAKE_RECS, 8);
  const line = b => `- ${b.title}${b.creator ? ' — ' + b.creator : ''}`;
  const user = [
    'Libros que terminó:',
    ...read.map(b => line(b) + (b.rating ? ` (${b.rating}/5)` : ' (sin puntuar)')),
    '',
    'Pendientes o leyendo (no recomendar):',
    ...(skip.length ? skip.map(line) : ['(ninguno)']),
  ].join('\n');
  const data = await complete({ system: RECS_SYSTEM, user, schema: RECS_SCHEMA, req });
  return clean(data.books, 8);
}

module.exports = { CATEGORIES, bestSellers, recommend, enabled };
