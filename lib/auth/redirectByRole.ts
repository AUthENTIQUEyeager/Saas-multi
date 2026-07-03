import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Détermine l'URL de redirection après connexion en fonction du rôle
 * stocké dans la table profiles. Aucune sélection manuelle de rôle.
 */
export async function redirectByRole(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return '/login?error=profil_introuvable';
  }

  if (!profile.is_active) {
    return '/login?error=compte_desactive';
  }

  switch (profile.role) {
    case 'super_admin':
      return '/admin';
    case 'owner':
      return '/owner';
    case 'manager':
    case 'employee':
      return '/app';
    default:
      return '/login';
  }
}
