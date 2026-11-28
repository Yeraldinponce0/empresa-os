import Link from 'next/link';

import { OrkestaShell } from '@/features/oficina/components/orkesta-shell';
import { listDepartments } from '@/features/orkesta/crud-queries';

export const dynamic = 'force-dynamic';

function money(n: number | null) {
  return n != null ? `$${n.toLocaleString('es-CO')}` : '—';
}

export default async function DepartamentosPage() {
  const depts = await listDepartments();

  return (
    <OrkestaShell active='departamentos'>
      <div className='tareas'>
        <div className='listhead'>
          <div>
            <h1>Departamentos</h1>
            <p className='loop-muted'>
              Áreas del negocio. Abre uno para ver sus agentes y editarlo.
            </p>
          </div>
          <Link href='/departamentos/nuevo' className='btn ok btn-link'>
            + Nuevo departamento
          </Link>
        </div>

        <div className='tasklist'>
          {depts.length === 0 ? (
            <div className='empty'>Aún no hay departamentos.</div>
          ) : (
            depts.map((d) => (
              <Link key={d.id} href={`/departamentos/${d.id}`} className='taskrow'>
                <div className='taskrow-main'>
                  <div className='taskrow-title'>{d.name}</div>
                  <div className='taskrow-sub'>
                    {d.objective
                      ? `${d.objective.slice(0, 70)}${d.objective.length > 70 ? '…' : ''}`
                      : 'Sin objetivo'}
                    {' · '}
                    Presupuesto: {money(d.budget)}
                  </div>
                </div>
                <span className='taskrow-status'>
                  {d.agentCount} agente{d.agentCount === 1 ? '' : 's'}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </OrkestaShell>
  );
}
