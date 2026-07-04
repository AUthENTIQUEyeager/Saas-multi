'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface Customer {
  id: string;
  name: string;
}

export function DebtForm({ shopId, customers }: { shopId: string; customers: Customer[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [useNewCustomer, setUseNewCustomer] = useState(customers.length === 0);
  const [form, setForm] = useState({
    customer_id: customers[0]?.id ?? '',
    new_customer_name: '',
    new_customer_phone: '',
    total_amount: '',
    due_date: ''
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();
    let customerId = form.customer_id;

    if (useNewCustomer) {
      if (!form.new_customer_name.trim()) {
        setError('Indique le nom du client.');
        setLoading(false);
        return;
      }
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({ shop_id: shopId, name: form.new_customer_name, phone: form.new_customer_phone || null })
        .select()
        .single();
      if (customerError || !newCustomer) {
        setError(customerError?.message ?? 'Erreur création du client.');
        setLoading(false);
        return;
      }
      customerId = newCustomer.id;
    }

    if (!customerId) {
      setError('Sélectionne ou crée un client.');
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('debts').insert({
      shop_id: shopId,
      customer_id: customerId,
      total_amount: Number(form.total_amount),
      due_date: form.due_date || null
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setForm({ customer_id: customers[0]?.id ?? '', new_customer_name: '', new_customer_phone: '', total_amount: '', due_date: '' });
    setSuccess(true);
    router.refresh();
    setTimeout(() => setSuccess(false), 2500);
  }

  return (
    <Card>
      <CardTitle>Nouvelle dette</CardTitle>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
        {success && <div className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">Dette enregistrée</div>}

        {customers.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setUseNewCustomer(false)}
              className={`rounded-xl border px-3 py-2 text-xs font-medium ${!useNewCustomer ? 'border-brand bg-brand-light text-brand-dark' : 'border-neutral-200 text-neutral-500'}`}
            >
              Client existant
            </button>
            <button
              type="button"
              onClick={() => setUseNewCustomer(true)}
              className={`rounded-xl border px-3 py-2 text-xs font-medium ${useNewCustomer ? 'border-brand bg-brand-light text-brand-dark' : 'border-neutral-200 text-neutral-500'}`}
            >
              Nouveau client
            </button>
          </div>
        )}

        {!useNewCustomer && customers.length > 0 ? (
          <select
            value={form.customer_id}
            onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
            className="rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none"
          >
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        ) : (
          <div className="flex flex-col gap-3">
            <Input label="Nom du client" required value={form.new_customer_name} onChange={(e) => setForm({ ...form, new_customer_name: e.target.value })} />
            <Input label="Téléphone (optionnel)" value={form.new_customer_phone} onChange={(e) => setForm({ ...form, new_customer_phone: e.target.value })} />
          </div>
        )}

        <Input label="Montant de la dette (FCFA)" type="number" required value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} />
        <Input label="Échéance (optionnel)" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />

        <Button type="submit" loading={loading}>Enregistrer</Button>
      </form>
    </Card>
  );
}
