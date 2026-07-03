import { createClient } from '@/lib/supabase/server';
import { Card, CardTitle } from '@/components/ui/Card';
import { ClientForm } from '@/components/dashboard/ClientForm';

export default async function ClientsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('shop_id').eq('id', user!.id).single();
  const shopId = profile!.shop_id!;

  const { data: customers } = await supabase.from('customers').select('*').eq('shop_id', shopId).order('name');

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr><th className="px-5 py-3">Nom</th><th className="px-5 py-3">Téléphone</th></tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {customers?.map((c) => (
              <tr key={c.id} className="hover:bg-neutral-50">
                <td className="px-5 py-3 font-medium text-ink">{c.name}</td>
                <td className="px-5 py-3 text-neutral-600">{c.phone ?? '—'}</td>
              </tr>
            ))}
            {!customers?.length && (
              <tr><td colSpan={2} className="px-5 py-10 text-center text-neutral-400">Aucun client enregistré.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
      <ClientForm shopId={shopId} />
    </div>
  );
}
