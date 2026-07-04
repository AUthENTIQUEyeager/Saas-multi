import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Suspend, réactive ou change le statut d'abonnement d'une boutique.
 * Remplace l'Edge Function `suspend-shop` par une route Next.js (pas besoin
 * de CLI Supabase pour la déployer, elle part avec le reste du site).
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

    const { shopId, status } = await request.json();
    if (!shopId || !['active', 'suspended', 'expired', 'trial'].includes(status)) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin.from('shops').update({ subscription_status: status }).eq('id', shopId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await admin.from('audit_logs').insert({
      shop_id: shopId,
      user_id: user.id,
      action: `shop_status_changed_to_${status}`,
      target_table: 'shops',
      target_id: shopId
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
