import 'server-only';

import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { YELIZZ_TENANT } from '@/features/yelizz/queries';

export type AgentRow = {
  id: string;
  tenant_id: string;
  department_id: string;
  name: string;
  role: string | null;
  status: string;
  definition: string | null;
};

export type TaskRow = {
  id: string;
  tenant_id: string;
  agent_id: string;
  title: string;
  description: string | null;
  input_data: string | null;
  status: string;
  priority: number;
  due_at: string | null;
  created_at: string;
};

export type EventRow = {
  id: string;
  tenant_id: string;
  task_id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type ApprovalRow = {
  id: string;
  tenant_id: string;
  event_id: string;
  status: string; // pending | approved | rejected
  approver: string | null;
  decided_at: string | null;
  created_at: string;
};

export type TaskDetail = {
  task: TaskRow;
  agent: AgentRow | null;
  events: EventRow[];
  /** Última propuesta generada por el agente (evento type='propuesta'). */
  proposalEvent: EventRow | null;
  /** El approval ligado a esa propuesta (pending/approved/rejected). */
  approval: ApprovalRow | null;
};

/**
 * Lee todo lo que la pantalla de la tarea necesita, con el cliente admin
 * (service_role) y el tenant fijo de Yelizz. Un solo caso de punta a punta.
 */
export async function getTaskDetail(taskId: string): Promise<TaskDetail | null> {
  const db = createAdminSupabaseClient();

  const { data: task, error: taskErr } = await db
    .from('tasks')
    .select('*')
    .eq('tenant_id', YELIZZ_TENANT)
    .eq('id', taskId)
    .maybeSingle();
  if (taskErr) throw new Error(taskErr.message);
  if (!task) return null;

  const [{ data: agent, error: agErr }, { data: events, error: evErr }] = await Promise.all([
    db
      .from('agents')
      .select('*')
      .eq('tenant_id', YELIZZ_TENANT)
      .eq('id', (task as TaskRow).agent_id)
      .maybeSingle(),
    db
      .from('events')
      .select('*')
      .eq('tenant_id', YELIZZ_TENANT)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
  ]);
  if (agErr) throw new Error(agErr.message);
  if (evErr) throw new Error(evErr.message);

  const eventRows = (events as EventRow[]) ?? [];
  const proposalEvent = [...eventRows].reverse().find((e) => e.type === 'propuesta') ?? null;

  let approval: ApprovalRow | null = null;
  if (proposalEvent) {
    const { data: apr, error: aprErr } = await db
      .from('approvals')
      .select('*')
      .eq('tenant_id', YELIZZ_TENANT)
      .eq('event_id', proposalEvent.id)
      .maybeSingle();
    if (aprErr) throw new Error(aprErr.message);
    approval = (apr as ApprovalRow) ?? null;
  }

  return {
    task: task as TaskRow,
    agent: (agent as AgentRow) ?? null,
    events: eventRows,
    proposalEvent,
    approval
  };
}

/** Devuelve el id de la tarea central del Trafficker (para enlazarla). */
export async function getTraffickerTaskId(): Promise<string | null> {
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from('tasks')
    .select('id, title')
    .eq('tenant_id', YELIZZ_TENANT)
    .ilike('title', 'Analiza la pauta de la semana%')
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as { id: string } | null)?.id ?? null;
}
