'use client';

import { createClient } from '../supabase/client';
import { db, getUnsyncedSales, markSaleSynced } from './db';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

/**
 * Parcourt les ventes en attente et les pousse vers Supabase via la fonction
 * RPC process_sale (idempotente grâce à local_uuid). Ne supprime jamais une
 * vente locale tant que le serveur n'a pas confirmé - en cas d'échec réseau,
 * elle reste en file et sera retentée au prochain appel.
 */
export async function syncPendingSales(): Promise<{ synced: number; failed: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const supabase = createClient();
  const pending = await getUnsyncedSales();

  let synced = 0;
  let failed = 0;

  for (const sale of pending) {
    const { error } = await supabase.rpc('process_sale', {
      p_shop_id: sale.shop_id,
      p_local_uuid: sale.local_uuid,
      p_items: sale.items,
      p_customer_id: sale.customer_id,
      p_cashier_id: sale.cashier_id
    });

    if (error) {
      failed += 1;
      await db.pendingSales.update(sale.local_uuid, { sync_error: error.message });
    } else {
      await markSaleSynced(sale.local_uuid);
      synced += 1;
    }
  }

  return { synced, failed };
}

/** Nombre de ventes en attente de synchronisation - alimente l'indicateur visuel. */
export async function countPendingSales(): Promise<number> {
  return db.pendingSales.where('synced').equals(0).count();
}

/**
 * Enregistre les écouteurs online/offline + Background Sync API et déclenche
 * une synchronisation automatique dès que la connexion revient.
 */
export function registerAutoSync(onStatusChange: (status: SyncStatus) => void) {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = async () => {
    onStatusChange('syncing');
    const result = await syncPendingSales();
    onStatusChange(result.failed > 0 ? 'error' : 'success');
  };

  const handleOffline = () => onStatusChange('offline');

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  if (navigator.onLine) {
    handleOnline();
  } else {
    onStatusChange('offline');
  }

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
