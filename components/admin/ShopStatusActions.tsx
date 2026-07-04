'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

type Status = 'active' | 'suspended' | 'expired' | 'trial';

export function ShopStatusActions({ shopId, currentStatus }: { shopId: string; currentStatus: Status }) {
  const router = useRouter();
  const [loading, setLoading] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(status: Status) {
    setLoading(status);
    setError(null);
    const res = await fetch('/api/admin/update-shop-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopId, status })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Erreur lors de la mise à jour.');
      setLoading(null);
      return;
    }
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <div className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={currentStatus === 'active' ? 'secondary' : 'primary'}
          loading={loading === 'active'}
          disabled={currentStatus === 'active'}
          onClick={() => changeStatus('active')}
        >
          Activer
        </Button>
        <Button
          variant="danger"
          loading={loading === 'suspended'}
          disabled={currentStatus === 'suspended'}
          onClick={() => changeStatus('suspended')}
        >
          Suspendre
        </Button>
        <Button
          variant="secondary"
          loading={loading === 'trial'}
          disabled={currentStatus === 'trial'}
          onClick={() => changeStatus('trial')}
        >
          Repasser en essai
        </Button>
      </div>
    </div>
  );
}
