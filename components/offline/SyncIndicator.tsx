'use client';

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { registerAutoSync, countPendingSales, getLastSyncError, syncPendingSales, type SyncStatus } from '@/lib/offline/syncQueue';
import { cn } from '@/lib/utils';

/**
 * Badge fixe toujours visible pendant l'usage du POS. Affiche le nombre de
 * ventes/clients en attente ET le détail de l'erreur si la synchronisation
 * échoue, avec un bouton pour réessayer manuellement - une synchro qui
 * échoue silencieusement, c'est une vente qui n'atteint jamais le tableau
 * de bord.
 */
export function SyncIndicator() {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  async function refreshState() {
    const [count, error] = await Promise.all([countPendingSales(), getLastSyncError()]);
    setPendingCount(count);
    setLastError(error);
  }

  useEffect(() => {
    const unregister = registerAutoSync(setStatus);
    refreshState();
    const interval = setInterval(refreshState, 3000);
    return () => {
      unregister();
      clearInterval(interval);
    };
  }, []);

  async function handleRetry() {
    setRetrying(true);
    setStatus('syncing');
    const result = await syncPendingSales();
    await refreshState();
    setStatus(result.failed > 0 ? 'error' : 'success');
    setRetrying(false);
  }

  const hasError = pendingCount > 0 && !!lastError;
  const isOffline = status === 'offline';
  const isSyncing = status === 'syncing';

  const tone = hasError
    ? 'bg-red-100 text-red-700'
    : isOffline
    ? 'bg-neutral-200 text-neutral-700'
    : isSyncing
    ? 'bg-orange-100 text-orange-700'
    : pendingCount > 0
    ? 'bg-orange-100 text-orange-700'
    : 'bg-emerald-100 text-emerald-700';

  const icon = hasError ? (
    <AlertCircle className="h-3.5 w-3.5" />
  ) : isOffline ? (
    <WifiOff className="h-3.5 w-3.5" />
  ) : isSyncing ? (
    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
  ) : (
    <CheckCircle2 className="h-3.5 w-3.5" />
  );

  const label = hasError
    ? `Échec de synchro (${pendingCount})`
    : isOffline
    ? pendingCount > 0
      ? `Hors-ligne · ${pendingCount} en attente`
      : 'Hors-ligne'
    : isSyncing
    ? 'Synchronisation...'
    : pendingCount > 0
    ? `${pendingCount} en attente`
    : 'Synchronisé';

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetail((v) => !v)}
        className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium', tone)}
      >
        {icon}
        {label}
      </button>

      {showDetail && (hasError || pendingCount > 0) && (
        <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg">
          {hasError ? (
            <>
              <p className="mb-2 text-xs font-semibold text-red-700">Erreur de synchronisation</p>
              <p className="mb-3 break-words text-xs text-neutral-600">{lastError}</p>
            </>
          ) : (
            <p className="mb-3 text-xs text-neutral-600">
              {pendingCount} élément(s) en attente de connexion pour être envoyés au serveur.
            </p>
          )}
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="w-full rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {retrying ? 'Nouvelle tentative...' : 'Réessayer maintenant'}
          </button>
        </div>
      )}
    </div>
  );
}
