'use client';

import { createClient } from '@/lib/supabase/client';
import { Card, CardTitle } from '@/components/ui/Card';
import { LiveRevenueCard } from '@/components/dashboard/LiveRevenueCard';
import { LiveStockCard } from '@/components/dashboard/LiveStockCard';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [shopId, setShopId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [todaySales, setTodaySales] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [overdueDebts, setOverdueDebts] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const supabase = createClient();

        // Get user profile
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          redirect('/login');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('shop_id, role')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        // Redirect vendeurs to POS
        if (profile?.role === 'vendeur') {
          redirect('/app/pos');
          return;
        }

        const shopIdFromProfile = profile!.shop_id!;
        setShopId(shopIdFromProfile);

        // Fetch data
        const today = new Date().toISOString().slice(0, 10);
        const [{ data: todaySalesData }, { data: lowStockData }, { data: overdueDebtsData }] = await Promise.all([
          supabase.from('sales').select('total_amount').eq('shop_id', shopIdFromProfile).gte('created_at', today),
          supabase.from('products').select('id, name, stock_quantity, low_stock_threshold').eq('shop_id', shopIdFromProfile),
          supabase.from('debts').select('id, total_amount, paid_amount, due_date').eq('shop_id', shopIdFromProfile).lt('due_date', today)
        ]);

        setTodaySales(todaySalesData ?? []);
        setLowStock(lowStockData ?? []);
        setOverdueDebts(overdueDebtsData ?? []);
      } catch (err) {
        console.error('Error loading dashboard:', err);
        setError('Erreur lors du chargement du tableau de bord');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50">
        <p className="text-xl font-bold text-ink">Chargement...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50">
        <p className="text-xl font-bold text-red-600">{error}</p>
      </div>
    );
  }

  const revenueToday = todaySales?.reduce((sum, s) => sum + Number(s.total_amount), 0) ?? 0;
  const lowStockProducts = (lowStock ?? [])
    .filter((p) => p.stock_quantity <= p.low_stock_threshold)
    .map((p) => ({ id: p.id, name: p.name, stock_quantity: p.stock_quantity }));
  const baselineTimestamp = new Date().toISOString();

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <LiveRevenueCard
          shopId={shopId}
          baselineRevenue={revenueToday}
          baselineCount={todaySales?.length ?? 0}
          baselineTimestamp={baselineTimestamp}
        />
        <LiveStockCard shopId={shopId} baseline={lowStockProducts} />
        <Card>
          <CardTitle>Dettes en retard</CardTitle>
          <p className="text-2xl font-bold text-ink">{overdueDebts?.length ?? 0}</p>
          <p className="mt-1 text-xs text-neutral-400">à relancer</p>
        </Card>
      </div>
    </div>
  );
}

  // Référence temporelle du rendu serveur : tout ce qui est créé APRÈS cet
  // instant (dans le cache local) sera ajouté par-dessus côté client, que
  // la connexion soit là ou non.
  const baselineTimestamp = new Date().toISOString();
  const today = baselineTimestamp.slice(0, 10);

  const [{ data: todaySales }, { data: lowStock }, { data: overdueDebts }] = await Promise.all([
    supabase.from('sales').select('total_amount').eq('shop_id', shopId).gte('created_at', today),
    supabase.from('products').select('id, name, stock_quantity, low_stock_threshold').eq('shop_id', shopId),
    supabase.from('debts').select('id, total_amount, paid_amount, due_date').eq('shop_id', shopId).lt('due_date', today)
  ]);

  const revenueToday = todaySales?.reduce((sum, s) => sum + Number(s.total_amount), 0) ?? 0;
  const lowStockProducts = (lowStock ?? [])
    .filter((p) => p.stock_quantity <= p.low_stock_threshold)
    .map((p) => ({ id: p.id, name: p.name, stock_quantity: p.stock_quantity }));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <LiveRevenueCard
          shopId={shopId}
          baselineRevenue={revenueToday}
          baselineCount={todaySales?.length ?? 0}
          baselineTimestamp={baselineTimestamp}
        />
        <LiveStockCard shopId={shopId} baseline={lowStockProducts} />
        <Card>
          <CardTitle>Dettes en retard</CardTitle>
          <p className="text-2xl font-bold text-ink">{overdueDebts?.length ?? 0}</p>
          <p className="mt-1 text-xs text-neutral-400">à relancer</p>
        </Card>
      </div>
    </div>
  );
}
