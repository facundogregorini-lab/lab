import { BlobPreconditionFailedError, get, put } from '@vercel/blob';
import { getFileDb, openDb, type DB } from './db';
import { DomainError } from './domain';

// Dónde viven los datos.
// · Local: un archivo SQLite (data/amano.db).
// · En Vercel (hay BLOB_READ_WRITE_TOKEN): la misma base SQLite guardada como un único archivo privado en Vercel Blob.
//   Cada escritura lee la última versión, aplica la operación en una transacción y la guarda solo si nadie la cambió
//   en el medio (ETag + ifMatch). Si otra instancia escribió antes, reintenta sobre la versión nueva. Así las reglas
//   (idempotencia, saldo nunca negativo, un solo extra por paso) siguen valiendo entre instancias.

const PATH = 'a-mano/demo.sqlite';
export const usesBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;

type Snapshot = { etag: string | null; db: DB };
const g = globalThis as unknown as { __amanoSnap?: Snapshot | null };

async function load(): Promise<Snapshot> {
  const cached = g.__amanoSnap;
  const r = await get(PATH, { access: 'private', useCache: false, ifNoneMatch: cached?.etag ?? undefined });
  if (!r) {
    // Primera vez: siembra el escenario inicial y lo guarda, para que el token del QR quede fijo desde el principio.
    const db = openDb(':memory:');
    try {
      const saved = await put(PATH, db.serialize(), { access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType: 'application/vnd.sqlite3' });
      g.__amanoSnap = { etag: saved.etag, db };
      return g.__amanoSnap;
    } catch {
      g.__amanoSnap = null;
      return load(); // otra instancia la creó primero: leer esa
    }
  }
  if (r.statusCode === 304 && cached) return cached;
  if (r.statusCode !== 200) throw new Error('No se pudo leer la base de la demo');
  const buf = Buffer.from(await new Response(r.stream).arrayBuffer());
  const snap = { etag: r.blob.etag, db: openDb(buf) };
  g.__amanoSnap = snap;
  return snap;
}

/** Base para leer (pantallas). */
export async function getDb(): Promise<DB> {
  if (!usesBlob()) return getFileDb();
  return (await load()).db;
}

/** Aplica una operación que escribe. Si la operación lanza un error de negocio, no se guarda nada. */
export async function mutate<T>(fn: (db: DB) => T): Promise<T> {
  if (!usesBlob()) return fn(getFileDb());
  for (let attempt = 0; attempt < 10; attempt++) {
    const snap = await load();
    const work = openDb(snap.db.serialize()); // copia de trabajo: si algo falla, la versión leída queda intacta
    const result = fn(work);
    try {
      const saved = await put(PATH, work.serialize(), {
        access: 'private', addRandomSuffix: false, contentType: 'application/vnd.sqlite3',
        ...(snap.etag ? { ifMatch: snap.etag, allowOverwrite: true } : { allowOverwrite: false }),
      });
      g.__amanoSnap = { etag: saved.etag, db: work };
      return result;
    } catch (e) {
      const conflict = e instanceof BlobPreconditionFailedError || (!snap.etag && /exist/i.test(String((e as Error)?.message)));
      if (!conflict) throw e;
      g.__amanoSnap = null;
      await new Promise((r) => setTimeout(r, 40 + Math.random() * 120 * (attempt + 1)));
    }
  }
  throw new DomainError(503, 'ocupado', 'Hay mucho movimiento en este momento. Probá de nuevo: no se cobró nada.');
}
