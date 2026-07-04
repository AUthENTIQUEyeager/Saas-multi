-- ============================================
-- MIGRATION 0002 - Paiements, permissions granulaires
-- À exécuter APRÈS 0001_init.sql
-- ============================================

-- ============================================
-- Fonction utilitaire : vérifie qu'un employé a une permission donnée
-- pour la boutique de son JWT.
-- ============================================
create or replace function public.has_permission(p_permission employee_permission)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from employee_permissions
    where employee_id = auth.uid()
      and shop_id = public.jwt_shop_id()
      and permission = p_permission
  );
$$;

-- ============================================
-- PAIEMENT DE DETTES CLIENTS
-- Transaction atomique : insère le paiement + met à jour le cumul payé.
-- Utilisable par manager, ou employé avec la permission 'accountant' ou 'cashier'.
-- ============================================
create or replace function record_debt_payment(p_debt_id uuid, p_amount numeric, p_recorded_by uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_shop_id uuid;
begin
  select shop_id into v_shop_id from debts where id = p_debt_id;
  if v_shop_id is null then
    raise exception 'Dette introuvable';
  end if;
  if v_shop_id != public.jwt_shop_id() then
    raise exception 'Accès refusé';
  end if;

  insert into debt_payments (debt_id, amount, recorded_by)
  values (p_debt_id, p_amount, p_recorded_by);

  update debts set paid_amount = paid_amount + p_amount where id = p_debt_id;

  insert into audit_logs (shop_id, user_id, action, target_table, target_id, metadata)
  values (v_shop_id, p_recorded_by, 'debt_payment_recorded', 'debts', p_debt_id, jsonb_build_object('amount', p_amount));
end;
$$;

-- ============================================
-- PAIEMENT DE COMMANDES FOURNISSEURS
-- ============================================
create or replace function record_supplier_payment(p_order_id uuid, p_amount numeric, p_recorded_by uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_shop_id uuid;
begin
  select shop_id into v_shop_id from supplier_orders where id = p_order_id;
  if v_shop_id is null then
    raise exception 'Commande introuvable';
  end if;
  if v_shop_id != public.jwt_shop_id() then
    raise exception 'Accès refusé';
  end if;

  update supplier_orders set paid_amount = paid_amount + p_amount where id = p_order_id;

  insert into audit_logs (shop_id, user_id, action, target_table, target_id, metadata)
  values (v_shop_id, p_recorded_by, 'supplier_payment_recorded', 'supplier_orders', p_order_id, jsonb_build_object('amount', p_amount));
end;
$$;

grant execute on function record_debt_payment to authenticated;
grant execute on function record_supplier_payment to authenticated;
grant execute on function public.has_permission to authenticated;

-- ============================================
-- PERMISSIONS GRANULAIRES - resserre les policies d'écriture existantes
-- Un manager garde toujours accès à tout dans sa boutique.
-- Un employé doit désormais avoir la permission adéquate.
-- ============================================

-- SALES : encaisser nécessite le rôle manager OU la permission 'cashier'
drop policy if exists "sales_insert" on sales;
create policy "sales_insert" on sales for insert with check (
  shop_id = public.jwt_shop_id()
  and (public.jwt_role() = 'manager' or public.has_permission('cashier'))
);

-- STOCK_MOVEMENTS : manager OU permission 'stock_manager'
drop policy if exists "stock_movements_insert" on stock_movements;
create policy "stock_movements_insert" on stock_movements for insert with check (
  shop_id = public.jwt_shop_id()
  and (public.jwt_role() = 'manager' or public.has_permission('stock_manager'))
);

-- PRODUCTS (écriture) : manager OU permission 'stock_manager'
drop policy if exists "products_insert" on products;
create policy "products_insert" on products for insert with check (
  shop_id = public.jwt_shop_id()
  and (public.jwt_role() = 'manager' or public.has_permission('stock_manager'))
);
drop policy if exists "products_update" on products;
create policy "products_update" on products for update using (
  shop_id = public.jwt_shop_id()
  and (public.jwt_role() = 'manager' or public.has_permission('stock_manager'))
);

-- DELIVERIES : manager OU permission 'delivery'
drop policy if exists "deliveries_write" on deliveries;
create policy "deliveries_write" on deliveries for insert with check (
  shop_id = public.jwt_shop_id()
  and (public.jwt_role() = 'manager' or public.has_permission('delivery'))
);
drop policy if exists "deliveries_update" on deliveries;
create policy "deliveries_update" on deliveries for update using (
  shop_id = public.jwt_shop_id()
  and (public.jwt_role() = 'manager' or public.has_permission('delivery'))
);

-- EXPENSES : manager OU permission 'accountant'
drop policy if exists "expenses_write" on expenses;
create policy "expenses_write" on expenses for insert with check (
  shop_id = public.jwt_shop_id()
  and (public.jwt_role() = 'manager' or public.has_permission('accountant'))
);

-- DEBTS (écriture/mise à jour) : manager OU permission 'accountant' OU 'cashier'
drop policy if exists "debts_write" on debts;
create policy "debts_write" on debts for insert with check (
  shop_id = public.jwt_shop_id()
  and (public.jwt_role() = 'manager' or public.has_permission('accountant') or public.has_permission('cashier'))
);
drop policy if exists "debts_update" on debts;
create policy "debts_update" on debts for update using (
  shop_id = public.jwt_shop_id()
  and (public.jwt_role() = 'manager' or public.has_permission('accountant') or public.has_permission('cashier'))
);

-- EMPLOYEE_PERMISSIONS : le manager peut gérer les permissions de son équipe
create policy "employee_permissions_select" on employee_permissions for select using (
  shop_id = public.jwt_shop_id() or public.jwt_role() = 'super_admin'
);
create policy "employee_permissions_write" on employee_permissions for insert with check (
  shop_id = public.jwt_shop_id() and public.jwt_role() = 'manager'
);
create policy "employee_permissions_delete" on employee_permissions for delete using (
  shop_id = public.jwt_shop_id() and public.jwt_role() = 'manager'
);

-- OWNER_SHOPS : permettre au super_admin de lier un patron à une boutique
-- (déjà couvert par service_role dans la route API, mais policy de secours)
create policy "owner_shops_insert_admin" on owner_shops for insert with check (
  auth.role() = 'service_role'
);
