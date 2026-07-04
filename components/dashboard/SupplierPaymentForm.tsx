'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { CircleDollarSign, X } from 'lucide-react';
import { formatMontant } from '@/lib/utils';

export function SupplierPaymentForm({ orderId, remaining }: { orderId: string; remaining: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error: rpcError } = await supabase.rpc('record_supplier_payment', {
      p_order_id: orderId,
      p_amount: Number(amount),
      p_recorded_by: user?.id
    });

    setLoading(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setAmount('');
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
      >
        <CircleDollarSign className="h-3.5 w-3.5" /> Payer
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
      <input
        type="number"
        autoFocus
        placeholder={`Max ${formatMontant(remaining)}`}
        value={amount}
        max={remaining}
        onChange={(e) => setAmount(e.target.value)}
        className="w-28 rounded-lg border border-neutral-300 px-2 py-1.5 text-xs outline-none"
        required
      />
      <Button type="submit" loading={loading} className="!px-2.5 !py-1.5 !text-xs">Valider</Button>
      <button type="button" onClick={() => setOpen(false)} className="text-neutral-400 hover:text-neutral-600">
        <X className="h-4 w-4" />
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}
