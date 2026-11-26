import type Database from 'better-sqlite3';
import { addDays, isoDate, opaqueToken } from './util';

// Escenario inicial de la demo. Todo es ficticio: personas, organizaciones, comercios, fondos e importes.
export const DANI = 'p_dani';
export const MARTA = 'r_marta';
export const JULIAN = 'r_julian';
export const WEEKLY = 15000;
export const DANI_WEEKS = 4;

type Yn = 'si' | 'no' | null;

export function seed(db: Database.Database) {
  const start = process.env.AMANO_START_DATE || isoDate(new Date());
  const ins = (sql: string, ...args: unknown[]) => db.prepare(sql).run(...args);

  ins("INSERT INTO demo_state (key, value) VALUES ('start_date', ?), ('week', '1'), ('seeded', '1')", start);

  ins('INSERT INTO organizations VALUES (?,?,?), (?,?,?)',
    'o_red', 'Red Abrigo Sur (ficticia)', 'Organización social',
    'o_hogar', 'Hogar Puente Norte (ficticio)', 'Parador nocturno');
  ins('INSERT INTO referentes VALUES (?,?,?), (?,?,?)',
    MARTA, 'Marta', 'o_red',
    JULIAN, 'Julián', 'o_hogar');

  // Dani: ya acreditado al iniciar la demo, con tarjeta asignada y un período de 4 semanas patrocinado.
  ins(`INSERT INTO persons (id, chosen_name, organization_id, referente_id, consent_at, accredited_on,
        has_phone, has_document, uses_physical_card, cohort, created_by, created_at)
       VALUES (?,?,?,?,?,?,1,0,0,NULL,?,?)`,
    DANI, 'Dani', 'o_red', MARTA, `${start}T09:00`, start, MARTA, `${start}T09:00`);
  ins('INSERT INTO cards VALUES (?,?,?,?,?)', 'c_dani', DANI, 'AM-2048-0137', opaqueToken(), 'activa');
  ins('INSERT INTO funds VALUES (?,?,?)', 'f_dani', 'Fondo de patrocinio demo (ficticio)', WEEKLY * DANI_WEEKS);
  ins('INSERT INTO funding_periods VALUES (?,?,?,?,?,?,?)', 'fp_dani', DANI, 'f_dani', WEEKLY, DANI_WEEKS, 1, start);
  ins('INSERT INTO movements (id, person_id, kind, concept, amount, idempotency_key, created_at) VALUES (?,?,?,?,?,?,?)',
    'm_base_dani_1', DANI, 'base', 'Base semanal · semana 1 de 4', WEEKLY, 'load:fp_dani:1', `${start}T09:00`);
  ins('INSERT INTO weekly_loads VALUES (?,?,?,?,?)', 'wl_dani_1', 'fp_dani', DANI, 1, 'm_base_dani_1');

  // Seis comercios ficticios. Dos de comida preparada (más una rotisería), sin GPS: distancia orientativa.
  const merchants: [string, string, string, number, number, string, string, number][] = [
    ['mc_ana', 'Comedor de Ana', 'San Telmo', 350, 1, 'Abierto hasta las 16:00', 'Platos calientes y viandas', 1],
    ['mc_puente', 'Rotisería El Puente', 'Constitución', 800, 1, 'Abierto hasta las 22:00', 'Comida para llevar', 1],
    ['mc_tito', 'Almacén Don Tito', 'San Telmo', 500, 1, 'Abierto hasta las 21:00', 'Almacén, agua y pan', 0],
    ['mc_plaza', 'Farmacia Plaza', 'Monserrat', 1200, 1, 'Abierta las 24 horas', 'Higiene personal', 0],
    ['mc_burbujas', 'Lavadero Burbujas', 'Barracas', 1500, 0, 'Cerrado · abre mañana a las 8:00', 'Lavado y secado de ropa', 0],
    ['mc_roperia', 'Ropería Mano Amiga', 'Constitución', 950, 1, 'Abierta hasta las 18:00', 'Ropa y abrigo', 0],
  ];
  for (const m of merchants) ins('INSERT INTO merchants VALUES (?,?,?,?,?,?,?,?,1)', ...m);
  const products: [string, string, string, number][] = [
    ['pr_ana_plato', 'mc_ana', 'Plato caliente del día', 4500],
    ['pr_ana_vianda', 'mc_ana', 'Vianda para llevar', 3800],
    ['pr_ana_cafe', 'mc_ana', 'Café con leche y medialunas', 2200],
    ['pr_puente_mila', 'mc_puente', 'Milanesa con puré', 5200],
    ['pr_puente_emp', 'mc_puente', 'Tres empanadas', 3000],
    ['pr_tito_agua', 'mc_tito', 'Agua 1,5 L', 1200],
    ['pr_tito_pan', 'mc_tito', 'Pan y fiambre', 2800],
    ['pr_plaza_kit', 'mc_plaza', 'Kit de higiene', 3500],
    ['pr_plaza_solar', 'mc_plaza', 'Protector solar', 6000],
    ['pr_burb_lav', 'mc_burbujas', 'Lavado y secado', 4000],
    ['pr_rop_medias', 'mc_roperia', 'Tres pares de medias', 2500],
    ['pr_rop_campera', 'mc_roperia', 'Campera de abrigo', 32000],
  ];
  for (const p of products) ins('INSERT INTO products VALUES (?,?,?,?,1)', ...p);

  const templates: [string, string, string, string, string, string, number, string, number, string, string][] = [
    ['t_dni', 'Tramitar mi DNI', 'Recuperar mi DNI', 'Presentarme al turno para iniciar el trámite', 'Recibí mi documento',
      'Ir al turno y empezar el trámite. No hace falta llevar partida: si no la tenés, Marta te ayuda a pedirla.',
      3000, 'Centro de Documentación (ficticio) · Constitución', 2, '10:00', 'id'],
    ['t_salud', 'Visitar un centro de salud', 'Cuidar mi salud', 'Asistir a un turno de salud que elijas', 'Tengo seguimiento en un centro de salud',
      'Ir al turno que elijas, en el centro que prefieras. No tenés que contar para qué fuiste.',
      2000, 'Centro de salud barrial (ficticio) · San Telmo', 3, '9:30', 'health'],
    ['t_aloj', 'Buscar alojamiento', 'Conseguir un lugar seguro para dormir', 'Asistir a una entrevista de alojamiento', 'Tengo un lugar para dormir',
      'Ir a la entrevista con el equipo de alojamiento y conocer las opciones.',
      4000, 'Oficina de alojamiento (ficticia) · Monserrat', 4, '11:00', 'home'],
  ];
  for (const t of templates) ins('INSERT INTO step_templates VALUES (?,?,?,?,?,?,?,?,?,?,?)', ...t);

  // Cohorte histórica ficticia (ya cumplió 90 días) para el seguimiento descriptivo. Diferenciada de Dani.
  const cohortStart = addDays(start, -110);
  const N = 20;
  const pattern = (si: number, no: number): Yn[] => Array.from({ length: N }, (_, i) => (i < si ? 'si' : i < si + no ? 'no' : null));
  const basic = pattern(13, 4), goal = pattern(9, 7), housing = pattern(6, 10);
  for (let i = 0; i < N; i++) {
    const pid = `p_ago_${String(i + 1).padStart(2, '0')}`;
    const physical = i % 3 === 0 ? 1 : 0; // un tercio usa tarjeta física sin celular
    ins(`INSERT INTO persons (id, chosen_name, organization_id, referente_id, consent_at, accredited_on,
          has_phone, has_document, uses_physical_card, cohort, created_by, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      pid, `Persona ${i + 1}`, i % 2 ? 'o_red' : 'o_hogar', i % 2 ? MARTA : JULIAN, `${cohortStart}T10:00`, cohortStart,
      physical ? 0 : 1, i % 4 === 0 ? 1 : 0, physical, 'Cohorte agosto 2026', MARTA, `${cohortStart}T10:00`);
    // Quienes no tienen ninguna respuesta quedan sin fila: "sin seguimiento".
    if (basic[i] || goal[i] || housing[i]) {
      ins('INSERT INTO followups VALUES (?,?,?,?,?)', pid, addDays(cohortStart, 92), basic[i], goal[i], housing[i]);
    }
  }
  // Cohorte reciente: todavía fuera de plazo, se muestra aparte.
  const recent = addDays(start, -45);
  for (let i = 0; i < 6; i++) {
    const pid = `p_oct_${i + 1}`;
    ins(`INSERT INTO persons (id, chosen_name, organization_id, referente_id, consent_at, accredited_on,
          has_phone, has_document, uses_physical_card, cohort, created_by, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      pid, `Persona O${i + 1}`, 'o_red', MARTA, `${recent}T10:00`, recent, i % 2, 0, i % 2 ? 0 : 1,
      'Cohorte octubre 2026', MARTA, `${recent}T10:00`);
  }
}
