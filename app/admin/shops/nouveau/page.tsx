'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

/**
 * Création d'une boutique = action sensible.
 * Le formulaire appelle l'Edge Function `create-shop` (jamais un insert direct
 * côté client) car elle doit aussi créer le compte manager via l'API admin
 * de Supabase Auth, qui nécessite la service_role key.
 */
export default function NewShopPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    subscriptionEndDate: '',
    managerName: '',
    managerEmail: '',
    managerPassword: ''
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: sessionData } = await supabase.auth.getSession();

    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-shop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session?.access_token}`
      },
      body: JSON.stringify(form)
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Erreur lors de la création de la boutique.');
      setLoading(false);
      return;
    }

    router.push('/admin/shops');
    router.refresh();
  }

  return (
    <div className="max-w-xl">
      <Card>
        <CardTitle>Nouvelle boutique</CardTitle>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}

          <Input label="Nom de la boutique" required value={form.name} onChange={(e) => update('name', e.target.value)} />
          <Input label="Adresse" value={form.address} onChange={(e) => update('address', e.target.value)} />
          <Input label="Téléphone" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          <Input
            label="Fin d'abonnement"
            type="date"
            required
            value={form.subscriptionEndDate}
            onChange={(e) => update('subscriptionEndDate', e.target.value)}
          />

          <div className="mt-2 border-t border-neutral-100 pt-4">
            <p className="mb-3 text-sm font-semibold text-neutral-500">Compte manager</p>
            <div className="flex flex-col gap-4">
              <Input label="Nom du manager" required value={form.managerName} onChange={(e) => update('managerName', e.target.value)} />
              <Input
                label="Email du manager"
                type="email"
                required
                value={form.managerEmail}
                onChange={(e) => update('managerEmail', e.target.value)}
              />
              <Input
                label="Mot de passe initial"
                type="password"
                required
                value={form.managerPassword}
                onChange={(e) => update('managerPassword', e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" loading={loading} className="mt-2">
            Créer la boutique
          </Button>
        </form>
      </Card>
    </div>
  );
}
