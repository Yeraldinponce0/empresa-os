import Link from 'next/link';

import { OrkestaShell } from '@/features/oficina/components/orkesta-shell';
import { DepartmentForm } from '@/features/orkesta/components/department-form';

export const dynamic = 'force-dynamic';

export default function NuevoDepartamentoPage() {
  return (
    <OrkestaShell active='departamentos'>
      <div className='tarea-detail'>
        <Link href='/departamentos' className='coming-back'>
          ← Volver a Departamentos
        </Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '10px 0 4px' }}>Nuevo departamento</h1>
        <DepartmentForm />
      </div>
    </OrkestaShell>
  );
}
