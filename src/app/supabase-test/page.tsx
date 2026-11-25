import { notFound } from 'next/navigation';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

/**
 * Página de prueba de Supabase.
 *
 * Usa el cliente admin (service_role) EN EL SERVIDOR para verificar el esquema
 * SIN necesidad de configurar el login de Clerk todavía. service_role salta el
 * RLS, así que podemos crear y leer la cadena completa de tablas.
 *
 * Seguridad:
 *  - Es un Server Component: la service_role key nunca llega al navegador.
 *  - Se bloquea en producción (notFound) para no dejar un endpoint con poderes
 *    de admin accesible públicamente. Es solo una herramienta de desarrollo.
 *
 * Abrir en: http://localhost:3000/supabase-test
 */

export const dynamic = 'force-dynamic';

type Step = { label: string; ok: boolean; detail: string };

const TABLES = [
  'organizations',
  'departments',
  'agents',
  'tasks',
  'events',
  'approvals',
  'budgets',
  'results'
] as const;

export default async function SupabaseTestPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  const hasEnv = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  const steps: Step[] = [];
  const counts: Record<string, number | string> = {};
  const tenant = `test-${Date.now()}`;
  let appendOnly = '—';
  let fatal: string | null = null;

  if (hasEnv) {
    try {
      const db = createAdminSupabaseClient();

      const insert = async (table: string, row: Record<string, unknown>) => {
        const { data, error } = await db.from(table).insert(row).select('id').single();
        if (error) throw new Error(`${table}: ${error.message}`);
        steps.push({ label: `insert ${table}`, ok: true, detail: String(data.id) });
        return String(data.id);
      };

      // Cadena completa: Org → Dept → Agent → Task → Event → Approval → Budget → Result
      const orgId = await insert('organizations', {
        tenant_id: tenant,
        name: 'Org de prueba',
        slug: tenant
      });
      const deptId = await insert('departments', {
        tenant_id: tenant,
        organization_id: orgId,
        name: 'Marketing'
      });
      const agentId = await insert('agents', {
        tenant_id: tenant,
        department_id: deptId,
        name: 'Trafficker',
        role: 'ads'
      });
      const taskId = await insert('tasks', {
        tenant_id: tenant,
        agent_id: agentId,
        title: 'Chequeo de pauta'
      });
      const eventId = await insert('events', {
        tenant_id: tenant,
        task_id: taskId,
        type: 'task.created',
        payload: { source: 'supabase-test' }
      });
      const approvalId = await insert('approvals', {
        tenant_id: tenant,
        event_id: eventId,
        status: 'approved',
        approver: 'Y M'
      });
      const budgetId = await insert('budgets', {
        tenant_id: tenant,
        approval_id: approvalId,
        amount: 30000,
        currency: 'COP',
        period: '2026-11'
      });
      await insert('results', {
        tenant_id: tenant,
        budget_id: budgetId,
        outcome: 'ok',
        metrics: { roas: 1.8 }
      });

      // Verificar append-only: un UPDATE sobre events DEBE fallar.
      const { error: updErr } = await db
        .from('events')
        .update({ type: 'hacked' })
        .eq('id', eventId);
      appendOnly = updErr
        ? `✅ Bloqueado correctamente (${updErr.message})`
        : '❌ PERMITIÓ el UPDATE — revisar el trigger append-only';

      // Conteos por tabla para este tenant.
      for (const t of TABLES) {
        const { count, error } = await db
          .from(t)
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenant);
        counts[t] = error ? `error: ${error.message}` : (count ?? 0);
      }
    } catch (e) {
      fatal = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <main className='mx-auto max-w-3xl space-y-6 p-8'>
      <div>
        <h1 className='text-2xl font-bold'>Prueba de Supabase · empresa-os</h1>
        <p className='text-muted-foreground text-sm'>
          Cliente <code>service_role</code> (servidor). Verifica el esquema sin login de Clerk.
          tenant de prueba: <code className='rounded bg-muted px-1'>{tenant}</code>
        </p>
      </div>

      {!hasEnv && (
        <div className='rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm'>
          <p className='font-semibold'>Faltan variables de entorno.</p>
          <p className='mt-1'>
            Pega <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>SUPABASE_SERVICE_ROLE_KEY</code> en{' '}
            <code>.env.local</code> y reinicia <code>npm run dev</code>.
          </p>
        </div>
      )}

      {fatal && (
        <div className='rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm'>
          <p className='font-semibold'>Error</p>
          <pre className='mt-1 whitespace-pre-wrap break-words'>{fatal}</pre>
          <p className='mt-2'>
            Si dice que una tabla no existe, corre primero el SQL de{' '}
            <code>supabase/migrations/0001_init_multitenant.sql</code> en el SQL Editor de Supabase.
          </p>
        </div>
      )}

      {hasEnv && !fatal && (
        <>
          <section className='space-y-2'>
            <h2 className='text-lg font-semibold'>Inserción de la cadena completa</h2>
            <ul className='divide-y rounded-lg border'>
              {steps.map((s) => (
                <li key={s.label} className='flex items-center justify-between gap-4 p-3 text-sm'>
                  <span>
                    {s.ok ? '✅' : '❌'} {s.label}
                  </span>
                  <code className='text-muted-foreground truncate'>{s.detail}</code>
                </li>
              ))}
            </ul>
          </section>

          <section className='space-y-2'>
            <h2 className='text-lg font-semibold'>Append-only (events)</h2>
            <p className='rounded-lg border p-3 text-sm'>{appendOnly}</p>
          </section>

          <section className='space-y-2'>
            <h2 className='text-lg font-semibold'>Conteo de filas de este tenant</h2>
            <ul className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
              {TABLES.map((t) => (
                <li key={t} className='rounded-lg border p-3 text-center text-sm'>
                  <div className='font-mono text-lg'>{String(counts[t] ?? '—')}</div>
                  <div className='text-muted-foreground'>{t}</div>
                </li>
              ))}
            </ul>
          </section>

          <p className='text-muted-foreground text-xs'>
            Recarga la página para crear otra cadena con un tenant nuevo. Cada carga inserta datos
            de prueba; bórralos desde Supabase cuando quieras (ojo: <code>events</code> es
            append-only, así que para limpiar un tenant hay que borrar primero sus events con un
            query directo).
          </p>
        </>
      )}
    </main>
  );
}
