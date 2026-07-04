import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Remplace l'Edge Function Supabase `create-shop` : même logique, mais
 * déployée automatiquement avec le reste du site sur Vercel (pas besoin
 * de CLI Supabase). Vérifie que l'appelant est bien super_admin via son
 * cookie de session, puis utilise la clé secrète pour créer le compte
 * manager et la boutique.
 */
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const body = await request.json();
    const { name, address, phone, subscriptionEndDate, managerName, managerEmail, managerPassword } = body;

    if (!name || !managerEmail || !managerPassword) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: newUser, error: userError } = await admin.auth.admin.createUser({
      email: managerEmail,
      password: managerPassword,
      email_confirm: true
    });
    if (userError || !newUser.user) {
      return NextResponse.json({ error: userError?.message ?? 'Erreur création utilisateur' }, { status: 400 });
    }

    const { data: shop, error: shopError } = await admin
      .from('shops')
      .insert({
        name,
        address: address || null,
        phone: phone || null,
        subscription_end_date: subscriptionEndDate || null,
        subscription_status: 'trial'
      })
      .select()
      .single();
    if (shopError) {
      return NextResponse.json({ error: shopError.message }, { status: 400 });
    }

    const { error: profileError } = await admin.from('profiles').insert({
      id: newUser.user.id,
      full_name: managerName,
      role: 'manager',
      shop_id: shop.id
    });
    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    await admin.from('audit_logs').insert({
      shop_id: shop.id,
      user_id: user.id,
      action: 'shop_created',
      target_table: 'shops',
      target_id: shop.id
    });

    return NextResponse.json({ shop }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
