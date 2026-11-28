import Link from 'next/link';

import { OrkestaShell } from '@/features/oficina/components/orkesta-shell';
import { listAgents } from '@/features/orkesta/crud-queries';
import { autonomyLabel } from '@/features/orkesta/crud-config';

export const dynamic = 'force-dynamic';

const TONE: Record<string, string> = {
  green: 'var(--green)',
  amber: 'var(--amber)',
  dim: 'var(--dim)',
  muted: 'var(--muted)',
  violet: 'var(--violet)'
};

export default async function AgentesPage() {
  const agents = await listAgents();

  return (
    <OrkestaShell active='agentes'>
      <div className='tareas'>
        <div className='listhead'>
          <div>
            <h1>Agentes</h1>
            <p className='loop-muted'>
              Lista de agentes del workspace. Abre uno para ver y editar su ficha.
            </p>
          </div>
          <Link href='/agentes/nuevo' className='btn ok btn-link'>
            + Nuevo agente
          </Link>
        </div>

        <div className='tasklist'>
          {agents.length === 0 ? (
            <div className='empty'>Aún no hay agentes.</div>
          ) : (
            agents.map((a) => (
              <Link key={a.id} href={`/agentes/${a.id}`} className='taskrow'>
                <div className='taskrow-main'>
                  <div className='taskrow-title'>{a.name}</div>
                  <div className='taskrow-sub'>
                    {a.role ?? '—'} · {a.departmentName} · {autonomyLabel(a.autonomy)} ·{' '}
                    {a.taskCount} tarea
                    {a.taskCount === 1 ? '' : 's'}
                  </div>
                </div>
                <span className='taskrow-status' style={{ color: TONE[a.status.tone] }}>
                  <span className='dot' style={{ background: TONE[a.status.tone] }} />
                  {a.status.label}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </OrkestaShell>
  );
}
