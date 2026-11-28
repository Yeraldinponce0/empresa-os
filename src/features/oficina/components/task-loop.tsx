'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { executeTask, approveTask, rejectTask } from '@/features/yelizz/agent/actions';
import type { TaskDetail } from '@/features/yelizz/agent/queries';

function fmt(dt: string) {
  return new Date(dt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

const STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'var(--dim)' },
  running: { label: 'Ejecutando…', color: 'var(--violet)' },
  awaiting_approval: { label: 'Espera aprobación', color: 'var(--amber)' },
  done: { label: 'Aprobada', color: 'var(--green)' },
  rejected: { label: 'Rechazada', color: 'var(--red)' }
};

/**
 * El bucle del agente con estilo Orkesta: datos → Ejecutar → propuesta →
 * Aprobar/Rechazar → historial. Reusa las server actions del motor.
 */
export function TaskLoop({ detail }: { detail: TaskDetail }) {
  const router = useRouter();
  const { task, agent, events, proposalEvent, approval } = detail;

  const [input, setInput] = useState(task.input_data ?? '');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const proposal = (proposalEvent?.payload?.proposal as string | undefined) ?? null;
  const model = proposalEvent?.payload?.model as string | undefined;
  const usage = proposalEvent?.payload?.usage as
    | { input_tokens: number; output_tokens: number }
    | undefined;
  const isPendingApproval = approval?.status === 'pending';
  const st = STATUS[task.status] ?? { label: task.status, color: 'var(--muted)' };

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? 'Algo falló.');
      else router.refresh();
    });
  }

  return (
    <div className='loop'>
      <div className='loop-head'>
        <div>
          <h1>{task.title}</h1>
          <div className='loop-sub'>
            Agente: <b>{agent?.name ?? '—'}</b>
            {agent?.role ? ` · ${agent.role}` : ''}
          </div>
        </div>
        <span className='tstatus' style={{ color: st.color }}>
          <span className='dot' style={{ background: st.color }} />
          {st.label}
        </span>
      </div>

      {/* 1) Datos + Ejecutar */}
      <div className='pcard'>
        <div className='ph'>
          <h3>Datos de la semana</h3>
        </div>
        <p className='loop-muted'>
          Pega aquí los números a mano (gasto, compras, CPA, ROAS, CTR, CPM y el número mágico /
          break-even). No se conecta Meta ni Shopify todavía.
        </p>
        <textarea
          className='tarea-input'
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={7}
          placeholder={
            'Ej.:\nGasto semana: $210.000 COP\nCompras (pixel): 7\nCPA pixel: $30.000\nNúmero mágico: $45.000\nVentas reales (COD): 4'
          }
        />
        <div className='loop-actions'>
          <button
            className='btn ok'
            onClick={() => run(() => executeTask(task.id, input))}
            disabled={pending || !input.trim()}
          >
            {pending ? 'Ejecutando…' : '▶ Ejecutar agente'}
          </button>
          <span className='loop-muted'>
            Arma el prompt con la definición del agente + la tarea + estos datos y llama a Claude.
          </span>
        </div>
        {error && <p className='loop-err'>⚠ {error}</p>}
      </div>

      {/* 2) Propuesta + Aprobar/Rechazar */}
      {proposal && (
        <div className='pcard'>
          <div className='ph'>
            <h3>Propuesta del agente</h3>
          </div>
          <div className='loop-muted' style={{ marginBottom: 10 }}>
            {model ? `Modelo: ${model}` : null}
            {usage ? ` · ${usage.input_tokens} in / ${usage.output_tokens} out` : null}
            {proposalEvent ? ` · ${fmt(proposalEvent.created_at)}` : null} · no se aplica sola.
          </div>
          <div className='proposal'>{proposal}</div>

          {isPendingApproval ? (
            <div style={{ marginTop: 12 }}>
              <textarea
                className='tarea-input'
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder='Motivo (opcional, se guarda si rechazas)'
              />
              <div className='btns' style={{ marginTop: 10 }}>
                <button
                  className='btn ok'
                  onClick={() => run(() => approveTask(approval!.id, task.id))}
                  disabled={pending}
                >
                  ✓ Aprobar
                </button>
                <button
                  className='btn'
                  onClick={() => run(() => rejectTask(approval!.id, task.id, reason))}
                  disabled={pending}
                >
                  ✕ Rechazar
                </button>
              </div>
            </div>
          ) : approval ? (
            <div
              className='tstatus'
              style={{
                marginTop: 12,
                color: approval.status === 'approved' ? 'var(--green)' : 'var(--red)'
              }}
            >
              {approval.status === 'approved' ? '✓ Aprobada' : '✕ Rechazada'}
              {approval.approver ? ` · ${approval.approver}` : ''}
              {approval.decided_at ? ` · ${fmt(approval.decided_at)}` : ''}
            </div>
          ) : null}
        </div>
      )}

      {/* 3) Historial */}
      <div className='pcard'>
        <div className='ph'>
          <h3>Historial de eventos</h3>
        </div>
        {events.length === 0 ? (
          <div className='empty'>Sin eventos todavía.</div>
        ) : (
          <ol className='loop-log'>
            {events.map((ev) => {
              const decision = ev.payload?.decision as string | undefined;
              const who = (ev.payload?.approver as string | undefined) ?? null;
              const rsn = (ev.payload?.reason as string | undefined) ?? null;
              return (
                <li key={ev.id}>
                  <span className='loop-when'>{fmt(ev.created_at)}</span>
                  <span>
                    {ev.type === 'propuesta' && 'El agente generó una propuesta.'}
                    {ev.type === 'decision' &&
                      (decision === 'approved'
                        ? `Aprobada${who ? ` por ${who}` : ''}.`
                        : `Rechazada${rsn ? `: ${rsn}` : ''}.`)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        <p className='loop-muted' style={{ marginTop: 10 }}>
          Autonomía baja: el agente propone, el humano aprueba. Log append-only.
        </p>
      </div>
    </div>
  );
}
