'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { OrderStatus } from '@/lib/types';

const STATUSES: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'];
const label: Record<OrderStatus, string> = {
  pending: 'En attente', confirmed: 'Confirmée', preparing: 'Préparation', shipped: 'Expédiée', delivered: 'Livrée', cancelled: 'Annulée'
};

export function DeliveryStatusSelect({ deliveryId, currentStatus }: { deliveryId: string; currentStatus: OrderStatus }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChange(status: OrderStatus) {
    setLoading(true);
    const supabase = createClient();
    await supabase.from('deliveries').update({ status }).eq('id', deliveryId);
    setLoading(false);
    router.refresh();
  }

  return (
    <select
      value={currentStatus}
      disabled={loading}
      onChange={(e) => handleChange(e.target.value as OrderStatus)}
      className="rounded-lg border border-neutral-200 px-2 py-1.5 text-xs outline-none disabled:opacity-50"
    >
      {STATUSES.map((s) => <option key={s} value={s}>{label[s]}</option>)}
    </select>
  );
}
