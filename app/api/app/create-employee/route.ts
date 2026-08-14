import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { EmployeePermission, UserRole } from '@/lib/types';

/**
 * Création d'un compte utilisateur par un manager (employé ou vendeur)
 * Réservé au manager de la boutique concernée - vérifié via son profil.
 */
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('role, shop_id').eq('id', user.id).single();
    if (profile?.role !== 'manager' || !profile.shop_id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const { fullName, email, password, role, permissions } = (await request.json()) as {
      fullName: string;
      email: string;
      password: string;
      role: UserRole;
      permissions?: EmployeePermission[];
    };

    if (!fullName || !email || !password) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }

    // Validate role
    if (!['employee', 'vendeur'].includes(role)) {
      return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: newUser, error: userError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (userError || !newUser.user) {
      return NextResponse.json({ error: userError?.message ?? 'Erreur création utilisateur' }, { status: 400 });
    }

    const { error: profileError } = await admin.from('profiles').insert({
      id: newUser.user.id,
      full_name: fullName,
      role: role, // Use the selected role
      shop_id: profile.shop_id
    });
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    // Only add permissions for employee role (not for vendeur)
    if (role === 'employee' && permissions?.length) {
      const rows = permissions.map((permission) => ({
        employee_id: newUser.user.id,
        shop_id: profile.shop_id,
        permission
      }));
      const { error: permError } = await admin.from('employee_permissions').insert(rows);
      if (permError) {
        return NextResponse.json({ error: permError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
