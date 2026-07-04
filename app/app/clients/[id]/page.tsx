import { createClient } from '@/lib/supabase/server';
import { Card, CardTitle } from '@/components/ui/Card';
import { formatMontant, formatDate } from '@/lib/utils';
import { notFound } from 'next/navigation';

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: customer } = await supabase.from('customers').select('*').eq('id', params.id).single();
  if (!customer) notFound();

  const [{ data: sales }, { data: debts }] = await Promise.all([
    supabase
      .from('sales')
      .select('id, total_amount, created_at, sale_items(quantity, unit_price, products(name))')
      .eq('customer_id', params.id)
      .order('created_at', { ascending: false }),
    supabase.from('debts').select('id, total_amount, paid_amount, due_date').eq('customer_id', params.id)
  ]);

  const totalSpent = sales?.reduce((sum, s) => sum + Number(s.total_amount), 0) ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs text-neutral-400">Client</p>
        <h1 className="text-xl font-bold text-ink">{customer.name}</h1>
        {customer.phone && <p className="text-sm text-neutral-500">{customer.phone}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardTitle>Total dépensé</CardTitle>
          <p className="text-2xl font-bold text-ink">{formatMontant(totalSpent)}</p>
          <p className="mt-1 text-xs text-neutral-400">{sales?.length ?? 0} achat(s)</p>
        </Card>
        <Card>
          <CardTitle>Dettes en cours</CardTitle>
          <p className="text-2xl font-bold text-ink">
            {formatMontant(debts?.reduce((s, d) => s + (Number(d.total_amount) - Number(d.paid_amount)), 0) ?? 0)}
          </p>
        </Card>
      </div>

      <Card>
        <CardTitle>Historique des achats</CardTitle>
        <div className="flex flex-col divide-y divide-neutral-100">
          {sales?.map((sale: any) => (
            <div key={sale.id} className="py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-ink">{formatDate(sale.created_at)}</p>
                <p className="text-sm font-semibold text-ink">{formatMontant(sale.total_amount)}</p>
              </div>
              <p className="mt-1 text-xs text-neutral-400">
                {sale.sale_items?.map((item: any) => `${item.products?.name} ×${item.quantity}`).join(', ')}
              </p>
            </div>
          ))}
          {!sales?.length && <p className="py-6 text-center text-sm text-neutral-400">Aucun achat pour l'instant.</p>}
        </div>
      </Card>
    </div>
  );
}
