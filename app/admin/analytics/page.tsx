import { createClient } from '@/lib/supabase/server';
import { Card, CardTitle } from '@/components/ui/Card';
import { formatMontant } from '@/lib/utils';

export default async function AdminAnalyticsPage() {
  const supabase = createClient();

  const [{ count: shopsCount }, { count: activeShopsCount }, { data: sales }] = await Promise.all([
    supabase.from('shops').select('*', { count: 'exact', head: true }),
    supabase.from('shops').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
    supabase.from('sales').select('total_amount')
  ]);

  const totalRevenue = sales?.reduce((sum, s) => sum + Number(s.total_amount), 0) ?? 0;

  const stats = [
    { label: 'Boutiques totales', value: shopsCount ?? 0 },
    { label: 'Boutiques actives', value: activeShopsCount ?? 0 },
    { label: 'Chiffre d\'affaires global', value: formatMontant(totalRevenue) },
    { label: 'Ventes enregistrées', value: sales?.length ?? 0 }
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardTitle>{stat.label}</CardTitle>
          <p className="text-2xl font-bold text-ink">{stat.value}</p>
        </Card>
      ))}
    </div>
  );
}
