import Link from 'next/link';

import { OrkestaShell } from '@/features/oficina/components/orkesta-shell';
import { AgentForm } from '@/features/orkesta/components/agent-form';
import { listDepartmentsSimple } from '@/features/orkesta/crud-queries';

export const dynamic = 'force-dynamic';

export default async function NuevoAgentePage() {
  const departments = await listDepartmentsSimple();

  return (
    <OrkestaShell active='agentes'>
      <div className='tarea-detail'>
        <Link href='/agentes' className='coming-back'>
          ← Volver a Agentes
        </Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '10px 0 4px' }}>Nuevo agente</h1>
        <AgentForm departments={departments} />
      </div>
    </OrkestaShell>
  );
}
