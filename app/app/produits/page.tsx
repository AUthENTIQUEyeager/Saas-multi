'use client';

import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatMontant } from '@/lib/utils';
import { ProductForm } from '@/components/dashboard/ProductForm';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Product } from '@/lib/types';
import type { Category } from '@/lib/types';

export default function ProduitsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [shopId, setShopId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const supabase = createClient();

        // Get user profile
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          redirect('/login');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('shop_id, role')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        // Redirect vendeurs
        if (profile?.role === 'vendeur') {
          redirect('/app');
          return;
        }

        const shopIdFromProfile = profile!.shop_id!;
        setShopId(shopIdFromProfile);

        // Fetch products and categories
        const [{ data: productsData, error: productsError }, { data: categoriesData, error: categoriesError }] = await Promise.all([
          supabase
            .from('products')
            .select('*')
            .eq('shop_id', shopIdFromProfile)
            .order('name'),
          supabase
            .from('categories')
            .select('*')
            .eq('shop_id', shopIdFromProfile)
            .order('name')
        ]);

        if (productsError) throw productsError;
        if (categoriesError) throw categoriesError;

        setProducts(productsData ?? []);
        setCategories(categoriesData ?? []);
      } catch (err) {
        console.error('Error loading produits page:', err);
        setError('Erreur lors du chargement de la page');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50">
        <p className="text-xl font-bold text-ink">Chargement...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50">
        <p className="text-xl font-bold text-red-600">{error}</p>
      </div>
    );
  }

  const handleEdit = (product: Product) => {
    setEditingProductId(product.id);
    setEditingProduct(product);
  };

  const handleCancelEdit = () => {
    setEditingProductId(null);
    setEditingProduct(null);
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card className="p-0 overflow-hidden">
        {editingProductId ? (
          <ProductForm
            shopId={shopId}
            categories={categories}
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
                {products.map((p) => {
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
                {!products.length && (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-neutral-400">Aucun produit. Ajoutez-en un.</td></tr>
                )}
              </tbody>
            </table>
            <ProductForm shopId={shopId} categories={categories} />
          </>
        )}
      </Card>
    </div>
  );
}
