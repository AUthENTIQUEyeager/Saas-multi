'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CheckCircle2 } from 'lucide-react';

export function ClientForm({ shopId }: { shopId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();
    const { error: insertError } = await supabase
      .from('customers')
      .insert({ shop_id: shopId, name: form.name, phone: form.phone || null });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setForm({ name: '', phone: '' });
    setSuccess(true);
    router.refresh();
    setTimeout(() => setSuccess(false), 2500);
  }

  return (
    <Card>
      <CardTitle>Ajouter un client</CardTitle>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
        {success && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Client ajouté
          </div>
        )}
        <Input label="Nom" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Button type="submit" loading={loading}>Ajouter</Button>
      </form>
    </Card>
  );
}
