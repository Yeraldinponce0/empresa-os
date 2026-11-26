import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { YelizzOverviewData } from '@/features/yelizz/queries';

/**
 * Vista (presentacional) de la organización Yelizz: departamentos → agentes →
 * tareas. Recibe los datos ya cargados desde Supabase; no hace fetching, así
 * que sirve tanto para la página del dashboard como para la vista previa.
 */
export function YelizzOverview({ data }: { data: YelizzOverviewData }) {
  const { organization, departments, agents, tasks } = data;

  if (!organization) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No se encontró la organización Yelizz</CardTitle>
          <CardDescription>
            Corre el seed: <code>node scripts/seed-yelizz.mjs</code>
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const tasksByAgent = (agentId: string) => tasks.filter((t) => t.agent_id === agentId);
  const agentsByDept = (deptId: string) => agents.filter((a) => a.department_id === deptId);

  const stats = [
    { label: 'Departamentos', value: departments.length },
    { label: 'Agentes', value: agents.length },
    { label: 'Tareas', value: tasks.length }
  ];

  return (
    <div className='space-y-6'>
      {/* Encabezado de la organización */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>{organization.name}</h2>
          <p className='text-muted-foreground text-sm'>
            tenant_id: <code>{organization.tenant_id}</code> · datos reales desde Supabase
          </p>
        </div>
        <div className='flex gap-2'>
          {stats.map((s) => (
            <div key={s.label} className='rounded-lg border px-4 py-2 text-center'>
              <div className='text-xl font-semibold'>{s.value}</div>
              <div className='text-muted-foreground text-xs'>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Departamentos con sus agentes y tareas */}
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {departments.map((dept) => {
          const deptAgents = agentsByDept(dept.id);
          return (
            <Card key={dept.id} className='flex flex-col'>
              <CardHeader>
                <CardTitle>{dept.name}</CardTitle>
                <CardDescription>
                  {deptAgents.length} agente{deptAgents.length === 1 ? '' : 's'}
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                {deptAgents.length === 0 && (
                  <p className='text-muted-foreground text-sm'>Sin agentes.</p>
                )}
                {deptAgents.map((agent) => {
                  const agentTasks = tasksByAgent(agent.id);
                  return (
                    <div key={agent.id} className='rounded-lg border p-3'>
                      <div className='flex items-center justify-between gap-2'>
                        <span className='font-medium'>{agent.name}</span>
                        <Badge variant='secondary'>{agent.role ?? '—'}</Badge>
                      </div>
                      <ul className='mt-2 space-y-1'>
                        {agentTasks.length === 0 && (
                          <li className='text-muted-foreground text-sm'>Sin tareas.</li>
                        )}
                        {agentTasks.map((task) => (
                          <li
                            key={task.id}
                            className='flex items-center justify-between gap-2 text-sm'
                          >
                            <Link
                              href={`/dashboard/yelizz/tasks/${task.id}`}
                              className='hover:underline'
                            >
                              {task.title}
                            </Link>
                            <Badge variant='outline'>{task.status}</Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
