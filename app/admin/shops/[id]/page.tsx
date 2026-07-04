import { createClient } from '@/lib/supabase/server';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDate, formatMontant } from '@/lib/utils';
import { ShopStatusActions } from '@/components/admin/ShopStatusActions';
import { notFound } from 'next/navigation';

const statusLabel: Record<string, string> = {
  active: 'Actif',
  trial: "Période d'essai",
  suspended: 'Suspendu',
  expired: 'Expiré'
};
const statusTone: Record<string, 'vert' | 'orange' | 'rouge' | 'gris'> = {
  active: 'vert',
  trial: 'orange',
  suspended: 'rouge',
  expired: 'gris'
};

export default async function AdminShopDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: shop } = await supabase.from('shops').select('*').eq('id', params.id).single();
  if (!shop) notFound();

  const [{ data: managers }, { data: owners }, { data: sales }] = await Promise.all([
    supabase.from('profiles').select('id, full_name').eq('shop_id', params.id).eq('role', 'manager'),
    supabase.from('owner_shops').select('profiles(id, full_name)').eq('shop_id', params.id),
    supabase.from('sales').select('total_amount').eq('shop_id', params.id)
  ]);

  const revenue = sales?.reduce((sum, s) => sum + Number(s.total_amount), 0) ?? 0;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <p className="text-xs text-neutral-400">Détail boutique</p>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-ink">{shop.name}</h1>
          <Badge tone={statusTone[shop.subscription_status]}>{statusLabel[shop.subscription_status]}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardTitle>Chiffre d'affaires</CardTitle>
          <p className="text-xl font-bold text-ink">{formatMontant(revenue)}</p>
        </Card>
        <Card>
          <CardTitle>Fin d'abonnement</CardTitle>
          <p className="text-xl font-bold text-ink">
            {shop.subscription_end_date ? formatDate(shop.subscription_end_date) : '—'}
          </p>
        </Card>
        <Card>
          <CardTitle>Téléphone</CardTitle>
          <p className="text-xl font-bold text-ink">{shop.phone ?? '—'}</p>
        </Card>
      </div>

      <Card>
        <CardTitle>Équipe</CardTitle>
        <div className="flex flex-col gap-2 text-sm">
          <p><span className="text-neutral-400">Manager(s) :</span> {managers?.map((m) => m.full_name).join(', ') || '—'}</p>
          <p>
            <span className="text-neutral-400">Patron(s) :</span>{' '}
            {owners?.map((o: any) => o.profiles?.full_name).filter(Boolean).join(', ') || 'Aucun'}
          </p>
        </div>
      </Card>

      <Card>
        <CardTitle>Gestion de l'abonnement</CardTitle>
        <p className="mb-4 text-sm text-neutral-500">
          Suspendre une boutique bloque immédiatement l'accès de son équipe à l'espace de gestion.
        </p>
        <ShopStatusActions shopId={shop.id} currentStatus={shop.subscription_status} />
      </Card>
    </div>
  );
}
