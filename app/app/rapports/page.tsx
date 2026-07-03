import { createClient } from '@/lib/supabase/server';
import { Card, CardTitle } from '@/components/ui/Card';
import { formatMontant } from '@/lib/utils';

export default async function RapportsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('shop_id').eq('id', user!.id).single();
  const shopId = profile!.shop_id!;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const startOfMonthIso = startOfMonth.toISOString();

  const [{ data: monthSales }, { data: monthExpenses }, { data: debts }] = await Promise.all([
    supabase.from('sales').select('total_amount').eq('shop_id', shopId).gte('created_at', startOfMonthIso),
    supabase.from('expenses').select('amount').eq('shop_id', shopId).gte('created_at', startOfMonthIso),
    supabase.from('debts').select('total_amount, paid_amount').eq('shop_id', shopId)
  ]);

  const revenue = monthSales?.reduce((s, r) => s + Number(r.total_amount), 0) ?? 0;
  const expenses = monthExpenses?.reduce((s, r) => s + Number(r.amount), 0) ?? 0;
  const outstandingDebt = debts?.reduce((s, d) => s + (Number(d.total_amount) - Number(d.paid_amount)), 0) ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card><CardTitle>Ventes du mois</CardTitle><p className="text-2xl font-bold text-ink">{formatMontant(revenue)}</p></Card>
      <Card><CardTitle>Dépenses du mois</CardTitle><p className="text-2xl font-bold text-ink">{formatMontant(expenses)}</p></Card>
      <Card><CardTitle>Profit du mois</CardTitle><p className="text-2xl font-bold text-ink">{formatMontant(revenue - expenses)}</p></Card>
      <Card><CardTitle>Dettes en cours</CardTitle><p className="text-2xl font-bold text-ink">{formatMontant(outstandingDebt)}</p></Card>
    </div>
  );
}
