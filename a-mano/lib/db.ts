import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { seed } from './seed';

// Una sola base SQLite en el servidor: las tres experiencias (persona, donante y referente) leen y escriben acá.
export type DB = Database.Database;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS demo_state (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS referentes (
  id TEXT PRIMARY KEY, name TEXT NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id)
);
CREATE TABLE IF NOT EXISTS persons (
  id TEXT PRIMARY KEY,
  chosen_name TEXT NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  referente_id TEXT NOT NULL REFERENCES referentes(id),
  consent_at TEXT NOT NULL,
  accredited_on TEXT NOT NULL,          -- fecha de alta (acreditación social, no bancaria)
  has_phone INTEGER NOT NULL DEFAULT 1,
  has_document INTEGER NOT NULL DEFAULT 0,
  uses_physical_card INTEGER NOT NULL DEFAULT 0,
  cohort TEXT,                          -- NULL = caso activo de la demo; texto = cohorte histórica ficticia
  created_by TEXT,                      -- referente que hizo el alta
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL UNIQUE REFERENCES persons(id),
  card_code TEXT NOT NULL UNIQUE,       -- identificador ficticio impreso
  public_token TEXT NOT NULL UNIQUE,    -- token opaco para el enlace público de aportes
  status TEXT NOT NULL DEFAULT 'activa'
);
CREATE TABLE IF NOT EXISTS funds (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, amount INTEGER NOT NULL CHECK (amount >= 0)
);
CREATE TABLE IF NOT EXISTS funding_periods (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES persons(id),
  fund_id TEXT NOT NULL REFERENCES funds(id),
  weekly_amount INTEGER NOT NULL CHECK (weekly_amount > 0),
  weeks_total INTEGER NOT NULL CHECK (weeks_total > 0),
  start_week INTEGER NOT NULL,          -- semana de demo en la que arranca
  start_date TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS weekly_loads (
  id TEXT PRIMARY KEY,
  period_id TEXT NOT NULL REFERENCES funding_periods(id),
  person_id TEXT NOT NULL REFERENCES persons(id),
  week_index INTEGER NOT NULL,          -- 1..weeks_total dentro del período
  movement_id TEXT NOT NULL REFERENCES movements(id),
  UNIQUE (period_id, week_index)
);
CREATE TABLE IF NOT EXISTS merchants (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, barrio TEXT NOT NULL,
  distance_m INTEGER NOT NULL, open_now INTEGER NOT NULL, hours TEXT NOT NULL,
  offers TEXT NOT NULL, prepared_food INTEGER NOT NULL, enabled INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY, merchant_id TEXT NOT NULL REFERENCES merchants(id),
  name TEXT NOT NULL, price INTEGER NOT NULL CHECK (price > 0), available INTEGER NOT NULL DEFAULT 1
);
-- Libro de movimientos: el saldo SIEMPRE es la suma de esta tabla (importes enteros, en pesos).
CREATE TABLE IF NOT EXISTS movements (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES persons(id),
  kind TEXT NOT NULL CHECK (kind IN ('base','compra','aporte','extra')),
  concept TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount <> 0),
  merchant_id TEXT, product_id TEXT, step_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS movements_person ON movements(person_id);

-- Motor de hitos: meta elegida → acción verificable → resultado posterior.
CREATE TABLE IF NOT EXISTS step_templates (
  id TEXT PRIMARY KEY, short_title TEXT NOT NULL,
  goal_title TEXT NOT NULL, action_title TEXT NOT NULL, outcome_title TEXT NOT NULL,
  what_to_do TEXT NOT NULL, amount INTEGER NOT NULL CHECK (amount > 0),
  place TEXT NOT NULL, days_ahead INTEGER NOT NULL, time TEXT NOT NULL, icon TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY, person_id TEXT NOT NULL REFERENCES persons(id),
  title TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS step_instances (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES persons(id),
  goal_id TEXT NOT NULL REFERENCES goals(id),
  template_id TEXT REFERENCES step_templates(id),
  short_title TEXT NOT NULL, action_title TEXT NOT NULL, outcome_title TEXT NOT NULL,
  what_to_do TEXT NOT NULL, amount INTEGER,                 -- NULL mientras un paso propio no está acordado
  place TEXT NOT NULL, scheduled_at TEXT, icon TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('propuesto','elegido','pendiente','revisar','pausado','acreditado','cancelado')),
  review_note TEXT,
  extra_movement_id TEXT UNIQUE REFERENCES movements(id),   -- una instancia, un solo extra
  outcome_reached_at TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS step_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  step_id TEXT NOT NULL REFERENCES step_instances(id),
  from_status TEXT, to_status TEXT NOT NULL,
  actor TEXT NOT NULL, note TEXT, at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS help_requests (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES persons(id),
  step_id TEXT NOT NULL REFERENCES step_instances(id),
  kind TEXT NOT NULL DEFAULT 'transporte',
  note TEXT,
  status TEXT NOT NULL CHECK (status IN ('abierta','resuelta')),
  resolution TEXT,
  created_at TEXT NOT NULL, resolved_at TEXT
);
-- Seguimiento voluntario a 90 días (descriptivo, nunca un puntaje individual).
CREATE TABLE IF NOT EXISTS followups (
  person_id TEXT PRIMARY KEY REFERENCES persons(id),
  recorded_on TEXT NOT NULL,
  basic_need TEXT CHECK (basic_need IN ('si','no')),
  goal_progress TEXT CHECK (goal_progress IN ('si','no')),
  safe_housing_30 TEXT CHECK (safe_housing_30 IN ('si','no'))
);
`;

const g = globalThis as unknown as { __amanoDb?: { path: string; db: DB } };

export function dbPath() {
  return process.env.AMANO_DB_PATH || path.join(process.cwd(), 'data', 'amano.db');
}

export function openDb(file = dbPath()): DB {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.exec(SCHEMA);
  const seeded = db.prepare("SELECT value FROM demo_state WHERE key = 'seeded'").get();
  if (!seeded) seed(db);
  return db;
}

export function getDb(): DB {
  const file = dbPath();
  if (!g.__amanoDb || g.__amanoDb.path !== file) g.__amanoDb = { path: file, db: openDb(file) };
  return g.__amanoDb.db;
}

const TABLES = [
  'step_events', 'help_requests', 'weekly_loads', 'followups', 'step_instances', 'goals', 'movements',
  'funding_periods', 'funds', 'cards', 'products', 'merchants', 'step_templates', 'persons', 'referentes',
  'organizations', 'demo_state',
];

/** Borra únicamente los datos de la demo y vuelve a sembrar el escenario inicial. */
export function resetDemo(db: DB) {
  db.transaction(() => {
    for (const t of TABLES) db.prepare(`DELETE FROM ${t}`).run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name = 'step_events'").run();
    seed(db);
  }).immediate();
}
