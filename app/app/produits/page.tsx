import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatMontant } from '@/lib/utils';
import { ProductForm } from '@/components/dashboard/ProductForm';

export default async function ProduitsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('shop_id').eq('id', user!.id).single();
  const shopId = profile!.shop_id!;

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase.from('products').select('*').eq('shop_id', shopId).order('name'),
    supabase.from('categories').select('*').eq('shop_id', shopId).order('name')
  ]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-5 py-3">Produit</th>
              <th className="px-5 py-3">Achat</th>
              <th className="px-5 py-3">Vente</th>
              <th className="px-5 py-3">Marge</th>
              <th className="px-5 py-3">Stock</th>
              <th className="px-5 py-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {products?.map((p) => {
              const margin = p.cost_price != null ? p.price - p.cost_price : null;
              return (
                <tr key={p.id} className="hover:bg-neutral-50">
                  <td className="px-5 py-3 font-medium text-ink">{p.name}</td>
                  <td className="px-5 py-3 text-neutral-500">{p.cost_price != null ? formatMontant(p.cost_price) : '—'}</td>
                  <td className="px-5 py-3 text-neutral-600">{formatMontant(p.price)}</td>
                  <td className="px-5 py-3 font-medium text-emerald-600">{margin != null ? formatMontant(margin) : '—'}</td>
                  <td className="px-5 py-3 text-neutral-600">{p.stock_quantity}</td>
                  <td className="px-5 py-3">
                    <Badge tone={p.stock_quantity <= p.low_stock_threshold ? 'orange' : 'vert'}>
                      {p.stock_quantity <= p.low_stock_threshold ? 'Stock bas' : 'OK'}
                    </Badge>
                  </td>
                </tr>
              );
            })}
            {!products?.length && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-neutral-400">Aucun produit. Ajoutez-en un.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <ProductForm shopId={shopId} categories={categories ?? []} />
    </div>
  );
}
