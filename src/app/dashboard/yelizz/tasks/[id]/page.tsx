import Link from 'next/link';
import { notFound } from 'next/navigation';

import PageContainer from '@/components/layout/page-container';
import { getTaskDetail } from '@/features/yelizz/agent/queries';
import { TaskRunner } from '@/features/yelizz/agent/components/task-runner';

// El layout del dashboard ya exige login (auth.protect()).
export const dynamic = 'force-dynamic';

export default async function YelizzTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getTaskDetail(id);
  if (!detail) notFound();

  return (
    <PageContainer
      pageTitle='Tarea del agente'
      pageDescription='Ejecuta el agente, revisa su propuesta y apruébala o recházala.'
    >
      <div className='space-y-4'>
        <Link href='/dashboard/yelizz' className='text-muted-foreground text-sm hover:underline'>
          ← Volver a Yelizz
        </Link>
        <TaskRunner detail={detail} />
      </div>
    </PageContainer>
  );
}
