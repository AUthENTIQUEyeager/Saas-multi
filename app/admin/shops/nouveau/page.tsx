import { createClient } from '@/lib/supabase/server';
import { NewShopForm } from '@/components/admin/NewShopForm';

export default async function NewShopPage() {
  const supabase = createClient();
  const { data: owners } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'owner')
    .order('full_name');

  return <NewShopForm existingOwners={owners ?? []} />;
}
