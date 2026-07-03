'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { ExpenseCategory } from '@/lib/types';

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'salary', label: 'Salaire' },
  { value: 'rent', label: 'Loyer' },
  { value: 'electricity', label: 'Électricité' },
  { value: 'transport', label: 'Transport' },
  { value: 'purchase', label: 'Achat' },
  { value: 'other', label: 'Autre' }
];

export function ExpenseForm({ shopId }: { shopId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ category: 'other' as ExpenseCategory, amount: '', description: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('expenses').insert({
      shop_id: shopId,
      category: form.category,
      amount: Number(form.amount),
      description: form.description || null,
      created_by: user?.id
    });
    setForm({ category: 'other', amount: '', description: '' });
    setLoading(false);
    router.refresh();
  }

  return (
    <Card>
      <CardTitle>Ajouter une dépense</CardTitle>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700">Catégorie</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
            className="rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none"
          >
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <Input label="Montant (FCFA)" type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <Button type="submit" loading={loading}>Ajouter</Button>
      </form>
    </Card>
  );
}
