'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { executeTask, approveTask, rejectTask } from '@/features/yelizz/agent/actions';
import type { TaskDetail } from '@/features/yelizz/agent/queries';

function fmt(dt: string) {
  return new Date(dt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

const STATUS_LABEL: Record<
  string,
  { text: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  pending: { text: 'Pendiente', variant: 'outline' },
  running: { text: 'Ejecutando…', variant: 'secondary' },
  awaiting_approval: { text: 'Espera aprobación', variant: 'default' },
  done: { text: 'Aprobada', variant: 'secondary' },
  rejected: { text: 'Rechazada', variant: 'destructive' }
};

export function TaskRunner({ detail }: { detail: TaskDetail }) {
  const router = useRouter();
  const { task, agent, events, proposalEvent, approval } = detail;

  const [input, setInput] = useState(task.input_data ?? '');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const proposal = (proposalEvent?.payload?.proposal as string | undefined) ?? null;
  const usage = proposalEvent?.payload?.usage as
    | { input_tokens: number; output_tokens: number }
    | undefined;
  const model = proposalEvent?.payload?.model as string | undefined;
  const isPendingApproval = approval?.status === 'pending';

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? 'Algo falló.');
      else router.refresh();
    });
  }

  const st = STATUS_LABEL[task.status] ?? { text: task.status, variant: 'outline' as const };

  return (
    <div className='space-y-6'>
      {/* Cabecera de la tarea */}
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h1 className='text-xl font-bold tracking-tight'>{task.title}</h1>
          <p className='text-muted-foreground text-sm'>
            Agente: <span className='font-medium'>{agent?.name ?? '—'}</span>
            {agent?.role ? ` · ${agent.role}` : ''}
          </p>
        </div>
        <Badge variant={st.variant}>{st.text}</Badge>
      </div>

      {/* 1) Datos de entrada + Ejecutar */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Datos de la semana</CardTitle>
          <CardDescription>
            Pega aquí los números a mano (gasto, compras, CPA, ROAS, CTR, CPM, y el número mágico /
            break-even). No se conecta Meta ni Shopify todavía.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={8}
            placeholder={
              'Ej.:\nGasto semana: $210.000 COP\nCompras (pixel): 7\nCPA pixel: $30.000\nNúmero mágico (break-even): $45.000\nCTR: 1,2% · CPM: $18.000\nVentas reales confirmadas (COD): 4'
            }
            className='font-mono text-sm'
          />
          <div className='flex items-center gap-2'>
            <Button
              onClick={() => run(() => executeTask(task.id, input))}
              disabled={pending || !input.trim()}
            >
              {pending ? 'Ejecutando…' : '▶ Ejecutar agente'}
            </Button>
            <span className='text-muted-foreground text-xs'>
              Arma el prompt con la definición del agente + la tarea + estos datos y llama a Claude.
            </span>
          </div>
          {error && <p className='text-destructive text-sm'>⚠ {error}</p>}
        </CardContent>
      </Card>

      {/* 2) Propuesta del agente + Aprobar / Rechazar */}
      {proposal && (
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Propuesta del agente</CardTitle>
            <CardDescription>
              {model ? `Modelo: ${model}` : null}
              {usage ? ` · ${usage.input_tokens} tokens in / ${usage.output_tokens} out` : null}
              {proposalEvent ? ` · ${fmt(proposalEvent.created_at)}` : null}
              {' · '}
              No se aplica sola: tú apruebas o rechazas.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='bg-muted/40 max-h-[460px] overflow-auto rounded-lg border p-4 text-sm whitespace-pre-wrap'>
              {proposal}
            </div>

            {isPendingApproval ? (
              <div className='space-y-3'>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder='Motivo (opcional, se guarda si rechazas)'
                  className='text-sm'
                />
                <div className='flex gap-2'>
                  <Button
                    onClick={() => run(() => approveTask(approval!.id, task.id))}
                    disabled={pending}
                  >
                    ✓ Aprobar
                  </Button>
                  <Button
                    variant='destructive'
                    onClick={() => run(() => rejectTask(approval!.id, task.id, reason))}
                    disabled={pending}
                  >
                    ✕ Rechazar
                  </Button>
                </div>
              </div>
            ) : approval ? (
              <Badge variant={approval.status === 'approved' ? 'secondary' : 'destructive'}>
                {approval.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                {approval.approver ? ` · ${approval.approver}` : ''}
                {approval.decided_at ? ` · ${fmt(approval.decided_at)}` : ''}
              </Badge>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* 3) Historial de eventos (log append-only) */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Historial de eventos</CardTitle>
          <CardDescription>Log append-only: no se edita ni se borra.</CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className='text-muted-foreground text-sm'>Sin eventos todavía.</p>
          ) : (
            <ol className='space-y-2'>
              {events.map((ev) => {
                const decision = (ev.payload?.decision as string | undefined) ?? null;
                const evApprover = (ev.payload?.approver as string | undefined) ?? null;
                const evReason = (ev.payload?.reason as string | undefined) ?? null;
                return (
                  <li key={ev.id} className='flex items-start gap-3 text-sm'>
                    <span className='text-muted-foreground w-32 shrink-0 tabular-nums'>
                      {fmt(ev.created_at)}
                    </span>
                    <span className='flex-1'>
                      <Badge variant='outline' className='mr-2'>
                        {ev.type}
                      </Badge>
                      {ev.type === 'propuesta' && 'El agente generó una propuesta.'}
                      {ev.type === 'decision' &&
                        (decision === 'approved'
                          ? `Aprobada${evApprover ? ` por ${evApprover}` : ''}.`
                          : `Rechazada${evReason ? `: ${evReason}` : ''}.`)}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          <Separator className='my-3' />
          <p className='text-muted-foreground text-xs'>
            Autonomía baja: el agente propone, el humano aprueba. Al aprobar se guarda un result
            ligado a la tarea.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
