import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { formatMontant } from '@/lib/utils';
import { SupplierPaymentForm } from '@/components/dashboard/SupplierPaymentForm';

export default async function FournisseursPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('shop_id').eq('id', user!.id).single();
  const shopId = profile!.shop_id!;

  const { data: orders } = await supabase
    .from('supplier_orders')
    .select('id, total_amount, paid_amount, created_at, suppliers(name, phone)')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });

  return (
    <Card className="p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-5 py-3">Fournisseur</th>
            <th className="px-5 py-3">Montant</th>
            <th className="px-5 py-3">Payé</th>
            <th className="px-5 py-3">Solde dû</th>
            <th className="px-5 py-3">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {orders?.map((o: any) => {
            const remaining = Number(o.total_amount) - Number(o.paid_amount);
            return (
              <tr key={o.id} className="hover:bg-neutral-50">
                <td className="px-5 py-3 font-medium text-ink">{o.suppliers?.name}</td>
                <td className="px-5 py-3 text-neutral-600">{formatMontant(o.total_amount)}</td>
                <td className="px-5 py-3 text-neutral-600">{formatMontant(o.paid_amount)}</td>
                <td className="px-5 py-3 font-semibold text-ink">{formatMontant(remaining)}</td>
                <td className="px-5 py-3">
                  {remaining > 0 && <SupplierPaymentForm orderId={o.id} remaining={remaining} />}
                </td>
              </tr>
            );
          })}
          {!orders?.length && (
            <tr><td colSpan={5} className="px-5 py-10 text-center text-neutral-400">Aucune commande fournisseur enregistrée.</td></tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}
