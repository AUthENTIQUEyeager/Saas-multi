'use client';

import { createClient } from '../supabase/client';
import { db, getUnsyncedSales, markSaleSynced, getUnsyncedCustomers, markCustomerSynced } from './db';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

/**
 * Synchronise d'abord les clients en attente (car une vente peut référencer
 * un customer_id qui n'existe pas encore côté serveur), puis les ventes.
 * L'upsert est idempotent grâce à l'UUID généré côté client.
 */
async function syncPendingCustomers(): Promise<{ synced: number; failed: number }> {
  const supabase = createClient();
  const pending = await getUnsyncedCustomers();
  let synced = 0;
  let failed = 0;

  for (const customer of pending) {
    const { error } = await supabase
      .from('customers')
      .upsert({ id: customer.id, shop_id: customer.shop_id, name: customer.name, phone: customer.phone });

    if (error) {
      failed += 1;
      await db.pendingCustomers.update(customer.id, { sync_error: error.message });
    } else {
      await markCustomerSynced(customer.id);
      synced += 1;
    }
  }

  return { synced, failed };
}

export async function syncPendingSales(): Promise<{ synced: number; failed: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  await syncPendingCustomers();

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

/** Nombre total d'éléments en attente de synchronisation (ventes + clients). */
export async function countPendingSales(): Promise<number> {
  const [sales, customers] = await Promise.all([
    db.pendingSales.where('synced').equals(0).count(),
    db.pendingCustomers.where('synced').equals(0).count()
  ]);
  return sales + customers;
}

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
