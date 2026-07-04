-- ============================================
-- MIGRATION 0004 - Mouvement de stock manuel
-- À exécuter après 0001, 0002, 0003
-- ============================================

create or replace function record_stock_movement(
  p_shop_id uuid, p_product_id uuid, p_movement_type text, p_quantity integer,
  p_reason text, p_created_by uuid
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_movement_type not in ('in', 'out') then
    raise exception 'Type de mouvement invalide';
  end if;
  if p_shop_id != public.jwt_shop_id() then
    raise exception 'Accès refusé';
  end if;

  insert into stock_movements (shop_id, product_id, movement_type, quantity, reason, created_by)
  values (p_shop_id, p_product_id, p_movement_type, p_quantity, p_reason, p_created_by);

  if p_movement_type = 'in' then
    update products set stock_quantity = stock_quantity + p_quantity
    where id = p_product_id and shop_id = p_shop_id;
  else
    update products set stock_quantity = greatest(0, stock_quantity - p_quantity)
    where id = p_product_id and shop_id = p_shop_id;
  end if;
end;
$$;

grant execute on function record_stock_movement to authenticated;
