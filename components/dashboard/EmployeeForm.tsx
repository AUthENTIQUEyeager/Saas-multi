'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { EmployeePermission, UserRole } from '@/lib/types';

const PERMISSIONS: { value: EmployeePermission; label: string }[] = [
  { value: 'cashier', label: 'Caissier' },
  { value: 'stock_manager', label: 'Gestionnaire de stock' },
  { value: 'delivery', label: 'Livreur' },
  { value: 'accountant', label: 'Comptable' }
];

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'employee', label: 'Employé' },
  { value: 'vendeur', label: 'Vendeur' }
];

export function EmployeeForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'employee' });
  const [permissions, setPermissions] = useState<EmployeePermission[]>([]);

  function togglePermission(p: EmployeePermission) {
    setPermissions((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, role: e.target.value as UserRole }));
    // Reset permissions when switching to vendeur (no permissions needed)
    if (e.target.value === 'vendeur') {
      setPermissions([]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    // For vendeur role, we don't need permissions
    const payload = form.role === 'vendeur'
      ? { ...form }
      : { ...form, permissions };

    const res = await fetch('/api/app/create-employee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Erreur lors de la création de l'utilisateur.");
      return;
    }

    setForm({ fullName: '', email: '', password: '', role: 'employee' });
    setPermissions([]);
    setSuccess(true);
    router.refresh();
    setTimeout(() => setSuccess(false), 2500);
  }

  const isVendeurSelected = form.role === 'vendeur';

  return (
    <Card>
      <CardTitle>Créer un utilisateur</CardTitle>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
        {success && <div className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">Utilisateur créé</div>}

        <Input label="Nom complet" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="Mot de passe initial" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700">Type d'utilisateur</label>
          <select
            value={form.role}
            onChange={handleRoleChange}
            className="rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none"
          >
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>

        {!isVendeurSelected && (
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">Permissions (pour Employé uniquement)</label>
            <div className="flex flex-wrap gap-2">
              {PERMISSIONS.map((p) => (
                <button
                  type="button"
                  key={p.value}
                  onClick={() => togglePermission(p.value)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    permissions.includes(p.value)
                      ? 'border-brand bg-brand-light text-brand-dark'
                      : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <Button type="submit" loading={loading} className="mt-1">
          {isVendeurSelected ? 'Créer le vendeur' : 'Créer l'employé'}
        </Button>
      </form>
    </Card>
  );
}
