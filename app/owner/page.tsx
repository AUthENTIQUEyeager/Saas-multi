import { createClient } from '@/lib/supabase/server';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatMontant } from '@/lib/utils';
import Link from 'next/link';

export default async function OwnerDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: ownerShops } = await supabase
    .from('owner_shops')
    .select('shop_id, shops(id, name, subscription_status)')
    .eq('owner_id', user!.id);

  const shopIds = ownerShops?.map((os: any) => os.shop_id) ?? [];

  const [{ data: sales }, { data: debts }] = await Promise.all([
    supabase.from('sales').select('shop_id, total_amount').in('shop_id', shopIds),
    supabase.from('debts').select('shop_id, total_amount, paid_amount').in('shop_id', shopIds)
  ]);

  const totalRevenue = sales?.reduce((sum, s) => sum + Number(s.total_amount), 0) ?? 0;
  const totalDebt = debts?.reduce((sum, d) => sum + (Number(d.total_amount) - Number(d.paid_amount)), 0) ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardTitle>Boutiques</CardTitle>
          <p className="text-2xl font-bold text-ink">{ownerShops?.length ?? 0}</p>
        </Card>
        <Card>
          <CardTitle>Chiffre d'affaires cumulé</CardTitle>
          <p className="text-2xl font-bold text-ink">{formatMontant(totalRevenue)}</p>
        </Card>
        <Card>
          <CardTitle>Dettes clients cumulées</CardTitle>
          <p className="text-2xl font-bold text-ink">{formatMontant(totalDebt)}</p>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-500 uppercase tracking-wide">Vos boutiques</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ownerShops?.map((os: any) => (
            <Link key={os.shop_id} href={`/owner/${os.shop_id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-ink">{os.shops.name}</p>
                  <Badge tone={os.shops.subscription_status === 'active' ? 'vert' : 'orange'}>
                    {os.shops.subscription_status === 'active' ? 'Actif' : os.shops.subscription_status}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-neutral-400">Voir le détail →</p>
              </Card>
            </Link>
          ))}
          {!ownerShops?.length && (
            <p className="text-sm text-neutral-400">Aucune boutique associée à votre compte pour le moment.</p>
          )}
        </div>
      </div>
    </div>
  );
}
