'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface Supplier {
  id: string;
  name: string;
}

export function SupplierOrderForm({ shopId, suppliers }: { shopId: string; suppliers: Supplier[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [useNewSupplier, setUseNewSupplier] = useState(suppliers.length === 0);
  const [form, setForm] = useState({
    supplier_id: suppliers[0]?.id ?? '',
    new_supplier_name: '',
    new_supplier_phone: '',
    total_amount: '',
    paid_amount: ''
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();
    let supplierId = form.supplier_id;

    if (useNewSupplier) {
      if (!form.new_supplier_name.trim()) {
        setError('Indique le nom du fournisseur.');
        setLoading(false);
        return;
      }
      const { data: newSupplier, error: supplierError } = await supabase
        .from('suppliers')
        .insert({ shop_id: shopId, name: form.new_supplier_name, phone: form.new_supplier_phone || null })
        .select()
        .single();
      if (supplierError || !newSupplier) {
        setError(supplierError?.message ?? 'Erreur création du fournisseur.');
        setLoading(false);
        return;
      }
      supplierId = newSupplier.id;
    }

    if (!supplierId) {
      setError('Sélectionne ou crée un fournisseur.');
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('supplier_orders').insert({
      shop_id: shopId,
      supplier_id: supplierId,
      total_amount: Number(form.total_amount),
      paid_amount: Number(form.paid_amount) || 0
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setForm({ supplier_id: suppliers[0]?.id ?? '', new_supplier_name: '', new_supplier_phone: '', total_amount: '', paid_amount: '' });
    setSuccess(true);
    router.refresh();
    setTimeout(() => setSuccess(false), 2500);
  }

  return (
    <Card>
      <CardTitle>Nouvelle commande fournisseur</CardTitle>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
        {success && <div className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">Commande enregistrée</div>}

        {suppliers.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setUseNewSupplier(false)}
              className={`rounded-xl border px-3 py-2 text-xs font-medium ${!useNewSupplier ? 'border-brand bg-brand-light text-brand-dark' : 'border-neutral-200 text-neutral-500'}`}
            >
              Fournisseur existant
            </button>
            <button
              type="button"
              onClick={() => setUseNewSupplier(true)}
              className={`rounded-xl border px-3 py-2 text-xs font-medium ${useNewSupplier ? 'border-brand bg-brand-light text-brand-dark' : 'border-neutral-200 text-neutral-500'}`}
            >
              Nouveau fournisseur
            </button>
          </div>
        )}

        {!useNewSupplier && suppliers.length > 0 ? (
          <select
            value={form.supplier_id}
            onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
            className="rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none"
          >
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        ) : (
          <div className="flex flex-col gap-3">
            <Input label="Nom du fournisseur" required value={form.new_supplier_name} onChange={(e) => setForm({ ...form, new_supplier_name: e.target.value })} />
            <Input label="Téléphone (optionnel)" value={form.new_supplier_phone} onChange={(e) => setForm({ ...form, new_supplier_phone: e.target.value })} />
          </div>
        )}

        <Input label="Montant total (FCFA)" type="number" required value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} />
        <Input label="Déjà payé (optionnel)" type="number" value={form.paid_amount} onChange={(e) => setForm({ ...form, paid_amount: e.target.value })} />

        <Button type="submit" loading={loading}>Enregistrer</Button>
      </form>
    </Card>
  );
}
