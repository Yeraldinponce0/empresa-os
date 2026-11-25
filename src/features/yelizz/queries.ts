import 'server-only';

import { createAdminSupabaseClient } from '@/lib/supabase/server';

/**
 * Tenant fijo de Yelizz. Es la primera organización del sistema.
 * (No usar los tenants aleatorios de /supabase-test.)
 */
export const YELIZZ_TENANT = 'yelizz';

export type Organization = {
  id: string;
  tenant_id: string;
  name: string;
  slug: string | null;
  created_at: string;
};

export type Department = {
  id: string;
  tenant_id: string;
  organization_id: string;
  name: string;
};

export type Agent = {
  id: string;
  tenant_id: string;
  department_id: string;
  name: string;
  role: string | null;
  status: string;
};

export type Task = {
  id: string;
  tenant_id: string;
  agent_id: string;
  title: string;
  status: string;
  priority: number;
  due_at: string | null;
  created_at: string;
};

export type YelizzOverviewData = {
  organization: Organization | null;
  departments: Department[];
  agents: Agent[];
  tasks: Task[];
};

/**
 * Lee la organización Yelizz con sus departamentos, agentes y tareas.
 *
 * Usa el cliente admin (service_role) en el servidor: así funciona sin login
 * de Clerk todavía, leyendo siempre el tenant fijo 'yelizz'. Cuando actives el
 * login, puedes cambiar a createServerSupabaseClient() para que el RLS filtre
 * por la organización del usuario.
 */
export async function getYelizzOverview(): Promise<YelizzOverviewData> {
  const db = createAdminSupabaseClient();

  const [orgRes, deptRes, agentRes, taskRes] = await Promise.all([
    db.from('organizations').select('*').eq('tenant_id', YELIZZ_TENANT).maybeSingle(),
    db.from('departments').select('*').eq('tenant_id', YELIZZ_TENANT).order('name'),
    db.from('agents').select('*').eq('tenant_id', YELIZZ_TENANT).order('name'),
    db.from('tasks').select('*').eq('tenant_id', YELIZZ_TENANT).order('created_at')
  ]);

  const firstError = orgRes.error || deptRes.error || agentRes.error || taskRes.error;
  if (firstError) {
    throw new Error(firstError.message);
  }

  return {
    organization: (orgRes.data as Organization) ?? null,
    departments: (deptRes.data as Department[]) ?? [],
    agents: (agentRes.data as Agent[]) ?? [],
    tasks: (taskRes.data as Task[]) ?? []
  };
}
