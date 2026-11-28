import Link from 'next/link';
import { notFound } from 'next/navigation';

import { OrkestaShell } from '@/features/oficina/components/orkesta-shell';
import { AgentForm } from '@/features/orkesta/components/agent-form';
import {
  getAgentFull,
  getAgentHistory,
  listDepartmentsSimple
} from '@/features/orkesta/crud-queries';

export const dynamic = 'force-dynamic';

function fmt(dt: string) {
  return new Date(dt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

export default async function AgenteFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [agent, departments] = await Promise.all([getAgentFull(id), listDepartmentsSimple()]);
  if (!agent) notFound();
  const { items, cost } = await getAgentHistory(id);

  return (
    <OrkestaShell active='agentes'>
      <div className='tarea-detail'>
        <Link href='/agentes' className='coming-back'>
          ← Volver a Agentes
        </Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '10px 0 4px' }}>
          Ficha · {agent.name}
        </h1>

        <AgentForm agent={agent} departments={departments} />

        {/* Historial y costo */}
        <div className='pcard' style={{ marginTop: 14 }}>
          <div className='ph'>
            <h3>Historial y costo</h3>
          </div>
          <div className='costrow'>
            <div className='coststat'>
              <div className='k'>{cost.executions}</div>
              <small>Ejecuciones</small>
            </div>
            <div className='coststat'>
              <div className='k'>
                {cost.inputTokens}/{cost.outputTokens}
              </div>
              <small>Tokens in/out</small>
            </div>
            <div className='coststat'>
              <div className='k'>${cost.usdEstimate.toFixed(4)}</div>
              <small>Costo estimado (ref. Opus 5.5)</small>
            </div>
          </div>
          {items.length === 0 ? (
            <div className='empty' style={{ marginTop: 10 }}>
              Sin actividad todavía.
            </div>
          ) : (
            <ol className='loop-log' style={{ marginTop: 12 }}>
              {items.map((it) => (
                <li key={it.id}>
                  <span className='loop-when'>{fmt(it.createdAt)}</span>
                  <span>
                    {it.text} · <span className='loop-muted'>{it.taskTitle}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </OrkestaShell>
  );
}
