'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CheckCircle2 } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ category: 'other' as ExpenseCategory, amount: '', description: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from('expenses').insert({
      shop_id: shopId,
      category: form.category,
      amount: Number(form.amount),
      description: form.description || null,
      created_by: user?.id
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setForm({ category: 'other', amount: '', description: '' });
    setSuccess(true);
    router.refresh();
    setTimeout(() => setSuccess(false), 2500);
  }

  return (
    <Card>
      <CardTitle>Ajouter une dépense</CardTitle>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
        {success && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Dépense ajoutée
          </div>
        )}
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
