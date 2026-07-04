-- ============================================
-- MIGRATION 0005 - Sécuriser process_sale + droits explicites
-- À exécuter après 0001, 0002, 0003, 0004
--
-- Deux corrections :
-- 1. process_sale ne vérifiait pas que p_shop_id correspondait bien à la
--    boutique de l'utilisateur connecté (faille : un employé aurait pu, en
--    théorie, passer le shop_id d'une autre boutique).
-- 2. On rend le droit d'exécution EXPLICITE pour éviter tout doute sur les
--    permissions par défaut de Postgres.
-- ============================================

create or replace function process_sale(
  p_shop_id uuid, p_local_uuid text, p_items jsonb, p_customer_id uuid, p_cashier_id uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_sale_id uuid;
  v_item jsonb;
begin
  if p_shop_id != public.jwt_shop_id() then
    raise exception 'Accès refusé : boutique invalide pour cet utilisateur';
  end if;

  select id into v_sale_id from sales where local_uuid = p_local_uuid;
  if v_sale_id is not null then
    return v_sale_id;
  end if;

  insert into sales (shop_id, customer_id, cashier_id, total_amount, local_uuid)
  values (p_shop_id, p_customer_id, p_cashier_id, 0, p_local_uuid)
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into sale_items (sale_id, product_id, quantity, unit_price)
    values (v_sale_id, (v_item->>'product_id')::uuid, (v_item->>'quantity')::int, (v_item->>'unit_price')::numeric);

    update products set stock_quantity = greatest(0, stock_quantity - (v_item->>'quantity')::int)
    where id = (v_item->>'product_id')::uuid and shop_id = p_shop_id;

    insert into stock_movements (shop_id, product_id, movement_type, quantity, reason, created_by)
    values (p_shop_id, (v_item->>'product_id')::uuid, 'out', (v_item->>'quantity')::int, 'Vente POS', p_cashier_id);
  end loop;

  update sales set total_amount = (
    select coalesce(sum(quantity * unit_price), 0) from sale_items where sale_id = v_sale_id
  ) where id = v_sale_id;

  insert into audit_logs (shop_id, user_id, action, target_table, target_id)
  values (p_shop_id, p_cashier_id, 'sale_created', 'sales', v_sale_id);

  return v_sale_id;
end;
$$;

grant execute on function process_sale to authenticated;

-- Idem pour les autres fonctions RPC, au cas où le droit par défaut ait été
-- révoqué manuellement à un moment donné dans le dashboard.
grant execute on function record_debt_payment to authenticated;
grant execute on function record_supplier_payment to authenticated;
grant execute on function record_stock_movement to authenticated;
grant execute on function public.has_permission to authenticated;
grant execute on function public.jwt_role to authenticated, anon;
grant execute on function public.jwt_shop_id to authenticated, anon;

-- Table customers : nécessaire pour l'upsert du client créé pendant une
-- vente hors-ligne (id fourni par le client plutôt que généré par la DB).
grant insert, update on customers to authenticated;

-- Policy UPDATE manquante sur customers (l'upsert utilisé par la synchro
-- offline en a besoin en cas de nouvelle tentative sur un client déjà créé).
drop policy if exists "customers_update" on customers;
create policy "customers_update" on customers for update using (
  shop_id = public.jwt_shop_id() and public.jwt_role() in ('manager', 'employee')
);
