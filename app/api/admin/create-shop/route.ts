import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Création d'une boutique. Gère aussi le rattachement du patron :
 * - ownerMode = 'existing' : lie la boutique à un patron déjà présent en base
 *   (owner_shops), pour qu'il garde une seule interface /owner pour toutes
 *   ses boutiques.
 * - ownerMode = 'new' : crée un nouveau compte patron puis le lie.
 * - ownerMode = 'none' : aucune liaison pour l'instant.
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
    const {
      name, address, phone, subscriptionEndDate,
      managerName, managerEmail, managerPassword,
      ownerMode, existingOwnerId, ownerName, ownerEmail, ownerPassword
    } = body;

    if (!name || !managerEmail || !managerPassword) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }
    if (ownerMode === 'existing' && !existingOwnerId) {
      return NextResponse.json({ error: 'Aucun patron sélectionné' }, { status: 400 });
    }
    if (ownerMode === 'new' && (!ownerName || !ownerEmail || !ownerPassword)) {
      return NextResponse.json({ error: 'Champs du nouveau patron manquants' }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Compte manager
    const { data: newManager, error: managerError } = await admin.auth.admin.createUser({
      email: managerEmail,
      password: managerPassword,
      email_confirm: true
    });
    if (managerError || !newManager.user) {
      return NextResponse.json({ error: managerError?.message ?? 'Erreur création du manager' }, { status: 400 });
    }

    // 2. Boutique
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

    // 3. Profil manager lié à la boutique
    const { error: managerProfileError } = await admin.from('profiles').insert({
      id: newManager.user.id,
      full_name: managerName,
      role: 'manager',
      shop_id: shop.id
    });
    if (managerProfileError) {
      return NextResponse.json({ error: managerProfileError.message }, { status: 400 });
    }

    // 4. Patron (selon le mode choisi)
    let ownerId: string | null = null;

    if (ownerMode === 'existing') {
      ownerId = existingOwnerId;
    } else if (ownerMode === 'new') {
      const { data: newOwner, error: ownerError } = await admin.auth.admin.createUser({
        email: ownerEmail,
        password: ownerPassword,
        email_confirm: true
      });
      if (ownerError || !newOwner.user) {
        return NextResponse.json({ error: ownerError?.message ?? 'Erreur création du patron' }, { status: 400 });
      }
      const { error: ownerProfileError } = await admin.from('profiles').insert({
        id: newOwner.user.id,
        full_name: ownerName,
        role: 'owner'
      });
      if (ownerProfileError) {
        return NextResponse.json({ error: ownerProfileError.message }, { status: 400 });
      }
      ownerId = newOwner.user.id;
    }

    if (ownerId) {
      const { error: linkError } = await admin.from('owner_shops').insert({ owner_id: ownerId, shop_id: shop.id });
      if (linkError) {
        return NextResponse.json({ error: linkError.message }, { status: 400 });
      }
      await admin.from('shops').update({ owner_id: ownerId }).eq('id', shop.id);
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
