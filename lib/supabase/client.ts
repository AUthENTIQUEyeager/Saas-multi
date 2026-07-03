'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Client Supabase pour usage côté navigateur (Client Components).
 * Respecte automatiquement les policies RLS via le JWT de l'utilisateur connecté.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
