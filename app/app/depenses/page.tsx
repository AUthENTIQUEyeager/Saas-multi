import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { formatMontant, formatDate } from '@/lib/utils';
import { ExpenseForm } from '@/components/dashboard/ExpenseForm';

const categoryLabel: Record<string, string> = {
  salary: 'Salaire', rent: 'Loyer', electricity: 'Électricité', transport: 'Transport', purchase: 'Achat', other: 'Autre'
};

export default async function DepensesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('shop_id').eq('id', user!.id).single();
  const shopId = profile!.shop_id!;

  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Catégorie</th><th className="px-5 py-3">Description</th><th className="px-5 py-3">Montant</th></tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {expenses?.map((e) => (
              <tr key={e.id} className="hover:bg-neutral-50">
                <td className="px-5 py-3 text-neutral-600">{formatDate(e.created_at)}</td>
                <td className="px-5 py-3 text-neutral-600">{categoryLabel[e.category]}</td>
                <td className="px-5 py-3 text-neutral-600">{e.description ?? '—'}</td>
                <td className="px-5 py-3 font-semibold text-ink">{formatMontant(e.amount)}</td>
              </tr>
            ))}
            {!expenses?.length && (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-neutral-400">Aucune dépense enregistrée.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
      <ExpenseForm shopId={shopId} />
    </div>
  );
}
