import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatMontant } from '@/lib/utils';
import { ProductForm } from '@/components/dashboard/ProductForm';
import { redirect } from 'next/navigation';
import { useState } from 'react';
import type { Product } from '@/lib/types';

export default async function ProduitsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('shop_id').eq('id', user!.id).single();
  const shopId = profile!.shop_id!;

  if (profile?.role === 'vendeur') {
    redirect('/app');
  }

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase.from('products').select('*').eq('shop_id', shopId).order('name'),
    supabase.from('categories').select('*').eq('shop_id', shopId).order('name')
  ]);

  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const handleEdit = (product: Product) => {
    setEditingProductId(product.id);
    setEditingProduct(product);
  };

  const handleCancelEdit = () => {
    setEditingProductId(null);
    setEditingProduct(null);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="p-0 overflow-hidden">
        {editingProductId ? (
          <ProductForm
            shopId={shopId}
            categories={categories ?? []}
            product={editingProduct}
            onCancel={handleCancelEdit}
          />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-5 py-3">Produit</th>
                  <th className="px-5 py-3">Achat</th>
                  <th className="px-5 py-3">Vente</th>
                  <th className="px-5 py-3">Marge</th>
                  <th className="px-5 py-3">Stock</th>
                  <th className="px-5 py-3">Statut</th>
                  <th className="px-5 py-3">Action</th>
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
                      <td className="px-5 py-3 space-x-2">
                        <button
                          onClick={() => handleEdit(p)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          Modifier
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!products?.length && (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-neutral-400">Aucun produit. Ajoutez-en un.</td></tr>
                )}
              </tbody>
            </table>
            <ProductForm shopId={shopId} categories={categories ?? []} />
          </>
        )}
      </Card>
    </div>
  );
}
