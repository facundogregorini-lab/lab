// IA de la Biblioteca El Regreso: lee la foto de un libro y escribe sus dos resúmenes.
// Usa el modelo más económico de Anthropic con el esfuerzo más bajo. Se activa solo si existe ANTHROPIC_API_KEY.
const Anthropic = require('@anthropic-ai/sdk');

const MODEL = (process.env.BIBLIO_IA_MODEL || 'claude-haiku-5-5').trim();
const enabled = () => Boolean((process.env.ANTHROPIC_API_KEY || '').trim()) || process.env.BIBLIO_IA_FAKE === '1';

const CATEGORIES = ['clasicos', 'aventura', 'latam', 'infantil', 'filosofia', 'biografias', 'hist-arg', 'hist-mundial', 'patagonia', 'politica', 'economia', 'desarrollo', 'psicologia', 'ciencia', 'campo', 'religion'];

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'author', 'year', 'category', 'confident', 'corto', 'largo'],
  properties: {
    title: { type: 'string', description: 'Título del libro tal como se publica en español.' },
    author: { type: 'string', description: 'Autor o autores. Vacío si no se sabe.' },
    year: { anyOf: [{ type: 'integer' }, { type: 'null' }], description: 'Año de publicación original, negativo para a. C.; null si no se sabe.' },
    category: { type: 'string', enum: CATEGORIES },
    confident: { type: 'boolean', description: 'true solo si la foto o los datos identifican el libro sin dudas.' },
    corto: { type: 'string', description: 'Resumen de 350 a 420 palabras, 3 o 4 párrafos separados por una línea en blanco.' },
    largo: { type: 'string', description: 'Resumen de 950 a 1150 palabras, 7 a 10 párrafos separados por una línea en blanco.' },
  },
};

// Fijo para que la caché de prompts lo reutilice entre pedidos.
const SYSTEM = `Catalogás los libros de la biblioteca de una familia en un campo de la provincia de Buenos Aires, Argentina.
Recibís, cuando la hay, la foto del lomo o de la tapa de un libro, y los datos que escribió alguien de la familia.
1. Identificá el libro. Si la foto contradice lo escrito, confiá en la foto. Si no se lee bien, usá lo escrito.
2. Escribí dos resúmenes en español rioplatense neutro, cálido y de calidad editorial, sin markdown ni listas:
   - "corto": 350 a 420 palabras (2 minutos de lectura).
   - "largo": 950 a 1150 palabras (7 minutos): el autor y su contexto, de qué trata, ideas o personajes centrales, temas, influencia, y para quién es y por qué leerlo hoy.
   No reveles el final de novelas ni policiales. Si el libro se vincula con la Argentina, el campo o la Patagonia, destacalo.
3. Precisión ante todo: no inventes fechas, premios, citas ni tramas. Si no reconocés el libro con seguridad, poné confident=false, escribí con cautela sobre el tema general y decí en una frase que el contenido está por confirmar.`;

function fake(input) {
  const p = 'Resumen de prueba generado sin conexión a la IA. '.repeat(8).trim();
  return { title: input.title || 'Libro identificado', author: input.author || 'Autor identificado', year: null, category: input.category || 'clasicos', confident: true, corto: `${p}\n\n${p}`, largo: `${p}\n\n${p}\n\n${p}` };
}

// input: { photo (data URL o null), title, author, note, category }
async function analyze(input) {
  if (process.env.BIBLIO_IA_FAKE === '1') return { ...fake(input), model: 'fake', usage: null };
  const client = new Anthropic();
  const content = [];
  const match = /^data:(image\/(?:jpeg|webp));base64,(.+)$/.exec(input.photo || '');
  if (match) content.push({ type: 'image', source: { type: 'base64', media_type: match[1], data: match[2] } });
  content.push({ type: 'text', text: [
    match ? 'Foto adjunta.' : 'No hay foto.',
    `Título escrito: ${input.title || '(vacío)'}`,
    `Autor escrito: ${input.author || '(vacío)'}`,
    input.category ? `Categoría elegida: ${input.category}` : '',
    input.note ? `Comentario: ${input.note}` : '',
  ].filter(Boolean).join('\n') });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{ role: 'user', content }],
  });
  if (response.stop_reason === 'refusal') throw new Error('La IA no pudo procesar este libro.');
  if (response.stop_reason === 'max_tokens') throw new Error('La respuesta de la IA quedó cortada.');
  const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
  const data = JSON.parse(text);
  if (!CATEGORIES.includes(data.category)) data.category = input.category || 'clasicos';
  return { ...data, model: response.model, usage: response.usage };
}

module.exports = { analyze, enabled, MODEL };
