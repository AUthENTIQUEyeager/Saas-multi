import { createClient } from '@/lib/supabase/server';
import { Card, CardTitle } from '@/components/ui/Card';
import { formatMontant } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('shop_id').eq('id', user!.id).single();
  const shopId = profile!.shop_id!;

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: todaySales }, { data: lowStock }, { data: overdueDebts }] = await Promise.all([
    supabase.from('sales').select('total_amount').eq('shop_id', shopId).gte('created_at', today),
    supabase.from('products').select('id, name, stock_quantity, low_stock_threshold').eq('shop_id', shopId),
    supabase.from('debts').select('id, total_amount, paid_amount, due_date').eq('shop_id', shopId).lt('due_date', today)
  ]);

  const revenueToday = todaySales?.reduce((sum, s) => sum + Number(s.total_amount), 0) ?? 0;
  const lowStockProducts = lowStock?.filter((p) => p.stock_quantity <= p.low_stock_threshold) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardTitle>Ventes du jour</CardTitle>
          <p className="text-2xl font-bold text-ink">{formatMontant(revenueToday)}</p>
          <p className="mt-1 text-xs text-neutral-400">{todaySales?.length ?? 0} transaction(s)</p>
        </Card>
        <Card>
          <CardTitle>Stock bas</CardTitle>
          <p className="text-2xl font-bold text-ink">{lowStockProducts.length}</p>
          <p className="mt-1 text-xs text-neutral-400">produit(s) à réapprovisionner</p>
        </Card>
        <Card>
          <CardTitle>Dettes en retard</CardTitle>
          <p className="text-2xl font-bold text-ink">{overdueDebts?.length ?? 0}</p>
          <p className="mt-1 text-xs text-neutral-400">à relancer</p>
        </Card>
      </div>

      {lowStockProducts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
            <div>
              <p className="text-sm font-semibold text-orange-800">Produits à réapprovisionner</p>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-orange-700">
                {lowStockProducts.slice(0, 5).map((p) => (
                  <li key={p.id}>
                    {p.name} — {p.stock_quantity} restant(s)
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
