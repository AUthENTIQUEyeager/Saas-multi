'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CheckCircle2 } from 'lucide-react';

export function ProductForm({ shopId, categories }: { shopId: string; categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', stock_quantity: '', category_id: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();
    const { error: insertError } = await supabase.from('products').insert({
      shop_id: shopId,
      name: form.name,
      price: Number(form.price),
      stock_quantity: Number(form.stock_quantity) || 0,
      category_id: form.category_id || null
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setForm({ name: '', price: '', stock_quantity: '', category_id: '' });
    setSuccess(true);
    router.refresh();
    setTimeout(() => setSuccess(false), 2500);
  }

  return (
    <Card>
      <CardTitle>Ajouter un produit</CardTitle>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
        {success && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Produit ajouté
          </div>
        )}
        <Input label="Nom" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input
          label="Prix (FCFA)"
          type="number"
          required
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />
        <Input
          label="Quantité en stock"
          type="number"
          value={form.stock_quantity}
          onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
        />
        {categories.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700">Catégorie</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none"
            >
              <option value="">Aucune</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        <Button type="submit" loading={loading}>Ajouter</Button>
      </form>
    </Card>
  );
}
