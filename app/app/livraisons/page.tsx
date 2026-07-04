import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { formatDate } from '@/lib/utils';
import { DeliveryForm } from '@/components/dashboard/DeliveryForm';
import { DeliveryStatusSelect } from '@/components/dashboard/DeliveryStatusSelect';

export default async function LivraisonsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('shop_id').eq('id', user!.id).single();
  const shopId = profile!.shop_id!;

  const { data: deliveries } = await supabase
    .from('deliveries')
    .select('id, status, address, created_at')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Adresse</th><th className="px-5 py-3">Statut</th></tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {deliveries?.map((d) => (
              <tr key={d.id} className="hover:bg-neutral-50">
                <td className="px-5 py-3 text-neutral-600">{formatDate(d.created_at)}</td>
                <td className="px-5 py-3 text-neutral-600">{d.address ?? '—'}</td>
                <td className="px-5 py-3"><DeliveryStatusSelect deliveryId={d.id} currentStatus={d.status} /></td>
              </tr>
            ))}
            {!deliveries?.length && (
              <tr><td colSpan={3} className="px-5 py-10 text-center text-neutral-400">Aucune livraison enregistrée.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <DeliveryForm shopId={shopId} />
    </div>
  );
}
