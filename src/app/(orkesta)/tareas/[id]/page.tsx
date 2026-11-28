import Link from 'next/link';
import { notFound } from 'next/navigation';

import { OrkestaShell } from '@/features/oficina/components/orkesta-shell';
import { TaskLoop } from '@/features/oficina/components/task-loop';
import { getTaskDetail } from '@/features/yelizz/agent/queries';

export const dynamic = 'force-dynamic';

export default async function TareaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getTaskDetail(id);
  if (!detail) notFound();

  return (
    <OrkestaShell active='tareas'>
      <div className='tarea-detail'>
        <Link href='/tareas' className='coming-back'>
          ← Volver a Tareas
        </Link>
        <TaskLoop detail={detail} />
      </div>
    </OrkestaShell>
  );
}
