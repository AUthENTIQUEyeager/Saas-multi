import { createClient } from '@/lib/supabase/server';
import { Card, CardTitle } from '@/components/ui/Card';
import { formatMontant } from '@/lib/utils';
import { RevenueChart } from '@/components/dashboard/RevenueChart';

export default async function AdminAnalyticsPage() {
  const supabase = createClient();

  const [{ count: shopsCount }, { count: activeShopsCount }, { data: sales }, { data: shops }] = await Promise.all([
    supabase.from('shops').select('*', { count: 'exact', head: true }),
    supabase.from('shops').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
    supabase.from('sales').select('total_amount, shop_id'),
    supabase.from('shops').select('id, name')
  ]);

  const totalRevenue = sales?.reduce((sum, s) => sum + Number(s.total_amount), 0) ?? 0;

  const revenueByShop = new Map<string, number>();
  sales?.forEach((s) => {
    revenueByShop.set(s.shop_id, (revenueByShop.get(s.shop_id) ?? 0) + Number(s.total_amount));
  });
  const chartData = (shops ?? [])
    .map((shop) => ({ label: shop.name.slice(0, 12), value: revenueByShop.get(shop.id) ?? 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const stats = [
    { label: 'Boutiques totales', value: shopsCount ?? 0 },
    { label: 'Boutiques actives', value: activeShopsCount ?? 0 },
    { label: "Chiffre d'affaires global", value: formatMontant(totalRevenue) },
    { label: 'Ventes enregistrées', value: sales?.length ?? 0 }
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardTitle>{stat.label}</CardTitle>
            <p className="text-2xl font-bold text-ink">{stat.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardTitle>Chiffre d'affaires par boutique (top 10)</CardTitle>
        {chartData.length > 0 ? (
          <RevenueChart data={chartData} />
        ) : (
          <p className="py-8 text-center text-sm text-neutral-400">Pas encore de données de vente.</p>
        )}
      </Card>
    </div>
  );
}
