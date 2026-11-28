'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { approveTask, rejectTask } from '@/features/yelizz/agent/actions';

/**
 * Botones Aprobar/Rechazar de una approval pendiente. Disparan las MISMAS
 * server actions del bucle del Trafficker (approveTask / rejectTask) y refrescan.
 */
export function ApprovalActions({ approvalId, taskId }: { approvalId: string; taskId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setErr(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setErr(r.error ?? 'Falló.');
      else router.refresh();
    });
  }

  return (
    <>
      <div className='btns'>
        <button
          className='btn ok'
          disabled={pending || !taskId}
          onClick={() => run(() => approveTask(approvalId, taskId))}
        >
          {pending ? '…' : 'Aprobar'}
        </button>
        <button
          className='btn'
          disabled={pending || !taskId}
          onClick={() => run(() => rejectTask(approvalId, taskId, ''))}
        >
          Rechazar
        </button>
      </div>
      {err && <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 6 }}>⚠ {err}</div>}
    </>
  );
}
