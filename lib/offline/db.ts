import Dexie, { type Table } from 'dexie';

/**
 * Base IndexedDB locale (via Dexie.js).
 *
 * IMPORTANT : le champ `synced` est stocké en NOMBRE (0 ou 1), jamais en
 * booléen. IndexedDB n'accepte pas les booléens comme clé de recherche
 * indexée (ce n'est pas un type de clé valide selon la spec) - une requête
 * du type where('synced').equals(0) sur un champ booléen ne trouve jamais
 * rien, silencieusement, même si la donnée existe. C'est ce qui empêchait
 * toute synchronisation de se déclencher.
 */

export interface PendingSale {
  local_uuid: string;
  shop_id: string;
  cashier_id: string;
  customer_id: string | null;
  items: { product_id: string; quantity: number; unit_price: number }[];
  discount: number;
  created_at: string;
  synced: 0 | 1;
  sync_error?: string;
}

export interface PendingCustomer {
  id: string;
  shop_id: string;
  name: string;
  phone: string | null;
  synced: 0 | 1;
  sync_error?: string;
}

export interface CachedProduct {
  id: string;
  shop_id: string;
  name: string;
  price: number;
  cost_price: number | null;
  stock_quantity: number;
  category_id: string | null;
  image_url: string | null;
  updated_at: string;
}

class OfflineDB extends Dexie {
  pendingSales!: Table<PendingSale, string>;
  pendingCustomers!: Table<PendingCustomer, string>;
  cachedProducts!: Table<CachedProduct, string>;

  constructor() {
    super('boutique-offline-db');
    this.version(1).stores({
      pendingSales: 'local_uuid, shop_id, synced, created_at',
      cachedProducts: 'id, shop_id, name'
    });
    this.version(2).stores({
      pendingSales: 'local_uuid, shop_id, synced, created_at',
      cachedProducts: 'id, shop_id, name',
      pendingCustomers: 'id, shop_id, synced'
    });
    // v3 : corrige les enregistrements existants où `synced` a été stocké
    // en booléen (bug initial) en le convertissant en 0/1, pour que les
    // ventes déjà coincées dans le navigateur redeviennent synchronisables
    // sans que la personne ait besoin de vider son cache.
    this.version(3)
      .stores({
        pendingSales: 'local_uuid, shop_id, synced, created_at',
        cachedProducts: 'id, shop_id, name',
        pendingCustomers: 'id, shop_id, synced'
      })
      .upgrade(async (tx) => {
        await tx
          .table('pendingSales')
          .toCollection()
          .modify((sale: any) => {
            sale.synced = sale.synced === true || sale.synced === 1 ? 1 : 0;
          });
        await tx
          .table('pendingCustomers')
          .toCollection()
          .modify((customer: any) => {
            customer.synced = customer.synced === true || customer.synced === 1 ? 1 : 0;
          });
      });
  }
}

export const db = new OfflineDB();

// --- Ventes ---
export async function queueSale(sale: Omit<PendingSale, 'synced'>) {
  await db.pendingSales.put({ ...sale, synced: 0 });
}

export async function getUnsyncedSales(): Promise<PendingSale[]> {
  return db.pendingSales.where('synced').equals(0).toArray();
}

export async function markSaleSynced(local_uuid: string) {
  await db.pendingSales.update(local_uuid, { synced: 1 });
}

// --- Clients (créés depuis le POS) ---
export async function queueCustomer(customer: Omit<PendingCustomer, 'synced'>) {
  await db.pendingCustomers.put({ ...customer, synced: 0 });
}

export async function getUnsyncedCustomers(): Promise<PendingCustomer[]> {
  return db.pendingCustomers.where('synced').equals(0).toArray();
}

export async function markCustomerSynced(id: string) {
  await db.pendingCustomers.update(id, { synced: 1 });
}

// --- Produits (cache pour usage hors-ligne) ---
export async function cacheProducts(products: CachedProduct[]) {
  await db.cachedProducts.bulkPut(products);
}

export async function getCachedProducts(shopId: string): Promise<CachedProduct[]> {
  return db.cachedProducts.where('shop_id').equals(shopId).toArray();
}

export async function decrementCachedStock(productId: string, quantity: number) {
  const product = await db.cachedProducts.get(productId);
  if (product) {
    await db.cachedProducts.update(productId, {
      stock_quantity: Math.max(0, product.stock_quantity - quantity)
    });
  }
}
