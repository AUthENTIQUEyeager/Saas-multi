'use client';

import { useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { getLocalLowStock } from '@/lib/offline/db';
import { AlertTriangle } from 'lucide-react';

interface LowStockItem {
  id: string;
  name: string;
  stock_quantity: number;
}

/**
 * Carte "Stock bas" réactive : utilise le cache produit local (mis à jour
 * en temps réel à chaque vente, même hors-ligne) dès qu'il existe pour
 * cette boutique sur cet appareil. Si le cache est vide (jamais visité le
 * POS sur cet appareil), retombe sur la liste calculée côté serveur.
 */
export function LiveStockCard({ shopId, baseline }: { shopId: string; baseline: LowStockItem[] }) {
  const [items, setItems] = useState<LowStockItem[]>(baseline);
  const [usingCache, setUsingCache] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const local = await getLocalLowStock(shopId);
      if (cancelled) return;
      if (local.length > 0 || usingCache) {
        setItems(local);
        setUsingCache(true);
      }
    }

    refresh();
    const interval = setInterval(refresh, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  return (
    <>
      <Card>
        <CardTitle>Stock bas</CardTitle>
        <p className="text-2xl font-bold text-ink">{items.length}</p>
        <p className="mt-1 text-xs text-neutral-400">produit(s) à réapprovisionner</p>
      </Card>

      {items.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 sm:col-span-2 lg:col-span-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
            <div>
              <p className="text-sm font-semibold text-orange-800">Produits à réapprovisionner</p>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-orange-700">
                {items.slice(0, 5).map((p) => (
                  <li key={p.id}>{p.name} — {p.stock_quantity} restant(s)</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
