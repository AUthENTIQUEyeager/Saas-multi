export type UserRole = 'super_admin' | 'owner' | 'manager' | 'employee';
export type SubscriptionStatus = 'active' | 'suspended' | 'expired' | 'trial';
export type PaymentStatus = 'paid' | 'partial' | 'unpaid';
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
export type ExpenseCategory = 'salary' | 'rent' | 'electricity' | 'transport' | 'purchase' | 'other';
export type EmployeePermission = 'cashier' | 'stock_manager' | 'delivery' | 'accountant' | 'manager_assistant';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  shop_id: string | null;
  is_active: boolean;
}

export interface Shop {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  subscription_status: SubscriptionStatus;
  subscription_end_date: string | null;
  owner_id: string | null;
}

export interface Product {
  id: string;
  shop_id: string;
  category_id: string | null;
  name: string;
  barcode: string | null;
  price: number;
  cost_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  image_url: string | null;
  is_active: boolean;
}

export interface Customer {
  id: string;
  shop_id: string;
  name: string;
  phone: string | null;
}

export interface Debt {
  id: string;
  shop_id: string;
  customer_id: string;
  total_amount: number;
  paid_amount: number;
  due_date: string | null;
  created_at: string;
}

export interface Sale {
  id: string;
  shop_id: string;
  customer_id: string | null;
  cashier_id: string;
  total_amount: number;
  discount: number;
  payment_status: PaymentStatus;
  local_uuid: string;
  created_at: string;
}

export interface SaleItem {
  product_id: string;
  quantity: number;
  unit_price: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
