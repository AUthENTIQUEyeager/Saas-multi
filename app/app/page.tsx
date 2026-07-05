import { createClient } from '@/lib/supabase/server';
import { Card, CardTitle } from '@/components/ui/Card';
import { LiveRevenueCard } from '@/components/dashboard/LiveRevenueCard';
import { LiveStockCard } from '@/components/dashboard/LiveStockCard';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('shop_id').eq('id', user!.id).single();
  const shopId = profile!.shop_id!;

  // Référence temporelle du rendu serveur : tout ce qui est créé APRÈS cet
  // instant (dans le cache local) sera ajouté par-dessus côté client, que
  // la connexion soit là ou non.
  const baselineTimestamp = new Date().toISOString();
  const today = baselineTimestamp.slice(0, 10);

  const [{ data: todaySales }, { data: lowStock }, { data: overdueDebts }] = await Promise.all([
    supabase.from('sales').select('total_amount').eq('shop_id', shopId).gte('created_at', today),
    supabase.from('products').select('id, name, stock_quantity, low_stock_threshold').eq('shop_id', shopId),
    supabase.from('debts').select('id, total_amount, paid_amount, due_date').eq('shop_id', shopId).lt('due_date', today)
  ]);

  const revenueToday = todaySales?.reduce((sum, s) => sum + Number(s.total_amount), 0) ?? 0;
  const lowStockProducts = (lowStock ?? [])
    .filter((p) => p.stock_quantity <= p.low_stock_threshold)
    .map((p) => ({ id: p.id, name: p.name, stock_quantity: p.stock_quantity }));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <LiveRevenueCard
          shopId={shopId}
          baselineRevenue={revenueToday}
          baselineCount={todaySales?.length ?? 0}
          baselineTimestamp={baselineTimestamp}
        />
        <LiveStockCard shopId={shopId} baseline={lowStockProducts} />
        <Card>
          <CardTitle>Dettes en retard</CardTitle>
          <p className="text-2xl font-bold text-ink">{overdueDebts?.length ?? 0}</p>
          <p className="mt-1 text-xs text-neutral-400">à relancer</p>
        </Card>
      </div>
    </div>
  );
}
