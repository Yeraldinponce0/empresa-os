import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

/**
 * Supabase client for Server Components, Route Handlers and Server Actions.
 *
 * Passes the Clerk session token so RLS applies with the current user's
 * `tenant_id`. Use this for anything that should respect per-tenant isolation.
 *
 * Usage (e.g. in a Server Component):
 *   const supabase = await createServerSupabaseClient();
 *   const { data } = await supabase.from('departments').select('*');
 */
export async function createServerSupabaseClient() {
  const { getToken } = await auth();

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      async accessToken() {
        return (await getToken()) ?? null;
      }
    }
  );
}

/**
 * Admin client using the service_role key. SERVER-ONLY.
 *
 * ⚠️ This client BYPASSES Row Level Security entirely. Use it only for trusted
 * backend work (seeding, cron jobs, webhooks) where you enforce tenant scoping
 * yourself. Never import it into client code and never expose the key.
 *
 * Note: the append-only trigger on `events` still blocks UPDATE/DELETE even for
 * this client, because triggers are not bypassed by service_role.
 */
export function createAdminSupabaseClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in the environment.');
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
