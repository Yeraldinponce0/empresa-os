'use client';

import { createClient } from '@supabase/supabase-js';
import { useSession } from '@clerk/nextjs';
import { useMemo } from 'react';

/**
 * Supabase client for the browser (Client Components).
 *
 * Auth is handled by Clerk, not Supabase Auth: every request carries the Clerk
 * session token, so Postgres RLS can read `tenant_id` from the JWT via the
 * `public.current_tenant_id()` function.
 *
 * Requires the Clerk <-> Supabase integration to be enabled and a `tenant_id`
 * claim in the Clerk session token (see supabase/README.md).
 *
 * Usage inside a Client Component:
 *   const supabase = useSupabaseBrowser();
 *   const { data, error } = await supabase.from('tasks').select('*');
 */
export function useSupabaseBrowser() {
  const { session } = useSession();

  return useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          async accessToken() {
            return (await session?.getToken()) ?? null;
          }
        }
      ),
    [session]
  );
}
