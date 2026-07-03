'use client';

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { registerAutoSync, countPendingSales, type SyncStatus } from '@/lib/offline/syncQueue';
import { cn } from '@/lib/utils';

/**
 * Badge fixe toujours visible pendant l'usage du POS - indique clairement
 * si des ventes sont en attente de synchronisation. Voir section 5.4 / 9.3
 * du document d'architecture.
 */
export function SyncIndicator() {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const unregister = registerAutoSync(setStatus);
    const interval = setInterval(async () => {
      setPendingCount(await countPendingSales());
    }, 3000);
    return () => {
      unregister();
      clearInterval(interval);
    };
  }, []);

  const config: Record<SyncStatus, { icon: JSX.Element; label: string; tone: string }> = {
    idle: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: 'Synchronisé', tone: 'bg-emerald-100 text-emerald-700' },
    syncing: { icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" />, label: 'Synchronisation...', tone: 'bg-orange-100 text-orange-700' },
    success: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: 'Synchronisé', tone: 'bg-emerald-100 text-emerald-700' },
    error: { icon: <AlertCircle className="h-3.5 w-3.5" />, label: `${pendingCount} vente(s) en attente`, tone: 'bg-red-100 text-red-700' },
    offline: { icon: <WifiOff className="h-3.5 w-3.5" />, label: pendingCount > 0 ? `Hors-ligne · ${pendingCount} en attente` : 'Hors-ligne', tone: 'bg-neutral-200 text-neutral-700' }
  };

  const current = pendingCount > 0 && status !== 'syncing' && status !== 'offline'
    ? { ...config.error, label: `${pendingCount} vente(s) en attente` }
    : config[status];

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium', current.tone)}>
      {current.icon}
      {current.label}
    </span>
  );
}
