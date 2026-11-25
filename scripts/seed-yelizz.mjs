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
    { name: 'Trafficker', dept: 'Tráfico/Meta Ads', role: 'Meta Ads' },
    { name: 'Contenido', dept: 'Contenido', role: 'Creativos' },
    { name: 'Ventas', dept: 'Ventas/Operaciones', role: 'COD / Operaciones' }
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
        status: 'active'
      }
    );
    agents[a.name] = r.row;
    log(r.created, `${a.name} → ${a.dept}`);
  }

  // 4) Una tarea inicial real por agente
  const taskDefs = [
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
