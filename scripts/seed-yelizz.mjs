// Seed idempotente de la organización Yelizz (server-side, service_role).
//
// Crea/asegura: organización "Yelizz" (tenant fijo 'yelizz') con sus
// departamentos y agentes reales, más una tarea inicial por agente.
// Se puede correr varias veces sin duplicar (get-or-create por nombre).
//
// Uso:  node scripts/seed-yelizz.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- cargar .env.local (sin dependencias externas) ---
function loadEnv() {
  const envPath = join(__dirname, '..', '.env.local');
  const txt = readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of txt.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const TENANT = 'yelizz';

// Definición (cerebro) del agente Trafficker. Es su rol + método + formato de
// salida. Los NÚMEROS no van aquí: Y M los pega a mano en input_data de la tarea
// (incluido el número mágico / break-even de la semana).
const TRAFFICKER_DEFINITION = `Eres el Trafficker Jefe de Yelizz, marca colombiana de cuidado corporal.
Canal activo: venta web (Shopify, contraentrega/COD). Mercado: Colombia. Moneda: COP.

TU TRABAJO
Analizar la pauta de Meta de la semana contra el "número mágico" (break-even) que te entrega el humano, y recomendar acciones con un número que las justifique. Analizas, diagnosticas y recomiendas; el humano decide y ejecuta.

MÉTODO (3 Q's)
1. ¿Qué pasó? Lee las métricas principales de la semana (gasto, compras, CPA, ROAS, CTR, CPM).
2. ¿Por qué? Mira el embudo (CTR bajo = creativo; CPC alto = segmentación/subasta; muchas vistas sin compra = landing/oferta).
3. ¿Qué haremos? Recomendación concreta por campaña/conjunto.

SEMÁFORO BREAK-EVEN (usa el número mágico que te den)
- 🟢 Por encima del break-even con margen → candidato a ESCALAR (subidas de ~20% cada 3-4 días, nunca dobles de golpe).
- 🟡 Alrededor del break-even → MANTENER y vigilar; no toques más de lo necesario.
- 🔴 Claramente por debajo, con datos suficientes (gasto ≥ ~1-2x CPA objetivo sin compras, o CPA muy por encima) → PAUSAR o reestructurar.

REGLAS
- No recomiendes pausar, escalar ni reestructurar sin el número que lo justifica.
- Máximo 3 cambios de variables por semana; una acción prioritaria.
- Separa métricas de pixel de las ventas reales (COD): el ROAS de pixel se infla; si no te dan ventas reales, dilo.
- Si falta un dato clave para decidir, dilo explícitamente en vez de inventarlo.
- Meta reporta compras de pixel, no ventas entregadas: nunca asumas que 0 compras = 0 ventas ni que 1 compra = 1 venta entregada.

SALIDA (en español, formato fijo)
1. RESUMEN (2-3 líneas): cómo venimos vs. el número mágico (🟢/🟡/🔴).
2. DIAGNÓSTICO: qué dice el embudo, por campaña/conjunto si hay datos.
3. RECOMENDACIÓN: pausar / escalar / mantener, con el número que lo respalda.
4. ÁNGULOS DE CREATIVO QUE FALTAN: 2-4 ángulos nuevos a probar (problema, beneficio, prueba social, antes/después, etc.) y por qué.
5. SUPUESTOS / DATOS QUE FALTAN: qué asumiste y qué pedirías para afinar.

Sé concreto y accionable. Cada recomendación lleva un número. Es una PROPUESTA: el humano la aprueba o la rechaza antes de ejecutar nada.`;

// Tarea central del primer bucle (la que se ejecuta de punta a punta).
const TRAFFICKER_TASK_TITLE =
  'Analiza la pauta de la semana vs. el número mágico y recomienda pausar/escalar + ángulos que faltan';

async function getOrCreate(table, match, insertRow) {
  const { data: found, error: selErr } = await db
    .from(table)
    .select('*')
    .match(match)
    .limit(1)
    .maybeSingle();
  if (selErr) throw new Error(`${table} select: ${selErr.message}`);
  if (found) return { row: found, created: false };

  const { data: created, error: insErr } = await db
    .from(table)
    .insert(insertRow)
    .select('*')
    .single();
  if (insErr) throw new Error(`${table} insert: ${insErr.message}`);
  return { row: created, created: true };
}

async function main() {
  const log = (created, label) => console.log(`  ${created ? '➕ creado ' : '✓ ya existía'} ${label}`);

  // 1) Organización
  console.log('Organización:');
  const org = await getOrCreate(
    'organizations',
    { tenant_id: TENANT },
    { tenant_id: TENANT, name: 'Yelizz', slug: 'yelizz' }
  );
  log(org.created, `Yelizz (${org.row.id})`);

  // 2) Departamentos reales
  const deptDefs = ['Tráfico/Meta Ads', 'Contenido', 'Ventas/Operaciones'];
  console.log('Departamentos:');
  const depts = {};
  for (const name of deptDefs) {
    const d = await getOrCreate(
      'departments',
      { tenant_id: TENANT, name },
      { tenant_id: TENANT, organization_id: org.row.id, name }
    );
    depts[name] = d.row;
    log(d.created, name);
  }

  // 3) Agentes (cada uno en su departamento)
  const agentDefs = [
    { name: 'Trafficker', dept: 'Tráfico/Meta Ads', role: 'Meta Ads', definition: TRAFFICKER_DEFINITION },
    { name: 'Contenido', dept: 'Contenido', role: 'Creativos', definition: null },
    { name: 'Ventas', dept: 'Ventas/Operaciones', role: 'COD / Operaciones', definition: null }
  ];
  console.log('Agentes:');
  const agents = {};
  for (const a of agentDefs) {
    const r = await getOrCreate(
      'agents',
      { tenant_id: TENANT, name: a.name },
      {
        tenant_id: TENANT,
        department_id: depts[a.dept].id,
        name: a.name,
        role: a.role,
        status: 'active',
        definition: a.definition
      }
    );
    agents[a.name] = r.row;
    log(r.created, `${a.name} → ${a.dept}`);
  }

  // Asegura la definición del Trafficker aunque el agente ya existiera (refresca el cerebro).
  const { error: defErr } = await db
    .from('agents')
    .update({ definition: TRAFFICKER_DEFINITION })
    .match({ tenant_id: TENANT, id: agents['Trafficker'].id });
  if (defErr) throw new Error(`agents definition update: ${defErr.message}`);
  console.log('  ✓ definición del Trafficker actualizada');

  // 4) Una tarea inicial real por agente
  const taskDefs = [
    { agent: 'Trafficker', title: TRAFFICKER_TASK_TITLE },
    { agent: 'Trafficker', title: 'Chequeo diario de pauta' },
    { agent: 'Contenido', title: 'Producir creativos de la semana' },
    { agent: 'Ventas', title: 'Seguimiento de pedidos COD' }
  ];
  console.log('Tareas:');
  for (const t of taskDefs) {
    const r = await getOrCreate(
      'tasks',
      { tenant_id: TENANT, title: t.title },
      { tenant_id: TENANT, agent_id: agents[t.agent].id, title: t.title, status: 'pending' }
    );
    log(r.created, `${t.title} (${t.agent})`);
  }

  console.log('\n✅ Seed de Yelizz completo. tenant_id =', TENANT);
}

main().catch((e) => {
  console.error('\n❌ Error en el seed:', e.message);
  process.exit(1);
});
