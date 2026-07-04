'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function DeliveryForm({ shopId }: { shopId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [address, setAddress] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();
    const { error: insertError } = await supabase.from('deliveries').insert({
      shop_id: shopId,
      address,
      status: 'pending'
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setAddress('');
    setSuccess(true);
    router.refresh();
    setTimeout(() => setSuccess(false), 2500);
  }

  return (
    <Card>
      <CardTitle>Nouvelle livraison</CardTitle>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
        {success && <div className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">Livraison créée</div>}
        <Input label="Adresse de livraison" required value={address} onChange={(e) => setAddress(e.target.value)} />
        <Button type="submit" loading={loading}>Créer</Button>
      </form>
    </Card>
  );
}
