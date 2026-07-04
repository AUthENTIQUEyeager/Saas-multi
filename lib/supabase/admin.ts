import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Client Supabase "admin" - utilise la clé secrète/service_role.
 * NE JAMAIS importer ce fichier dans un composant client ("use client").
 * Réservé aux routes API / Server Actions qui vérifient elles-mêmes
 * que l'appelant est super_admin avant de s'en servir.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const secretKey = process.env.SUPABASE_SECRET_KEY!;

  return createSupabaseClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
