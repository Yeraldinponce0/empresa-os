import Link from 'next/link';
import { notFound } from 'next/navigation';

import { OrkestaShell } from '@/features/oficina/components/orkesta-shell';
import { DepartmentForm } from '@/features/orkesta/components/department-form';
import { getDepartmentDetail } from '@/features/orkesta/crud-queries';

export const dynamic = 'force-dynamic';

export default async function DepartamentoDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dept = await getDepartmentDetail(id);
  if (!dept) notFound();

  return (
    <OrkestaShell active='departamentos'>
      <div className='tarea-detail'>
        <Link href='/departamentos' className='coming-back'>
          ← Volver a Departamentos
        </Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '10px 0 4px' }}>{dept.name}</h1>

        <DepartmentForm department={dept} />

        {/* Agentes del departamento */}
        <div className='pcard' style={{ marginTop: 14 }}>
          <div className='ph'>
            <h3>Agentes ({dept.agents.length})</h3>
            <Link href='/agentes/nuevo' className='ph-link'>
              + Agregar
            </Link>
          </div>
          {dept.agents.length === 0 ? (
            <div className='empty'>Sin agentes en este departamento.</div>
          ) : (
            <div className='tasklist'>
              {dept.agents.map((a) => (
                <Link key={a.id} href={`/agentes/${a.id}`} className='taskrow'>
                  <div className='taskrow-main'>
                    <div className='taskrow-title'>{a.name}</div>
                    <div className='taskrow-sub'>{a.role ?? '—'}</div>
                  </div>
                  <span className='taskrow-status'>
                    {a.status === 'active' ? 'Activo' : a.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </OrkestaShell>
  );
}
