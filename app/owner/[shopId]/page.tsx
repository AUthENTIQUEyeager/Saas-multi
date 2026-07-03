import { createClient } from '@/lib/supabase/server';
import { Card, CardTitle } from '@/components/ui/Card';
import { formatMontant } from '@/lib/utils';

export default async function OwnerShopDetail({ params }: { params: { shopId: string } }) {
  const supabase = createClient();
  const { shopId } = params;

  const [{ data: shop }, { data: sales }, { data: lowStock }, { data: debts }, { data: expenses }] = await Promise.all([
    supabase.from('shops').select('*').eq('id', shopId).single(),
    supabase.from('sales').select('total_amount, created_at').eq('shop_id', shopId),
    supabase.from('products').select('id').eq('shop_id', shopId).lt('stock_quantity', 5),
    supabase.from('debts').select('total_amount, paid_amount').eq('shop_id', shopId),
    supabase.from('expenses').select('amount').eq('shop_id', shopId)
  ]);

  const revenue = sales?.reduce((sum, s) => sum + Number(s.total_amount), 0) ?? 0;
  const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;
  const totalDebt = debts?.reduce((sum, d) => sum + (Number(d.total_amount) - Number(d.paid_amount)), 0) ?? 0;

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
    </div>
  );
}
