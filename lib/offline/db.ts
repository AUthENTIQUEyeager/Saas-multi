import Dexie, { type Table } from 'dexie';
import type { CartItem } from '../types';

/**
 * Base IndexedDB locale (via Dexie.js).
 * Stocke les ventes réalisées hors-ligne en attente de synchronisation,
 * ainsi qu'un cache léger des produits pour que le POS reste utilisable
 * sans connexion internet.
 */

export interface PendingSale {
  local_uuid: string; // identifiant idempotent, généré côté client
  shop_id: string;
  cashier_id: string;
  customer_id: string | null;
  items: { product_id: string; quantity: number; unit_price: number }[];
  discount: number;
  created_at: string;
  synced: boolean;
  sync_error?: string;
}

export interface CachedProduct {
  id: string;
  shop_id: string;
  name: string;
  price: number;
  stock_quantity: number;
  category_id: string | null;
  image_url: string | null;
  updated_at: string;
}

class OfflineDB extends Dexie {
  pendingSales!: Table<PendingSale, string>;
  cachedProducts!: Table<CachedProduct, string>;

  constructor() {
    super('boutique-offline-db');
    this.version(1).stores({
      pendingSales: 'local_uuid, shop_id, synced, created_at',
      cachedProducts: 'id, shop_id, name'
    });
  }
}

export const db = new OfflineDB();

export async function queueSale(sale: Omit<PendingSale, 'synced'>) {
  await db.pendingSales.put({ ...sale, synced: false });
}

export async function getUnsyncedSales(): Promise<PendingSale[]> {
  return db.pendingSales.where('synced').equals(0).toArray();
}

export async function markSaleSynced(local_uuid: string) {
  await db.pendingSales.update(local_uuid, { synced: true });
}

export async function cacheProducts(products: CachedProduct[]) {
  await db.cachedProducts.bulkPut(products);
}

export async function getCachedProducts(shopId: string): Promise<CachedProduct[]> {
  return db.cachedProducts.where('shop_id').equals(shopId).toArray();
}

/** Décrémente le stock en cache localement pour un retour visuel immédiat (optimistic UI). */
export async function decrementCachedStock(productId: string, quantity: number) {
  const product = await db.cachedProducts.get(productId);
  if (product) {
    await db.cachedProducts.update(productId, {
      stock_quantity: Math.max(0, product.stock_quantity - quantity)
    });
  }
}
