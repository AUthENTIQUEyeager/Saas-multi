'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface Product {
  id: string;
  name: string;
}

export function StockMovementForm({ shopId, products }: { shopId: string; products: Product[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ product_id: products[0]?.id ?? '', movement_type: 'in', quantity: '', reason: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.product_id) {
      setError('Ajoute d\'abord un produit.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error: rpcError } = await supabase.rpc('record_stock_movement', {
      p_shop_id: shopId,
      p_product_id: form.product_id,
      p_movement_type: form.movement_type,
      p_quantity: Number(form.quantity),
      p_reason: form.reason || null,
      p_created_by: user?.id
    });

    setLoading(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setForm({ ...form, quantity: '', reason: '' });
    setSuccess(true);
    router.refresh();
    setTimeout(() => setSuccess(false), 2500);
  }

  return (
    <Card>
      <CardTitle>Nouveau mouvement de stock</CardTitle>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
        {success && <div className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">Mouvement enregistré</div>}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700">Produit</label>
          <select
            value={form.product_id}
            onChange={(e) => setForm({ ...form, product_id: e.target.value })}
            className="rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none"
          >
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700">Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, movement_type: 'in' })}
              className={`rounded-xl border px-3 py-2 text-sm font-medium ${form.movement_type === 'in' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-neutral-200 text-neutral-500'}`}
            >
              Entrée
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, movement_type: 'out' })}
              className={`rounded-xl border px-3 py-2 text-sm font-medium ${form.movement_type === 'out' ? 'border-red-500 bg-red-50 text-red-700' : 'border-neutral-200 text-neutral-500'}`}
            >
              Sortie
            </button>
          </div>
        </div>

        <Input label="Quantité" type="number" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        <Input label="Motif (optionnel)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />

        <Button type="submit" loading={loading} disabled={!products.length}>Enregistrer</Button>
        {!products.length && <p className="text-xs text-neutral-400">Ajoute d'abord un produit depuis la page Produits.</p>}
      </form>
    </Card>
  );
}
