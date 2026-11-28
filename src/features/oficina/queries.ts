import 'server-only';

import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { YELIZZ_TENANT } from '@/features/yelizz/queries';
import { ZONE_POSITIONS, DEFAULT_ZONE_POS } from '@/features/oficina/config';

export type StatusTone = 'green' | 'amber' | 'dim' | 'muted' | 'violet';

export type DisplayStatus = { label: string; tone: StatusTone };

export type OfficeZone = {
  departmentId: string;
  agentId: string | null;
  name: string;
  agentName: string | null;
  status: DisplayStatus;
  x: number;
  y: number;
};

export type OfficeAgent = {
  id: string;
  name: string;
  role: string | null;
  status: DisplayStatus;
};

export type OfficeApproval = {
  approvalId: string;
  taskId: string;
  agentName: string;
  summary: string;
  createdAt: string;
};

export type OfficeEvent = {
  id: string;
  type: string;
  who: string;
  whoTone: StatusTone;
  text: string;
  createdAt: string;
};

export type OfficeKpi = {
  label: string;
  value: string;
  delta?: string;
  deltaUp?: boolean;
  tone?: 'green' | 'violet' | 'text';
};

export type OfficeData = {
  organizationName: string;
  objectivePct: number; // placeholder
  zones: OfficeZone[];
  agents: OfficeAgent[];
  pendingApprovals: OfficeApproval[];
  recentEvents: OfficeEvent[];
  kpis: OfficeKpi[];
  kpisArePlaceholder: boolean;
};

type Row = Record<string, any>;

function proposalSummary(proposal: string | null | undefined): string {
  if (!proposal) return 'propuso una recomendación';
  // Salta la línea de "RESPUESTA SIMULADA" y encabezados; toma la primera frase útil.
  const lines = proposal
    .split('\n')
    .map((l) => l.trim())
    .filter(
      (l) =>
        l &&
        !l.startsWith('⚠') &&
        !/^respuesta simulada/i.test(l) &&
        !/^\d+\.\s*(resumen|diagn|recomend|[aá]ngulos|supuestos)/i.test(l) &&
        !/^(sirve para probar|1\.|2\.|3\.|4\.|5\.)/i.test(l)
    );
  const first = lines[0] ?? 'propuso una recomendación';
  return first.length > 80 ? `${first.slice(0, 80)}…` : first;
}

export async function getOfficeData(): Promise<OfficeData> {
  const db = createAdminSupabaseClient();

  const [orgRes, deptRes, agentRes, taskRes, evRes, aprRes] = await Promise.all([
    db.from('organizations').select('name').eq('tenant_id', YELIZZ_TENANT).maybeSingle(),
    db.from('departments').select('*').eq('tenant_id', YELIZZ_TENANT).order('name'),
    db.from('agents').select('*').eq('tenant_id', YELIZZ_TENANT).order('name'),
    db.from('tasks').select('id, title, agent_id').eq('tenant_id', YELIZZ_TENANT),
    db
      .from('events')
      .select('*')
      .eq('tenant_id', YELIZZ_TENANT)
      .order('created_at', { ascending: false })
      .limit(8),
    db.from('approvals').select('*').eq('tenant_id', YELIZZ_TENANT).eq('status', 'pending')
  ]);

  const firstError =
    orgRes.error || deptRes.error || agentRes.error || taskRes.error || evRes.error || aprRes.error;
  if (firstError) throw new Error(firstError.message);

  const departments = (deptRes.data as Row[]) ?? [];
  const agents = (agentRes.data as Row[]) ?? [];
  const tasks = (taskRes.data as Row[]) ?? [];
  const recentEventsRaw = (evRes.data as Row[]) ?? [];
  const pending = (aprRes.data as Row[]) ?? [];

  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const agentById = new Map(agents.map((a) => [a.id, a]));

  // --- Approvals pendientes: trae sus eventos (propuesta) para sacar task + resumen ---
  const pendingEventIds = pending.map((p) => p.event_id);
  let eventsById = new Map<string, Row>();
  if (pendingEventIds.length) {
    const { data: pe, error: peErr } = await db
      .from('events')
      .select('id, task_id, payload')
      .eq('tenant_id', YELIZZ_TENANT)
      .in('id', pendingEventIds);
    if (peErr) throw new Error(peErr.message);
    eventsById = new Map(((pe as Row[]) ?? []).map((e) => [e.id, e]));
  }

  // Agentes con approval pendiente (para marcar "Espera aprobación").
  const agentsWithPending = new Set<string>();
  const pendingApprovals: OfficeApproval[] = [];
  for (const p of pending) {
    const ev = eventsById.get(p.event_id);
    const task = ev ? taskById.get(ev.task_id) : null;
    const agent = task ? agentById.get(task.agent_id) : null;
    if (agent) agentsWithPending.add(agent.id);
    pendingApprovals.push({
      approvalId: p.id,
      taskId: ev?.task_id ?? '',
      agentName: agent?.name ?? 'Agente',
      summary: proposalSummary(ev?.payload?.proposal),
      createdAt: p.created_at
    });
  }

  const displayFor = (agent: Row | null | undefined): DisplayStatus => {
    if (!agent) return { label: 'Sin agente', tone: 'muted' };
    if (agentsWithPending.has(agent.id)) return { label: 'Espera aprobación', tone: 'amber' };
    if (agent.status === 'paused') return { label: 'En pausa', tone: 'dim' };
    if (agent.status === 'active') return { label: 'Activo', tone: 'green' };
    return { label: agent.status ?? '—', tone: 'muted' };
  };

  // --- Zonas = departamentos reales con el estado de su agente ---
  const zones: OfficeZone[] = departments.map((d) => {
    const agent = agents.find((a) => a.department_id === d.id) ?? null;
    const pos = ZONE_POSITIONS[d.name] ?? DEFAULT_ZONE_POS;
    return {
      departmentId: d.id,
      agentId: agent?.id ?? null,
      name: d.name,
      agentName: agent?.name ?? null,
      status: displayFor(agent),
      x: pos.x,
      y: pos.y
    };
  });

  // --- Agentes ---
  const officeAgents: OfficeAgent[] = agents.map((a) => ({
    id: a.id,
    name: a.name,
    role: a.role ?? null,
    status: displayFor(a)
  }));

  // --- Pulso en vivo = últimos eventos ---
  const recentEvents: OfficeEvent[] = recentEventsRaw.map((ev) => {
    const task = taskById.get(ev.task_id);
    const agent = task ? agentById.get(task.agent_id) : null;
    const decision = ev.payload?.decision as string | undefined;
    if (ev.type === 'decision') {
      return {
        id: ev.id,
        type: ev.type,
        who: 'Tú',
        whoTone: 'green',
        text:
          decision === 'approved'
            ? 'aprobaste una propuesta · +1 resultado'
            : 'rechazaste una propuesta',
        createdAt: ev.created_at
      };
    }
    return {
      id: ev.id,
      type: ev.type,
      who: agent?.name ?? 'Agente',
      whoTone: 'violet',
      text: 'generó una propuesta · esperando revisión',
      createdAt: ev.created_at
    };
  });

  // --- KPIs: PLACEHOLDER (vendrán de Shopify/Meta) ---
  const kpis: OfficeKpi[] = [
    { label: 'Ventas (COD)', value: '4', delta: '+2', deltaUp: true, tone: 'green' },
    { label: 'CPA vs. mágico', value: '$30k', tone: 'green' },
    { label: 'ROAS', value: '2.4x', delta: '+0.3', deltaUp: true, tone: 'violet' },
    { label: 'Gasto semana', value: '$210k', tone: 'text' }
  ];

  return {
    organizationName: (orgRes.data as Row)?.name ?? 'Yelizz',
    objectivePct: 68, // placeholder
    zones,
    agents: officeAgents,
    pendingApprovals,
    recentEvents,
    kpis,
    kpisArePlaceholder: true
  };
}

// =====================================================================
// Pantalla Tareas (lista) — Parte C
// =====================================================================

export type TaskListItem = {
  id: string;
  title: string;
  agentId: string | null;
  agentName: string;
  departmentName: string;
  status: DisplayStatus;
  hasPending: boolean;
};

export type TasksView = {
  agents: { id: string; name: string }[];
  tasks: TaskListItem[];
  filterAgentId: string | null;
  filterAgentName: string | null;
};

/** Vocabulario único de estados de tarea. */
export function taskStatusDisplay(status: string): DisplayStatus {
  switch (status) {
    case 'pending':
      return { label: 'Pendiente', tone: 'dim' };
    case 'running':
      return { label: 'Ejecutando', tone: 'violet' };
    case 'awaiting_approval':
      return { label: 'Espera aprobación', tone: 'amber' };
    case 'done':
      return { label: 'Aprobada', tone: 'green' };
    case 'rejected':
      return { label: 'Rechazada', tone: 'muted' };
    default:
      return { label: status, tone: 'muted' };
  }
}

/** Lista de tareas (opcionalmente filtrada por agente), con agente/depto/estado. */
export async function getTasksView(agentId?: string): Promise<TasksView> {
  const db = createAdminSupabaseClient();

  const [deptRes, agentRes, taskRes, aprRes] = await Promise.all([
    db.from('departments').select('id, name').eq('tenant_id', YELIZZ_TENANT),
    db
      .from('agents')
      .select('id, name, department_id')
      .eq('tenant_id', YELIZZ_TENANT)
      .order('name'),
    db
      .from('tasks')
      .select('id, title, agent_id, status, created_at')
      .eq('tenant_id', YELIZZ_TENANT)
      .order('created_at', { ascending: false }),
    db.from('approvals').select('event_id').eq('tenant_id', YELIZZ_TENANT).eq('status', 'pending')
  ]);

  const err = deptRes.error || agentRes.error || taskRes.error || aprRes.error;
  if (err) throw new Error(err.message);

  const depts = (deptRes.data as Row[]) ?? [];
  const agents = (agentRes.data as Row[]) ?? [];
  const tasks = (taskRes.data as Row[]) ?? [];
  const pending = (aprRes.data as Row[]) ?? [];

  // Tareas con approval pendiente (vía evento).
  const pendingEventIds = pending.map((p) => p.event_id);
  let pendingTaskIds = new Set<string>();
  if (pendingEventIds.length) {
    const { data: pe, error: peErr } = await db
      .from('events')
      .select('task_id')
      .eq('tenant_id', YELIZZ_TENANT)
      .in('id', pendingEventIds);
    if (peErr) throw new Error(peErr.message);
    pendingTaskIds = new Set(((pe as Row[]) ?? []).map((e) => e.task_id));
  }

  const agentById = new Map(agents.map((a) => [a.id, a]));
  const deptById = new Map(depts.map((d) => [d.id, d]));

  let list: TaskListItem[] = tasks.map((t) => {
    const agent = agentById.get(t.agent_id);
    const dept = agent ? deptById.get(agent.department_id) : null;
    return {
      id: t.id,
      title: t.title,
      agentId: agent?.id ?? null,
      agentName: agent?.name ?? '—',
      departmentName: dept?.name ?? '—',
      status: taskStatusDisplay(t.status),
      hasPending: pendingTaskIds.has(t.id)
    };
  });

  let filterAgentName: string | null = null;
  if (agentId) {
    list = list.filter((t) => t.agentId === agentId);
    filterAgentName = (agentById.get(agentId) as Row | undefined)?.name ?? null;
  }

  return {
    agents: agents.map((a) => ({ id: a.id, name: a.name })),
    tasks: list,
    filterAgentId: agentId ?? null,
    filterAgentName
  };
}
