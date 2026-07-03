'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function ClientForm({ shopId }: { shopId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.from('customers').insert({ shop_id: shopId, name: form.name, phone: form.phone || null });
    setForm({ name: '', phone: '' });
    setLoading(false);
    router.refresh();
  }

  return (
    <Card>
      <CardTitle>Ajouter un client</CardTitle>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input label="Nom" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Button type="submit" loading={loading}>Ajouter</Button>
      </form>
    </Card>
  );
}
