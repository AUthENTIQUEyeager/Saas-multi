'use client';

import { useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { getLocalSalesSince } from '@/lib/offline/db';
import { formatMontant } from '@/lib/utils';
import { WifiOff } from 'lucide-react';

/**
 * Carte "Ventes du jour" réactive même sans connexion : le total affiché =
 * le total confirmé côté serveur au moment du chargement de la page + les
 * ventes présentes dans le cache local créées depuis. Se recalcule toutes
 * les 2 secondes, sans dépendre du réseau - une vente faite hors-ligne
 * incrémente donc le compteur immédiatement, ici comme dans le panier POS.
 */
export function LiveRevenueCard({
  shopId,
  baselineRevenue,
  baselineCount,
  baselineTimestamp
}: {
  shopId: string;
  baselineRevenue: number;
  baselineCount: number;
  baselineTimestamp: string;
}) {
  const [localRevenue, setLocalRevenue] = useState(0);
  const [localCount, setLocalCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const { total, count } = await getLocalSalesSince(shopId, baselineTimestamp);
      if (!cancelled) {
        setLocalRevenue(total);
        setLocalCount(count);
      }
    }

    refresh();
    const interval = setInterval(refresh, 2000);
    window.addEventListener('online', refresh);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('online', refresh);
    };
  }, [shopId, baselineTimestamp]);

  const totalRevenue = baselineRevenue + localRevenue;
  const totalCount = baselineCount + localCount;

  return (
    <Card>
      <CardTitle>Ventes du jour</CardTitle>
      <p className="text-2xl font-bold text-ink">{formatMontant(totalRevenue)}</p>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-400">
        <span>{totalCount} transaction(s)</span>
        {localCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-orange-700">
            <WifiOff className="h-3 w-3" /> {localCount} non synchro.
          </span>
        )}
      </div>
    </Card>
  );
}
