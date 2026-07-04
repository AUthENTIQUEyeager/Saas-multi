'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

type OwnerMode = 'none' | 'existing' | 'new';

interface Owner {
  id: string;
  full_name: string;
}

/**
 * Création d'une boutique = action sensible. Le formulaire appelle la route
 * API interne /api/admin/create-shop (jamais un insert direct côté client)
 * car elle doit créer des comptes via l'API admin de Supabase Auth, qui
 * nécessite la clé secrète (service_role / sb_secret_...).
 *
 * Un patron peut posséder plusieurs boutiques : ce formulaire permet donc
 * de rattacher la nouvelle boutique à un patron déjà existant (une seule
 * interface /owner pour lui, peu importe le nombre de boutiques), ou d'en
 * créer un nouveau, ou de n'en assigner aucun pour l'instant.
 */
export function NewShopForm({ existingOwners }: { existingOwners: Owner[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownerMode, setOwnerMode] = useState<OwnerMode>(existingOwners.length > 0 ? 'existing' : 'new');

  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    subscriptionEndDate: '',
    managerName: '',
    managerEmail: '',
    managerPassword: '',
    existingOwnerId: existingOwners[0]?.id ?? '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: ''
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      name: form.name,
      address: form.address,
      phone: form.phone,
      subscriptionEndDate: form.subscriptionEndDate,
      managerName: form.managerName,
      managerEmail: form.managerEmail,
      managerPassword: form.managerPassword,
      ownerMode,
      existingOwnerId: ownerMode === 'existing' ? form.existingOwnerId : undefined,
      ownerName: ownerMode === 'new' ? form.ownerName : undefined,
      ownerEmail: ownerMode === 'new' ? form.ownerEmail : undefined,
      ownerPassword: ownerMode === 'new' ? form.ownerPassword : undefined
    };

    const res = await fetch('/api/admin/create-shop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
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

          {/* --- Compte manager --- */}
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

          {/* --- Patron (propriétaire) --- */}
          <div className="mt-2 border-t border-neutral-100 pt-4">
            <p className="mb-3 text-sm font-semibold text-neutral-500">Patron (propriétaire)</p>

            <div className="mb-3 grid grid-cols-3 gap-2">
              {(['existing', 'new', 'none'] as OwnerMode[]).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  onClick={() => setOwnerMode(mode)}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-xs font-medium transition-colors',
                    ownerMode === mode ? 'border-brand bg-brand-light text-brand-dark' : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                  )}
                >
                  {mode === 'existing' ? 'Patron existant' : mode === 'new' ? 'Nouveau patron' : 'Aucun pour le moment'}
                </button>
              ))}
            </div>

            {ownerMode === 'existing' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-700">Sélectionner le patron</label>
                {existingOwners.length === 0 ? (
                  <p className="text-sm text-neutral-400">
                    Aucun patron existant. Choisis "Nouveau patron" pour en créer un.
                  </p>
                ) : (
                  <select
                    value={form.existingOwnerId}
                    onChange={(e) => update('existingOwnerId', e.target.value)}
                    className="rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none"
                  >
                    {existingOwners.map((o) => (
                      <option key={o.id} value={o.id}>{o.full_name}</option>
                    ))}
                  </select>
                )}
                <p className="mt-1 text-xs text-neutral-400">
                  Ce patron pourra voir cette boutique en plus de ses boutiques existantes, depuis une seule et même interface.
                </p>
              </div>
            )}

            {ownerMode === 'new' && (
              <div className="flex flex-col gap-4">
                <Input label="Nom du patron" required value={form.ownerName} onChange={(e) => update('ownerName', e.target.value)} />
                <Input
                  label="Email du patron"
                  type="email"
                  required
                  value={form.ownerEmail}
                  onChange={(e) => update('ownerEmail', e.target.value)}
                />
                <Input
                  label="Mot de passe initial"
                  type="password"
                  required
                  value={form.ownerPassword}
                  onChange={(e) => update('ownerPassword', e.target.value)}
                />
              </div>
            )}

            {ownerMode === 'none' && (
              <p className="text-sm text-neutral-400">
                Aucun patron ne sera rattaché à cette boutique. Tu pourras en lier un plus tard.
              </p>
            )}
          </div>

          <Button type="submit" loading={loading} className="mt-2">
            Créer la boutique
          </Button>
        </form>
      </Card>
    </div>
  );
}
