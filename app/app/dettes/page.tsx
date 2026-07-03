import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatMontant, formatDate } from '@/lib/utils';

export default async function DettesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('shop_id').eq('id', user!.id).single();
  const shopId = profile!.shop_id!;
  const today = new Date().toISOString().slice(0, 10);

  const { data: debts } = await supabase
    .from('debts')
    .select('id, total_amount, paid_amount, due_date, customers(name, phone)')
    .eq('shop_id', shopId)
    .order('due_date', { ascending: true });

  return (
    <Card className="p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-5 py-3">Client</th>
            <th className="px-5 py-3">Montant total</th>
            <th className="px-5 py-3">Payé</th>
            <th className="px-5 py-3">Restant</th>
            <th className="px-5 py-3">Échéance</th>
            <th className="px-5 py-3">Statut</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {debts?.map((d: any) => {
            const remaining = Number(d.total_amount) - Number(d.paid_amount);
            const overdue = d.due_date && d.due_date < today && remaining > 0;
            return (
              <tr key={d.id} className="hover:bg-neutral-50">
                <td className="px-5 py-3 font-medium text-ink">{d.customers?.name}</td>
                <td className="px-5 py-3 text-neutral-600">{formatMontant(d.total_amount)}</td>
                <td className="px-5 py-3 text-neutral-600">{formatMontant(d.paid_amount)}</td>
                <td className="px-5 py-3 font-semibold text-ink">{formatMontant(remaining)}</td>
                <td className="px-5 py-3 text-neutral-600">{d.due_date ? formatDate(d.due_date) : '—'}</td>
                <td className="px-5 py-3">
                  <Badge tone={remaining <= 0 ? 'vert' : overdue ? 'rouge' : 'orange'}>
                    {remaining <= 0 ? 'Soldée' : overdue ? 'En retard' : 'En cours'}
                  </Badge>
                </td>
              </tr>
            );
          })}
          {!debts?.length && (
            <tr><td colSpan={6} className="px-5 py-10 text-center text-neutral-400">Aucune dette enregistrée.</td></tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}
