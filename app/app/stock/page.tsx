import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { StockMovementForm } from '@/components/dashboard/StockMovementForm';

export default async function StockPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('shop_id').eq('id', user!.id).single();
  const shopId = profile!.shop_id!;

  const [{ data: movements }, { data: products }] = await Promise.all([
    supabase
      .from('stock_movements')
      .select('id, movement_type, quantity, reason, created_at, products(name)')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('products').select('id, name').eq('shop_id', shopId).order('name')
  ]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Produit</th>
              <th className="px-5 py-3">Mouvement</th>
              <th className="px-5 py-3">Quantité</th>
              <th className="px-5 py-3">Motif</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {movements?.map((m: any) => (
              <tr key={m.id} className="hover:bg-neutral-50">
                <td className="px-5 py-3 text-neutral-600">{formatDate(m.created_at)}</td>
                <td className="px-5 py-3 font-medium text-ink">{m.products?.name}</td>
                <td className="px-5 py-3">
                  <Badge tone={m.movement_type === 'in' ? 'vert' : 'rouge'}>{m.movement_type === 'in' ? 'Entrée' : 'Sortie'}</Badge>
                </td>
                <td className="px-5 py-3 text-neutral-600">{m.quantity}</td>
                <td className="px-5 py-3 text-neutral-600">{m.reason ?? '—'}</td>
              </tr>
            ))}
            {!movements?.length && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-neutral-400">Aucun mouvement de stock enregistré.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <StockMovementForm shopId={shopId} products={products ?? []} />
    </div>
  );
}
