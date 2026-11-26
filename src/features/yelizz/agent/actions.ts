'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';

import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { YELIZZ_TENANT } from '@/features/yelizz/queries';
import { runAgentBrain } from '@/features/yelizz/agent/brain';
import type { AgentRow, TaskRow } from '@/features/yelizz/agent/queries';

type ActionResult = { ok: boolean; error?: string };

function taskPath(taskId: string) {
  return `/dashboard/yelizz/tasks/${taskId}`;
}

async function approverLabel(): Promise<string> {
  try {
    const { userId } = await auth();
    return userId ?? 'humano';
  } catch {
    return 'humano';
  }
}

/** Guarda los datos (números de la semana) que el humano pega en la tarea. */
export async function saveTaskInput(taskId: string, inputData: string): Promise<ActionResult> {
  const db = createAdminSupabaseClient();
  const { error } = await db
    .from('tasks')
    .update({ input_data: inputData })
    .match({ tenant_id: YELIZZ_TENANT, id: taskId });
  if (error) return { ok: false, error: error.message };
  revalidatePath(taskPath(taskId));
  return { ok: true };
}

/**
 * Ejecuta el agente sobre la tarea: arma el prompt (definición + tarea + datos),
 * llama a Claude y guarda la PROPUESTA como evento + approval pendiente.
 * La respuesta NO se aplica sola: queda a la espera de aprobación.
 */
export async function executeTask(taskId: string, inputData: string): Promise<ActionResult> {
  const db = createAdminSupabaseClient();

  // Guarda el input más reciente antes de ejecutar.
  const { error: saveErr } = await db
    .from('tasks')
    .update({ input_data: inputData, status: 'running' })
    .match({ tenant_id: YELIZZ_TENANT, id: taskId });
  if (saveErr) return { ok: false, error: saveErr.message };

  // Carga tarea + agente.
  const { data: task, error: taskErr } = await db
    .from('tasks')
    .select('*')
    .eq('tenant_id', YELIZZ_TENANT)
    .eq('id', taskId)
    .maybeSingle();
  if (taskErr) return { ok: false, error: taskErr.message };
  if (!task) return { ok: false, error: 'Tarea no encontrada.' };
  const t = task as TaskRow;

  if (!inputData.trim()) {
    await db
      .from('tasks')
      .update({ status: 'pending' })
      .match({ tenant_id: YELIZZ_TENANT, id: taskId });
    return { ok: false, error: 'Pega primero los datos de la semana en el campo de texto.' };
  }

  const { data: agent, error: agErr } = await db
    .from('agents')
    .select('*')
    .eq('tenant_id', YELIZZ_TENANT)
    .eq('id', t.agent_id)
    .maybeSingle();
  if (agErr) return { ok: false, error: agErr.message };
  const a = agent as AgentRow | null;

  // Llama al cerebro (Claude).
  let brain;
  try {
    brain = await runAgentBrain({
      agentName: a?.name ?? 'Agente',
      agentRole: a?.role ?? null,
      agentDefinition: a?.definition ?? null,
      taskTitle: t.title,
      inputData
    });
  } catch (e) {
    await db
      .from('tasks')
      .update({ status: 'pending' })
      .match({ tenant_id: YELIZZ_TENANT, id: taskId });
    return { ok: false, error: e instanceof Error ? e.message : 'Error llamando al modelo.' };
  }

  // Guarda la propuesta como EVENTO (append-only).
  const { data: event, error: evErr } = await db
    .from('events')
    .insert({
      tenant_id: YELIZZ_TENANT,
      task_id: taskId,
      type: 'propuesta',
      payload: {
        proposal: brain.proposal,
        model: brain.model,
        usage: brain.usage,
        input_snapshot: inputData
      }
    })
    .select('*')
    .single();
  if (evErr) return { ok: false, error: evErr.message };

  // Crea el APPROVAL pendiente ligado a esa propuesta.
  const { error: aprErr } = await db.from('approvals').insert({
    tenant_id: YELIZZ_TENANT,
    event_id: (event as { id: string }).id,
    status: 'pending'
  });
  if (aprErr) return { ok: false, error: aprErr.message };

  await db
    .from('tasks')
    .update({ status: 'awaiting_approval' })
    .match({ tenant_id: YELIZZ_TENANT, id: taskId });

  revalidatePath(taskPath(taskId));
  return { ok: true };
}

/**
 * Aprueba la propuesta: cierra el approval, escribe un evento, y guarda el
 * RESULT ligado a la tarea por la cadena approval → budget → result.
 */
export async function approveTask(approvalId: string, taskId: string): Promise<ActionResult> {
  const db = createAdminSupabaseClient();
  const who = await approverLabel();

  // Approval + su evento (para sacar la propuesta).
  const { data: approval, error: aprErr } = await db
    .from('approvals')
    .select('*')
    .eq('tenant_id', YELIZZ_TENANT)
    .eq('id', approvalId)
    .maybeSingle();
  if (aprErr) return { ok: false, error: aprErr.message };
  if (!approval) return { ok: false, error: 'Approval no encontrado.' };
  const eventId = (approval as { event_id: string }).event_id;

  const { data: propEvent } = await db
    .from('events')
    .select('payload')
    .eq('tenant_id', YELIZZ_TENANT)
    .eq('id', eventId)
    .maybeSingle();
  const proposal =
    (propEvent as { payload?: { proposal?: string } } | null)?.payload?.proposal ?? null;

  // 1) Cierra el approval.
  const { error: upErr } = await db
    .from('approvals')
    .update({ status: 'approved', approver: who, decided_at: new Date().toISOString() })
    .match({ tenant_id: YELIZZ_TENANT, id: approvalId });
  if (upErr) return { ok: false, error: upErr.message };

  // 2) Evento de decisión (append-only).
  const { error: evErr } = await db.from('events').insert({
    tenant_id: YELIZZ_TENANT,
    task_id: taskId,
    type: 'decision',
    payload: { decision: 'approved', approval_id: approvalId, approver: who }
  });
  if (evErr) return { ok: false, error: evErr.message };

  // 3) Budget-puente (la cadena result→budget→approval lo exige).
  const period = new Date().toISOString().slice(0, 7); // YYYY-MM
  const { data: budget, error: budErr } = await db
    .from('budgets')
    .insert({
      tenant_id: YELIZZ_TENANT,
      approval_id: approvalId,
      amount: 0,
      currency: 'COP',
      period
    })
    .select('id')
    .single();
  if (budErr) return { ok: false, error: budErr.message };

  // 4) Result ligado a la tarea (vía budget).
  const { error: resErr } = await db.from('results').insert({
    tenant_id: YELIZZ_TENANT,
    budget_id: (budget as { id: string }).id,
    outcome: 'approved',
    metrics: { task_id: taskId, approver: who, proposal }
  });
  if (resErr) return { ok: false, error: resErr.message };

  await db.from('tasks').update({ status: 'done' }).match({ tenant_id: YELIZZ_TENANT, id: taskId });

  revalidatePath(taskPath(taskId));
  return { ok: true };
}

/** Rechaza la propuesta: cierra el approval y lo registra como evento. */
export async function rejectTask(
  approvalId: string,
  taskId: string,
  reason: string
): Promise<ActionResult> {
  const db = createAdminSupabaseClient();
  const who = await approverLabel();

  const { error: upErr } = await db
    .from('approvals')
    .update({ status: 'rejected', approver: who, decided_at: new Date().toISOString() })
    .match({ tenant_id: YELIZZ_TENANT, id: approvalId });
  if (upErr) return { ok: false, error: upErr.message };

  const { error: evErr } = await db.from('events').insert({
    tenant_id: YELIZZ_TENANT,
    task_id: taskId,
    type: 'decision',
    payload: { decision: 'rejected', approval_id: approvalId, approver: who, reason }
  });
  if (evErr) return { ok: false, error: evErr.message };

  await db
    .from('tasks')
    .update({ status: 'rejected' })
    .match({ tenant_id: YELIZZ_TENANT, id: taskId });

  revalidatePath(taskPath(taskId));
  return { ok: true };
}
