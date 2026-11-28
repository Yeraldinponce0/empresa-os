'use server';

import { revalidatePath } from 'next/cache';

import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { YELIZZ_TENANT } from '@/features/yelizz/queries';

type Result = { ok: boolean; id?: string; error?: string };

export type AgentInput = {
  name: string;
  role: string;
  departmentId: string;
  definition: string;
  autonomy: number;
  budget: number | null;
  tools: string[];
  permissions: string[];
  status: string;
};

export type DepartmentInput = {
  name: string;
  objective: string;
  budget: number | null;
};

function cleanAgent(input: AgentInput) {
  return {
    tenant_id: YELIZZ_TENANT,
    name: input.name.trim(),
    role: input.role.trim() || null,
    department_id: input.departmentId,
    definition: input.definition.trim() || null,
    autonomy: Math.max(0, Math.min(4, Math.round(input.autonomy))),
    budget: input.budget,
    tools: input.tools,
    permissions: input.permissions,
    status: input.status || 'active'
  };
}

export async function createAgent(input: AgentInput): Promise<Result> {
  if (!input.name.trim()) return { ok: false, error: 'El nombre es obligatorio.' };
  if (!input.departmentId) return { ok: false, error: 'Elige un departamento.' };

  const db = createAdminSupabaseClient();
  const { data, error } = await db.from('agents').insert(cleanAgent(input)).select('id').single();
  if (error) return { ok: false, error: error.message };

  revalidatePath('/agentes');
  revalidatePath('/oficina');
  return { ok: true, id: (data as { id: string }).id };
}

export async function updateAgent(id: string, input: AgentInput): Promise<Result> {
  if (!input.name.trim()) return { ok: false, error: 'El nombre es obligatorio.' };
  if (!input.departmentId) return { ok: false, error: 'Elige un departamento.' };

  const db = createAdminSupabaseClient();
  const { name, ...rest } = cleanAgent(input);
  const { error } = await db
    .from('agents')
    .update({ name, ...rest })
    .match({ tenant_id: YELIZZ_TENANT, id });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/agentes');
  revalidatePath(`/agentes/${id}`);
  revalidatePath('/oficina');
  return { ok: true, id };
}

export async function createDepartment(input: DepartmentInput): Promise<Result> {
  if (!input.name.trim()) return { ok: false, error: 'El nombre es obligatorio.' };

  const db = createAdminSupabaseClient();
  // El departamento necesita la organización (raíz del tenant).
  const { data: org, error: orgErr } = await db
    .from('organizations')
    .select('id')
    .eq('tenant_id', YELIZZ_TENANT)
    .maybeSingle();
  if (orgErr) return { ok: false, error: orgErr.message };
  if (!org) return { ok: false, error: 'No se encontró la organización.' };

  const { data, error } = await db
    .from('departments')
    .insert({
      tenant_id: YELIZZ_TENANT,
      organization_id: (org as { id: string }).id,
      name: input.name.trim(),
      objective: input.objective.trim() || null,
      budget: input.budget
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath('/departamentos');
  revalidatePath('/oficina');
  return { ok: true, id: (data as { id: string }).id };
}

export async function updateDepartment(id: string, input: DepartmentInput): Promise<Result> {
  if (!input.name.trim()) return { ok: false, error: 'El nombre es obligatorio.' };

  const db = createAdminSupabaseClient();
  const { error } = await db
    .from('departments')
    .update({
      name: input.name.trim(),
      objective: input.objective.trim() || null,
      budget: input.budget
    })
    .match({ tenant_id: YELIZZ_TENANT, id });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/departamentos');
  revalidatePath(`/departamentos/${id}`);
  revalidatePath('/oficina');
  return { ok: true, id };
}
