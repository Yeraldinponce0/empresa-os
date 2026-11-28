import 'server-only';

import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { YELIZZ_TENANT } from '@/features/yelizz/queries';
import { taskStatusDisplay, type DisplayStatus } from '@/features/oficina/queries';

type Row = Record<string, any>;

// --- Tipos ---
export type AgentFull = {
  id: string;
  name: string;
  role: string | null;
  status: string;
  definition: string | null;
  autonomy: number;
  budget: number | null;
  tools: string[];
  permissions: string[];
  departmentId: string;
};

export type AgentListItem = {
  id: string;
  name: string;
  role: string | null;
  status: DisplayStatus;
  departmentName: string;
  autonomy: number;
  taskCount: number;
};

export type AgentHistoryItem = {
  id: string;
  type: string;
  taskTitle: string;
  text: string;
  createdAt: string;
};

export type AgentCost = {
  executions: number;
  inputTokens: number;
  outputTokens: number;
  usdEstimate: number;
};

export type DepartmentListItem = {
  id: string;
  name: string;
  objective: string | null;
  budget: number | null;
  agentCount: number;
};

export type DepartmentDetail = {
  id: string;
  name: string;
  objective: string | null;
  budget: number | null;
  agents: { id: string; name: string; role: string | null; status: string }[];
};

function agentStatusDisplay(status: string): DisplayStatus {
  if (status === 'active') return { label: 'Activo', tone: 'green' };
  if (status === 'paused') return { label: 'En pausa', tone: 'dim' };
  return { label: status, tone: 'muted' };
}

function toArr(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}

// --- Agentes ---
export async function listAgents(): Promise<AgentListItem[]> {
  const db = createAdminSupabaseClient();
  const [agentRes, deptRes, taskRes] = await Promise.all([
    db.from('agents').select('*').eq('tenant_id', YELIZZ_TENANT).order('name'),
    db.from('departments').select('id, name').eq('tenant_id', YELIZZ_TENANT),
    db.from('tasks').select('agent_id').eq('tenant_id', YELIZZ_TENANT)
  ]);
  const err = agentRes.error || deptRes.error || taskRes.error;
  if (err) throw new Error(err.message);

  const depts = new Map(((deptRes.data as Row[]) ?? []).map((d) => [d.id, d.name]));
  const counts = new Map<string, number>();
  for (const t of (taskRes.data as Row[]) ?? []) {
    counts.set(t.agent_id, (counts.get(t.agent_id) ?? 0) + 1);
  }

  return ((agentRes.data as Row[]) ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    role: a.role ?? null,
    status: agentStatusDisplay(a.status),
    departmentName: depts.get(a.department_id) ?? '—',
    autonomy: a.autonomy ?? 1,
    taskCount: counts.get(a.id) ?? 0
  }));
}

export async function getAgentFull(id: string): Promise<AgentFull | null> {
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from('agents')
    .select('*')
    .eq('tenant_id', YELIZZ_TENANT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const a = data as Row;
  return {
    id: a.id,
    name: a.name,
    role: a.role ?? null,
    status: a.status,
    definition: a.definition ?? null,
    autonomy: a.autonomy ?? 1,
    budget: a.budget != null ? Number(a.budget) : null,
    tools: toArr(a.tools),
    permissions: toArr(a.permissions),
    departmentId: a.department_id
  };
}

export async function getAgentHistory(
  agentId: string
): Promise<{ items: AgentHistoryItem[]; cost: AgentCost }> {
  const db = createAdminSupabaseClient();

  const { data: tasks, error: tErr } = await db
    .from('tasks')
    .select('id, title')
    .eq('tenant_id', YELIZZ_TENANT)
    .eq('agent_id', agentId);
  if (tErr) throw new Error(tErr.message);
  const taskRows = (tasks as Row[]) ?? [];
  const titleById = new Map(taskRows.map((t) => [t.id, t.title]));
  const taskIds = taskRows.map((t) => t.id);

  let items: AgentHistoryItem[] = [];
  const cost: AgentCost = { executions: 0, inputTokens: 0, outputTokens: 0, usdEstimate: 0 };

  if (taskIds.length) {
    const { data: events, error: eErr } = await db
      .from('events')
      .select('*')
      .eq('tenant_id', YELIZZ_TENANT)
      .in('task_id', taskIds)
      .order('created_at', { ascending: false })
      .limit(20);
    if (eErr) throw new Error(eErr.message);

    for (const ev of (events as Row[]) ?? []) {
      const decision = ev.payload?.decision as string | undefined;
      if (ev.type === 'propuesta') {
        cost.executions += 1;
        const u = ev.payload?.usage as
          | { input_tokens?: number; output_tokens?: number }
          | undefined;
        cost.inputTokens += u?.input_tokens ?? 0;
        cost.outputTokens += u?.output_tokens ?? 0;
      }
      items.push({
        id: ev.id,
        type: ev.type,
        taskTitle: titleById.get(ev.task_id) ?? '—',
        text:
          ev.type === 'propuesta'
            ? 'Generó una propuesta'
            : decision === 'approved'
              ? 'Propuesta aprobada'
              : 'Propuesta rechazada',
        createdAt: ev.created_at
      });
    }
  }

  // Estimación en USD con tarifa de referencia Claude Opus 5.5 ($4 in / $20 out por 1M).
  cost.usdEstimate = (cost.inputTokens / 1_000_000) * 4 + (cost.outputTokens / 1_000_000) * 20;

  return { items, cost };
}

// --- Departamentos ---
export async function listDepartments(): Promise<DepartmentListItem[]> {
  const db = createAdminSupabaseClient();
  const [deptRes, agentRes] = await Promise.all([
    db.from('departments').select('*').eq('tenant_id', YELIZZ_TENANT).order('name'),
    db.from('agents').select('department_id').eq('tenant_id', YELIZZ_TENANT)
  ]);
  const err = deptRes.error || agentRes.error;
  if (err) throw new Error(err.message);

  const counts = new Map<string, number>();
  for (const a of (agentRes.data as Row[]) ?? []) {
    counts.set(a.department_id, (counts.get(a.department_id) ?? 0) + 1);
  }
  return ((deptRes.data as Row[]) ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    objective: d.objective ?? null,
    budget: d.budget != null ? Number(d.budget) : null,
    agentCount: counts.get(d.id) ?? 0
  }));
}

export async function getDepartmentDetail(id: string): Promise<DepartmentDetail | null> {
  const db = createAdminSupabaseClient();
  const { data: dept, error } = await db
    .from('departments')
    .select('*')
    .eq('tenant_id', YELIZZ_TENANT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!dept) return null;

  const { data: agents, error: aErr } = await db
    .from('agents')
    .select('id, name, role, status')
    .eq('tenant_id', YELIZZ_TENANT)
    .eq('department_id', id)
    .order('name');
  if (aErr) throw new Error(aErr.message);

  const d = dept as Row;
  return {
    id: d.id,
    name: d.name,
    objective: d.objective ?? null,
    budget: d.budget != null ? Number(d.budget) : null,
    agents: ((agents as Row[]) ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      role: a.role ?? null,
      status: a.status
    }))
  };
}

/** Lista simple de departamentos (para selects de formularios). */
export async function listDepartmentsSimple(): Promise<{ id: string; name: string }[]> {
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from('departments')
    .select('id, name')
    .eq('tenant_id', YELIZZ_TENANT)
    .order('name');
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map((d) => ({ id: d.id, name: d.name }));
}

export { taskStatusDisplay };
