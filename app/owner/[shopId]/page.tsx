import { createClient } from '@/lib/supabase/server';
import { Card, CardTitle } from '@/components/ui/Card';
import { formatMontant } from '@/lib/utils';
import { Trophy } from 'lucide-react';

interface ProductStat {
  name: string;
  quantity: number;
  revenue: number;
}

export default async function OwnerShopDetail({ params }: { params: { shopId: string } }) {
  const supabase = createClient();
  const { shopId } = params;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sinceIso = thirtyDaysAgo.toISOString();

  const [{ data: shop }, { data: sales }, { data: lowStock }, { data: debts }, { data: expenses }, { data: soldItems }] =
    await Promise.all([
      supabase.from('shops').select('*').eq('id', shopId).single(),
      supabase.from('sales').select('total_amount, created_at').eq('shop_id', shopId),
      supabase.from('products').select('id').eq('shop_id', shopId).lt('stock_quantity', 5),
      supabase.from('debts').select('total_amount, paid_amount').eq('shop_id', shopId),
      supabase.from('expenses').select('amount').eq('shop_id', shopId),
      // Lignes de vente des 30 derniers jours pour cette boutique, avec le nom du produit.
      supabase
        .from('sale_items')
        .select('quantity, unit_price, products(name), sales!inner(shop_id, created_at)')
        .eq('sales.shop_id', shopId)
        .gte('sales.created_at', sinceIso)
    ]);

  const revenue = sales?.reduce((sum, s) => sum + Number(s.total_amount), 0) ?? 0;
  const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;
  const totalDebt = debts?.reduce((sum, d) => sum + (Number(d.total_amount) - Number(d.paid_amount)), 0) ?? 0;

  // Regroupe les lignes de vente par produit pour construire le classement.
  const statsByProduct = new Map<string, ProductStat>();
  (soldItems as any[] | null)?.forEach((item) => {
    const name = item.products?.name ?? 'Produit supprimé';
    const existing = statsByProduct.get(name) ?? { name, quantity: 0, revenue: 0 };
    existing.quantity += item.quantity;
    existing.revenue += item.quantity * Number(item.unit_price);
    statsByProduct.set(name, existing);
  });
  const allStats = Array.from(statsByProduct.values());
  const topByQuantity = [...allStats].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  const topByRevenue = [...allStats].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs text-neutral-400">Détail boutique</p>
        <h1 className="text-xl font-bold text-ink">{shop?.name}</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardTitle>Ventes</CardTitle>
          <p className="text-2xl font-bold text-ink">{formatMontant(revenue)}</p>
        </Card>
        <Card>
          <CardTitle>Dépenses</CardTitle>
          <p className="text-2xl font-bold text-ink">{formatMontant(totalExpenses)}</p>
        </Card>
        <Card>
          <CardTitle>Bénéfice estimé</CardTitle>
          <p className="text-2xl font-bold text-ink">{formatMontant(revenue - totalExpenses)}</p>
        </Card>
        <Card>
          <CardTitle>Dettes en cours</CardTitle>
          <p className="text-2xl font-bold text-ink">{formatMontant(totalDebt)}</p>
        </Card>
      </div>

      <Card>
        <CardTitle>Stock bas</CardTitle>
        <p className="text-sm text-neutral-600">
          {lowStock?.length ?? 0} produit(s) sous le seuil d'alerte de stock.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-brand" />
            <CardTitle>Top produits vendus (quantité, 30j)</CardTitle>
          </div>
          <div className="flex flex-col divide-y divide-neutral-100">
            {topByQuantity.map((p, i) => (
              <div key={p.name} className="flex items-center justify-between py-2.5 text-sm">
                <span className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-500">
                    {i + 1}
                  </span>
                  {p.name}
                </span>
                <span className="font-semibold text-ink">{p.quantity} vendu(s)</span>
              </div>
            ))}
            {!topByQuantity.length && <p className="py-6 text-center text-sm text-neutral-400">Aucune vente sur la période.</p>}
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-brand" />
            <CardTitle>Top produits vendus (chiffre d'affaires, 30j)</CardTitle>
          </div>
          <div className="flex flex-col divide-y divide-neutral-100">
            {topByRevenue.map((p, i) => (
              <div key={p.name} className="flex items-center justify-between py-2.5 text-sm">
                <span className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-500">
                    {i + 1}
                  </span>
                  {p.name}
                </span>
                <span className="font-semibold text-ink">{formatMontant(p.revenue)}</span>
              </div>
            ))}
            {!topByRevenue.length && <p className="py-6 text-center text-sm text-neutral-400">Aucune vente sur la période.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
