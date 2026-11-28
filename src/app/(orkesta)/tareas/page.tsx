import Link from 'next/link';

import { OrkestaShell } from '@/features/oficina/components/orkesta-shell';
import { getTasksView } from '@/features/oficina/queries';

export const dynamic = 'force-dynamic';

const TONE: Record<string, string> = {
  green: 'var(--green)',
  amber: 'var(--amber)',
  dim: 'var(--dim)',
  muted: 'var(--muted)',
  violet: 'var(--violet)'
};

export default async function TareasPage({
  searchParams
}: {
  searchParams: Promise<{ agente?: string }>;
}) {
  const { agente } = await searchParams;
  const view = await getTasksView(agente);

  return (
    <OrkestaShell active='tareas'>
      <div className='tareas'>
        <div className='tareas-head'>
          <h1>Tareas</h1>
          <p className='loop-muted'>
            {view.filterAgentName
              ? `Tareas de ${view.filterAgentName}.`
              : 'Todas las tareas por agente y estado. Abre una para ejecutar el bucle.'}
          </p>
        </div>

        {/* Filtros por agente */}
        <div className='filters'>
          <Link href='/tareas' className={`chip${!view.filterAgentId ? ' on' : ''}`}>
            Todos
          </Link>
          {view.agents.map((a) => (
            <Link
              key={a.id}
              href={`/tareas?agente=${a.id}`}
              className={`chip${view.filterAgentId === a.id ? ' on' : ''}`}
            >
              {a.name}
            </Link>
          ))}
        </div>

        {/* Lista */}
        <div className='tasklist'>
          {view.tasks.length === 0 ? (
            <div className='empty'>
              No hay tareas{view.filterAgentName ? ` para ${view.filterAgentName}` : ''}.
            </div>
          ) : (
            view.tasks.map((t) => (
              <Link key={t.id} href={`/tareas/${t.id}`} className='taskrow'>
                <div className='taskrow-main'>
                  <div className='taskrow-title'>{t.title}</div>
                  <div className='taskrow-sub'>
                    {t.agentName} · {t.departmentName}
                  </div>
                </div>
                {t.hasPending && <span className='taskrow-pending'>Espera aprobación</span>}
                <span className='taskrow-status' style={{ color: TONE[t.status.tone] }}>
                  <span className='dot' style={{ background: TONE[t.status.tone] }} />
                  {t.status.label}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </OrkestaShell>
  );
}
