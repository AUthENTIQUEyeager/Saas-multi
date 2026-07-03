import { createClient } from '@/lib/supabase/server';
import { PosClient } from '@/components/pos/PosClient';

export default async function PosPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('shop_id').eq('id', user!.id).single();
  const shopId = profile!.shop_id!;

  const { data: products } = await supabase
    .from('products')
    .select('id, shop_id, name, price, stock_quantity, category_id, image_url')
    .eq('shop_id', shopId)
    .eq('is_active', true)
    .order('name');

  const { data: customers } = await supabase.from('customers').select('id, name, phone').eq('shop_id', shopId).order('name');

  return (
    <PosClient
      shopId={shopId}
      cashierId={user!.id}
      initialProducts={products ?? []}
      customers={customers ?? []}
    />
  );
}
