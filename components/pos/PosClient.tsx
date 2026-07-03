'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cacheProducts, getCachedProducts, queueSale, decrementCachedStock } from '@/lib/offline/db';
import { syncPendingSales } from '@/lib/offline/syncQueue';
import { formatMontant, generateLocalUuid } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { CartItem } from '@/lib/types';

interface PosProduct {
  id: string;
  shop_id: string;
  name: string;
  price: number;
  stock_quantity: number;
  category_id: string | null;
  image_url: string | null;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

/**
 * Cœur du système : la vente doit rester possible même hors-ligne.
 * - Les produits sont mis en cache local (IndexedDB) au premier chargement.
 * - L'encaissement écrit toujours en local d'abord (optimistic), puis tente
 *   une synchro immédiate si le réseau est disponible.
 */
export function PosClient({
  shopId,
  cashierId,
  initialProducts,
  customers
}: {
  shopId: string;
  cashierId: string;
  initialProducts: PosProduct[];
  customers: Customer[];
}) {
  const [products, setProducts] = useState<PosProduct[]>(initialProducts);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<string>('');
  const [checkingOut, setCheckingOut] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  useEffect(() => {
    // Amorce le cache offline avec les produits chargés côté serveur
    cacheProducts(
      initialProducts.map((p) => ({
        id: p.id,
        shop_id: p.shop_id,
        name: p.name,
        price: p.price,
        stock_quantity: p.stock_quantity,
        category_id: p.category_id,
        image_url: p.image_url,
        updated_at: new Date().toISOString()
      }))
    );
  }, [initialProducts]);

  useEffect(() => {
    async function loadFromCacheIfOffline() {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const cached = await getCachedProducts(shopId);
        setProducts(cached.map((c) => ({ ...c, category_id: c.category_id })));
      }
    }
    loadFromCacheIfOffline();
  }, [shopId]);

  const filtered = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [products, search]
  );

  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  function addToCart(product: PosProduct) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { product: product as any, quantity: 1 }];
    });
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }

  async function handleCheckout() {
    if (cart.length === 0) return;
    setCheckingOut(true);

    const localUuid = generateLocalUuid();
    const items = cart.map((i) => ({ product_id: i.product.id, quantity: i.quantity, unit_price: i.product.price }));

    // 1. Écriture locale immédiate (fonctionne hors-ligne)
    await queueSale({
      local_uuid: localUuid,
      shop_id: shopId,
      cashier_id: cashierId,
      customer_id: customerId || null,
      items,
      discount: 0,
      created_at: new Date().toISOString()
    });

    for (const item of cart) {
      await decrementCachedStock(item.product.id, item.quantity);
    }

    // 2. Mise à jour optimiste de l'UI
    setProducts((prev) =>
      prev.map((p) => {
        const inCart = cart.find((i) => i.product.id === p.id);
        return inCart ? { ...p, stock_quantity: Math.max(0, p.stock_quantity - inCart.quantity) } : p;
      })
    );

    setCart([]);
    setCustomerId('');
    setConfirmation(`Vente enregistrée (${formatMontant(total)})`);
    setCheckingOut(false);

    // 3. Tentative de synchro immédiate si en ligne
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      syncPendingSales();
    }

    setTimeout(() => setConfirmation(null), 3000);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5">
          <Search className="h-4 w-4 text-neutral-400" />
          <input
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              disabled={product.stock_quantity <= 0}
              className="flex flex-col items-start rounded-2xl border border-neutral-200 bg-white p-3.5 text-left transition-shadow hover:shadow-md disabled:opacity-40"
            >
              <p className="line-clamp-2 text-sm font-medium text-ink">{product.name}</p>
              <p className="mt-1 text-sm font-bold text-brand">{formatMontant(product.price)}</p>
              <p className="mt-1 text-xs text-neutral-400">
                {product.stock_quantity > 0 ? `${product.stock_quantity} en stock` : 'Rupture'}
              </p>
            </button>
          ))}
          {!filtered.length && (
            <p className="col-span-full py-10 text-center text-sm text-neutral-400">Aucun produit trouvé.</p>
          )}
        </div>
      </div>

      <div className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
          <ShoppingCart className="h-4 w-4" /> Panier
        </div>

        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 && <p className="py-8 text-center text-sm text-neutral-400">Panier vide</p>}
          {cart.map((item) => (
            <div key={item.product.id} className="flex items-center justify-between gap-2 border-b border-neutral-100 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{item.product.name}</p>
                <p className="text-xs text-neutral-400">{formatMontant(item.product.price)}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => updateQuantity(item.product.id, -1)} className="rounded-lg border border-neutral-200 p-1">
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-5 text-center text-sm">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.product.id, 1)} className="rounded-lg border border-neutral-200 p-1">
                  <Plus className="h-3 w-3" />
                </button>
                <button onClick={() => removeFromCart(item.product.id)} className="ml-1 text-neutral-300 hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {customers.length > 0 && (
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="mt-3 rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none"
          >
            <option value="">Client de passage</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4">
          <span className="text-sm font-medium text-neutral-500">Total</span>
          <span className="text-xl font-bold text-ink">{formatMontant(total)}</span>
        </div>

        {confirmation && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> {confirmation}
          </div>
        )}

        <Button onClick={handleCheckout} loading={checkingOut} disabled={cart.length === 0} className="mt-3 w-full">
          Encaisser
        </Button>
      </div>
    </div>
  );
}
