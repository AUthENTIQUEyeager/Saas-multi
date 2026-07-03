'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function ProductForm({ shopId, categories }: { shopId: string; categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', price: '', stock_quantity: '', category_id: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.from('products').insert({
      shop_id: shopId,
      name: form.name,
      price: Number(form.price),
      stock_quantity: Number(form.stock_quantity) || 0,
      category_id: form.category_id || null
    });
    setForm({ name: '', price: '', stock_quantity: '', category_id: '' });
    setLoading(false);
    router.refresh();
  }

  return (
    <Card>
      <CardTitle>Ajouter un produit</CardTitle>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
