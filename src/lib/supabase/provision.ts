import 'server-only';

import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from './server';

/**
 * Garantiza que exista una fila en `organizations` para la organización activa
 * de Clerk del usuario. Es seguro llamarla en cada request: hace upsert por
 * tenant_id (el org_id de Clerk).
 *
 * Funciona bajo RLS sin cliente admin, porque el token de Clerk ya lleva el
 * org_id y la política de INSERT exige `tenant_id = current_tenant_id()`.
 *
 * Devuelve el id (uuid) de la organización, o null si el usuario no tiene una
 * organización activa en Clerk.
 *
 * Uso típico (p.ej. en un layout de servidor o al entrar al dashboard):
 *   const orgId = await ensureOrganization();
 */
export async function ensureOrganization(): Promise<string | null> {
  const { orgId, orgSlug } = await auth();
  if (!orgId) return null;

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('organizations')
    .upsert(
      { tenant_id: orgId, name: orgSlug ?? orgId, slug: orgSlug ?? null },
      { onConflict: 'tenant_id' }
    )
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}
