import { createClient } from '@/lib/supabase/server';
import { Card, CardTitle } from '@/components/ui/Card';
import { formatMontant, formatDate } from '@/lib/utils';
import { RevenueChart } from '@/components/dashboard/RevenueChart';

export default async function RapportsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('shop_id').eq('id', user!.id).single();
  const shopId = profile!.shop_id!;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const startOfMonthIso = startOfMonth.toISOString();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

  const [{ data: monthSales }, { data: monthExpenses }, { data: debts }, { data: last30Sales }] = await Promise.all([
    supabase.from('sales').select('total_amount').eq('shop_id', shopId).gte('created_at', startOfMonthIso),
    supabase.from('expenses').select('amount').eq('shop_id', shopId).gte('created_at', startOfMonthIso),
    supabase.from('debts').select('total_amount, paid_amount').eq('shop_id', shopId),
    supabase.from('sales').select('total_amount, created_at').eq('shop_id', shopId).gte('created_at', thirtyDaysAgo.toISOString())
  ]);

  const revenue = monthSales?.reduce((s, r) => s + Number(r.total_amount), 0) ?? 0;
  const expenses = monthExpenses?.reduce((s, r) => s + Number(r.amount), 0) ?? 0;
  const outstandingDebt = debts?.reduce((s, d) => s + (Number(d.total_amount) - Number(d.paid_amount)), 0) ?? 0;

  // Regroupe les ventes des 30 derniers jours par jour
  const dailyMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    dailyMap.set(d.toISOString().slice(0, 10), 0);
  }
  last30Sales?.forEach((s) => {
    const day = s.created_at.slice(0, 10);
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + Number(s.total_amount));
  });
  const chartData = Array.from(dailyMap.entries()).map(([date, value]) => ({
    label: formatDate(date).slice(0, 5),
    value
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardTitle>Ventes du mois</CardTitle><p className="text-2xl font-bold text-ink">{formatMontant(revenue)}</p></Card>
        <Card><CardTitle>Dépenses du mois</CardTitle><p className="text-2xl font-bold text-ink">{formatMontant(expenses)}</p></Card>
        <Card><CardTitle>Profit du mois</CardTitle><p className="text-2xl font-bold text-ink">{formatMontant(revenue - expenses)}</p></Card>
        <Card><CardTitle>Dettes en cours</CardTitle><p className="text-2xl font-bold text-ink">{formatMontant(outstandingDebt)}</p></Card>
      </div>

      <Card>
        <CardTitle>Ventes des 30 derniers jours</CardTitle>
        <RevenueChart data={chartData} />
      </Card>
    </div>
  );
}
