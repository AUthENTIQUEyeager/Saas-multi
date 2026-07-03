// Edge Function : création d'une boutique + compte manager
// Action sensible réservée au super_admin - utilise la service_role key,
// jamais exposée côté client. Déployer avec :
//   supabase functions deploy create-shop

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401, headers: corsHeaders });
    }

    // Vérifie que l'appelant est bien authentifié ET super_admin
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401, headers: corsHeaders });
    }

    const { data: profile } = await supabaseAuth.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const { name, address, phone, subscriptionEndDate, managerName, managerEmail, managerPassword } = body;

    if (!name || !managerEmail || !managerPassword) {
      return new Response(JSON.stringify({ error: 'Champs obligatoires manquants' }), { status: 400, headers: corsHeaders });
    }

    // Client admin (service_role) pour les opérations privilégiées
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: managerEmail,
      password: managerPassword,
      email_confirm: true
    });
    if (userError || !newUser.user) {
      return new Response(JSON.stringify({ error: userError?.message ?? 'Erreur création utilisateur' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const { data: shop, error: shopError } = await supabaseAdmin
      .from('shops')
      .insert({ name, address, phone, subscription_end_date: subscriptionEndDate, subscription_status: 'trial' })
      .select()
      .single();
    if (shopError) {
      return new Response(JSON.stringify({ error: shopError.message }), { status: 400, headers: corsHeaders });
    }

    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: newUser.user.id,
      full_name: managerName,
      role: 'manager',
      shop_id: shop.id
    });
    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), { status: 400, headers: corsHeaders });
    }

    await supabaseAdmin.from('audit_logs').insert({
      shop_id: shop.id,
      user_id: user.id,
      action: 'shop_created',
      target_table: 'shops',
      target_id: shop.id
    });

    return new Response(JSON.stringify({ shop }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
