// Restablece ÚNICAMENTE los datos de la demo (data/amano.db, o AMANO_DB_PATH) al escenario inicial.
// Se puede correr con el servidor prendido: borra y vuelve a sembrar dentro de una transacción.
import { dbPath, openDb, resetDemo } from '../lib/db';

const file = dbPath();
const db = openDb(file);
resetDemo(db);
db.close();
console.log(`Demo restablecida en ${file}: Dani con $ 15.000 (una carga base), sin pasos, semana 1.`);
