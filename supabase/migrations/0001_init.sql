-- ============================================
-- MIGRATION INITIALE - Plateforme SaaS Multi-Boutiques
-- ============================================

create extension if not exists "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================
create type user_role as enum ('super_admin', 'owner', 'manager', 'employee');
create type employee_permission as enum ('cashier', 'stock_manager', 'delivery', 'accountant', 'manager_assistant');
create type order_status as enum ('pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled');
create type payment_status as enum ('paid', 'partial', 'unpaid');
create type expense_category as enum ('salary', 'rent', 'electricity', 'transport', 'purchase', 'other');
create type subscription_status as enum ('active', 'suspended', 'expired', 'trial');

-- ============================================
-- SHOPS
-- ============================================
create table shops (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text,
  phone text,
  logo_url text,
  subscription_status subscription_status not null default 'trial',
  subscription_end_date date,
  owner_id uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- PROFILES
-- ============================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null,
  shop_id uuid references shops(id),
  is_active boolean default true,
  created_at timestamptz default now()
);

create table owner_shops (
  owner_id uuid references auth.users(id) on delete cascade,
  shop_id uuid references shops(id) on delete cascade,
  primary key (owner_id, shop_id)
);

create table employee_permissions (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid references auth.users(id) on delete cascade,
  shop_id uuid references shops(id) on delete cascade,
  permission employee_permission not null,
  created_at timestamptz default now()
);

-- ============================================
-- PRODUITS & STOCK
-- ============================================
create table categories (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid references shops(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

create table products (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid references shops(id) on delete cascade not null,
  category_id uuid references categories(id),
  name text not null,
  barcode text,
  price numeric(12,2) not null,
  cost_price numeric(12,2),
  stock_quantity integer default 0,
  low_stock_threshold integer default 5,
  image_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table stock_movements (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid references shops(id) on delete cascade not null,
  product_id uuid references products(id) not null,
  movement_type text check (movement_type in ('in', 'out')) not null,
  quantity integer not null,
  reason text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- ============================================
-- CLIENTS & DETTES
-- ============================================
create table customers (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid references shops(id) on delete cascade not null,
  name text not null,
  phone text,
  created_at timestamptz default now()
);

create table debts (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid references shops(id) on delete cascade not null,
  customer_id uuid references customers(id) not null,
  sale_id uuid,
  total_amount numeric(12,2) not null,
  paid_amount numeric(12,2) default 0,
  due_date date,
  created_at timestamptz default now()
);

create table debt_payments (
  id uuid primary key default uuid_generate_v4(),
  debt_id uuid references debts(id) on delete cascade not null,
  amount numeric(12,2) not null,
  paid_at timestamptz default now(),
  recorded_by uuid references auth.users(id)
);

-- ============================================
-- FOURNISSEURS
-- ============================================
create table suppliers (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid references shops(id) on delete cascade not null,
  name text not null,
  phone text,
  created_at timestamptz default now()
);

create table supplier_orders (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid references shops(id) on delete cascade not null,
  supplier_id uuid references suppliers(id) not null,
  total_amount numeric(12,2) not null,
  paid_amount numeric(12,2) default 0,
  created_at timestamptz default now()
);

-- ============================================
-- VENTES (POS)
-- ============================================
create table sales (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid references shops(id) on delete cascade not null,
  customer_id uuid references customers(id),
  cashier_id uuid references auth.users(id) not null,
  total_amount numeric(12,2) not null default 0,
  discount numeric(12,2) default 0,
  payment_status payment_status default 'paid',
  is_offline_sync boolean default false,
  local_uuid text unique,
  created_at timestamptz default now()
);

create table sale_items (
  id uuid primary key default uuid_generate_v4(),
  sale_id uuid references sales(id) on delete cascade not null,
  product_id uuid references products(id) not null,
  quantity integer not null,
  unit_price numeric(12,2) not null
);

-- ============================================
-- LIVRAISONS
-- ============================================
create table deliveries (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid references shops(id) on delete cascade not null,
  sale_id uuid references sales(id),
  status order_status default 'pending',
  delivery_person_id uuid references auth.users(id),
  address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- DÉPENSES
-- ============================================
create table expenses (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid references shops(id) on delete cascade not null,
  category expense_category not null,
  amount numeric(12,2) not null,
  description text,
  receipt_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- ============================================
-- AUDIT LOG
-- ============================================
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  shop_id uuid references shops(id),
  user_id uuid references auth.users(id),
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Index
create index idx_products_shop on products(shop_id);
create index idx_sales_shop on sales(shop_id);
create index idx_sales_local_uuid on sales(local_uuid);
create index idx_debts_shop on debts(shop_id);
create index idx_stock_movements_shop on stock_movements(shop_id);
create index idx_expenses_shop on expenses(shop_id);
create index idx_deliveries_shop on deliveries(shop_id);
create index idx_supplier_orders_shop on supplier_orders(shop_id);

-- ============================================
-- FONCTIONS UTILITAIRES POUR RLS (lecture des claims JWT)
-- ============================================
create or replace function public.jwt_shop_id() returns uuid as $$
  select (auth.jwt() ->> 'shop_id')::uuid
$$ language sql stable;

create or replace function public.jwt_role() returns text as $$
  select auth.jwt() ->> 'user_role'
$$ language sql stable;

-- ============================================
-- AUTH HOOK : injecte role + shop_id dans le JWT
-- À activer dans Dashboard Supabase > Authentication > Hooks
-- ============================================
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
as $$
declare
  claims jsonb;
  v_role text;
  v_shop_id uuid;
begin
  select role, shop_id into v_role, v_shop_id
  from public.profiles where id = (event->>'user_id')::uuid;

  claims := event->'claims';
  claims := jsonb_set(claims, '{user_role}', to_jsonb(v_role));
  claims := jsonb_set(claims, '{shop_id}', to_jsonb(v_shop_id));
  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- ============================================
-- FONCTION TRANSACTIONNELLE : traitement d'une vente (POS + offline sync)
-- Idempotente via local_uuid pour supporter la synchronisation offline.
-- ============================================
create or replace function process_sale(
  p_shop_id uuid, p_local_uuid text, p_items jsonb, p_customer_id uuid, p_cashier_id uuid
) returns uuid
language plpgsql security definer as $$
declare
  v_sale_id uuid;
  v_item jsonb;
begin
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

-- ============================================
-- RLS
-- ============================================
alter table shops enable row level security;
alter table profiles enable row level security;
alter table owner_shops enable row level security;
alter table employee_permissions enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table stock_movements enable row level security;
alter table customers enable row level security;
alter table debts enable row level security;
alter table debt_payments enable row level security;
alter table suppliers enable row level security;
alter table supplier_orders enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table deliveries enable row level security;
alter table expenses enable row level security;
alter table audit_logs enable row level security;

-- SHOPS
create policy "shops_select" on shops for select using (
  public.jwt_role() = 'super_admin'
  or id in (select shop_id from owner_shops where owner_id = auth.uid())
  or id = public.jwt_shop_id()
);
create policy "shops_insert_admin_only" on shops for insert with check (public.jwt_role() = 'super_admin');
create policy "shops_update_admin_only" on shops for update using (public.jwt_role() = 'super_admin');

-- PROFILES
create policy "profiles_select" on profiles for select using (
  id = auth.uid()
  or public.jwt_role() = 'super_admin'
  or (public.jwt_role() = 'manager' and shop_id = public.jwt_shop_id())
  or shop_id in (select shop_id from owner_shops where owner_id = auth.uid())
);
create policy "profiles_update_self" on profiles for update using (id = auth.uid());

-- OWNER_SHOPS
create policy "owner_shops_select" on owner_shops for select using (
  owner_id = auth.uid() or public.jwt_role() = 'super_admin'
);

-- CATEGORIES
create policy "categories_select" on categories for select using (
  public.jwt_role() = 'super_admin' or shop_id = public.jwt_shop_id()
  or shop_id in (select shop_id from owner_shops where owner_id = auth.uid())
);
create policy "categories_write" on categories for insert with check (
  shop_id = public.jwt_shop_id() and public.jwt_role() in ('manager', 'employee')
);

-- PRODUCTS
create policy "products_select" on products for select using (
  public.jwt_role() = 'super_admin' or shop_id = public.jwt_shop_id()
  or shop_id in (select shop_id from owner_shops where owner_id = auth.uid())
);
create policy "products_insert" on products for insert with check (
  shop_id = public.jwt_shop_id() and public.jwt_role() in ('manager', 'employee')
);
create policy "products_update" on products for update using (
  shop_id = public.jwt_shop_id() and public.jwt_role() in ('manager', 'employee')
);

-- STOCK_MOVEMENTS (écriture via process_sale/SECURITY DEFINER surtout ; lecture ouverte à l'équipe boutique)
create policy "stock_movements_select" on stock_movements for select using (
  public.jwt_role() = 'super_admin' or shop_id = public.jwt_shop_id()
  or shop_id in (select shop_id from owner_shops where owner_id = auth.uid())
);
create policy "stock_movements_insert" on stock_movements for insert with check (
  shop_id = public.jwt_shop_id() and public.jwt_role() in ('manager', 'employee')
);

-- CUSTOMERS
create policy "customers_select" on customers for select using (
  public.jwt_role() = 'super_admin' or shop_id = public.jwt_shop_id()
  or shop_id in (select shop_id from owner_shops where owner_id = auth.uid())
);
create policy "customers_write" on customers for insert with check (
  shop_id = public.jwt_shop_id() and public.jwt_role() in ('manager', 'employee')
);

-- DEBTS
create policy "debts_select" on debts for select using (
  public.jwt_role() = 'super_admin' or shop_id = public.jwt_shop_id()
  or shop_id in (select shop_id from owner_shops where owner_id = auth.uid())
);
create policy "debts_write" on debts for insert with check (
  shop_id = public.jwt_shop_id() and public.jwt_role() in ('manager', 'employee')
);
create policy "debts_update" on debts for update using (
  shop_id = public.jwt_shop_id() and public.jwt_role() in ('manager', 'employee')
);

-- DEBT_PAYMENTS
create policy "debt_payments_select" on debt_payments for select using (
  exists (select 1 from debts d where d.id = debt_id and (
    public.jwt_role() = 'super_admin' or d.shop_id = public.jwt_shop_id()
    or d.shop_id in (select shop_id from owner_shops where owner_id = auth.uid())
  ))
);
create policy "debt_payments_insert" on debt_payments for insert with check (
  exists (select 1 from debts d where d.id = debt_id and d.shop_id = public.jwt_shop_id())
  and public.jwt_role() in ('manager', 'employee')
);

-- SUPPLIERS / SUPPLIER_ORDERS
create policy "suppliers_select" on suppliers for select using (
  public.jwt_role() = 'super_admin' or shop_id = public.jwt_shop_id()
  or shop_id in (select shop_id from owner_shops where owner_id = auth.uid())
);
create policy "suppliers_write" on suppliers for insert with check (
  shop_id = public.jwt_shop_id() and public.jwt_role() in ('manager', 'employee')
);
create policy "supplier_orders_select" on supplier_orders for select using (
  public.jwt_role() = 'super_admin' or shop_id = public.jwt_shop_id()
  or shop_id in (select shop_id from owner_shops where owner_id = auth.uid())
);
create policy "supplier_orders_write" on supplier_orders for insert with check (
  shop_id = public.jwt_shop_id() and public.jwt_role() in ('manager', 'employee')
);

-- SALES (écriture normalement via process_sale, policy de secours pour insert direct)
create policy "sales_select" on sales for select using (
  public.jwt_role() = 'super_admin' or shop_id = public.jwt_shop_id()
  or shop_id in (select shop_id from owner_shops where owner_id = auth.uid())
);
create policy "sales_insert" on sales for insert with check (
  shop_id = public.jwt_shop_id() and public.jwt_role() in ('manager', 'employee')
);

create policy "sale_items_select" on sale_items for select using (
  exists (select 1 from sales s where s.id = sale_id and (
    public.jwt_role() = 'super_admin' or s.shop_id = public.jwt_shop_id()
    or s.shop_id in (select shop_id from owner_shops where owner_id = auth.uid())
  ))
);

-- DELIVERIES
create policy "deliveries_select" on deliveries for select using (
  public.jwt_role() = 'super_admin' or shop_id = public.jwt_shop_id()
  or shop_id in (select shop_id from owner_shops where owner_id = auth.uid())
);
create policy "deliveries_write" on deliveries for insert with check (
  shop_id = public.jwt_shop_id() and public.jwt_role() in ('manager', 'employee')
);
create policy "deliveries_update" on deliveries for update using (
  shop_id = public.jwt_shop_id() and public.jwt_role() in ('manager', 'employee')
);

-- EXPENSES
create policy "expenses_select" on expenses for select using (
  public.jwt_role() = 'super_admin' or shop_id = public.jwt_shop_id()
  or shop_id in (select shop_id from owner_shops where owner_id = auth.uid())
);
create policy "expenses_write" on expenses for insert with check (
  shop_id = public.jwt_shop_id() and public.jwt_role() in ('manager', 'employee')
);

-- AUDIT_LOGS : lecture seule, écriture uniquement via fonctions SECURITY DEFINER
create policy "audit_logs_select" on audit_logs for select using (
  public.jwt_role() = 'super_admin' or shop_id = public.jwt_shop_id()
);
create policy "audit_logs_no_client_write" on audit_logs for insert with check (false);
