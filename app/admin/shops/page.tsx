import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Shop } from '@/lib/types';

const statusTone = { active: 'vert', trial: 'orange', suspended: 'rouge', expired: 'gris' } as const;
const statusLabel = { active: 'Actif', trial: "Période d'essai", suspended: 'Suspendu', expired: 'Expiré' } as const;

export default async function AdminShopsPage() {
  const supabase = createClient();
  const { data: shops } = await supabase.from('shops').select('*').order('created_at', { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{shops?.length ?? 0} boutique(s) enregistrée(s)</p>
        <Link href="/admin/shops/nouveau">
          <Button>
            <Plus className="h-4 w-4" /> Nouvelle boutique
          </Button>
        </Link>
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-5 py-3">Boutique</th>
              <th className="px-5 py-3">Téléphone</th>
              <th className="px-5 py-3">Abonnement</th>
              <th className="px-5 py-3">Expire le</th>
              <th className="px-5 py-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {(shops as Shop[] | null)?.map((shop) => (
              <tr key={shop.id} className="cursor-pointer hover:bg-neutral-50">
                <td className="px-5 py-3 font-medium text-ink">
                  <Link href={`/admin/shops/${shop.id}`} className="block">{shop.name}</Link>
                </td>
                <td className="px-5 py-3 text-neutral-600">
                  <Link href={`/admin/shops/${shop.id}`} className="block">{shop.phone ?? '—'}</Link>
                </td>
                <td className="px-5 py-3 text-neutral-600">
                  <Link href={`/admin/shops/${shop.id}`} className="block">{statusLabel[shop.subscription_status]}</Link>
                </td>
                <td className="px-5 py-3 text-neutral-600">
                  <Link href={`/admin/shops/${shop.id}`} className="block">
                    {shop.subscription_end_date ? formatDate(shop.subscription_end_date) : '—'}
                  </Link>
                </td>
                <td className="px-5 py-3">
                  <Link href={`/admin/shops/${shop.id}`} className="block">
                    <Badge tone={statusTone[shop.subscription_status]}>{statusLabel[shop.subscription_status]}</Badge>
                  </Link>
                </td>
              </tr>
            ))}
            {!shops?.length && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-neutral-400">
                  Aucune boutique pour le moment. Créez-en une pour commencer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
