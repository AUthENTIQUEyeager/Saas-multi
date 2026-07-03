import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { SyncIndicator } from '@/components/offline/SyncIndicator';
import { ShieldAlert } from 'lucide-react';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, shop_id, is_active, shops(id, name, subscription_status, subscription_end_date)')
    .eq('id', user.id)
    .single();

  if (!profile || !['manager', 'employee'].includes(profile.role)) {
    redirect('/login?error=acces_refuse');
  }
  if (!profile.is_active) {
    redirect('/login?error=compte_desactive');
  }

  const shop: any = profile.shops;

  // Blocage si l'abonnement de la boutique est suspendu ou expiré (section 6 du cahier des charges)
  if (shop && shop.subscription_status !== 'active' && shop.subscription_status !== 'trial') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="text-lg font-bold text-ink">Votre abonnement a expiré</h1>
        <p className="max-w-sm text-sm text-neutral-500">
          L'accès à {shop.name} est suspendu. Contactez l'administrateur de la plateforme pour réactiver votre boutique.
        </p>
        <form action="/api/auth/signout" method="post">
          <button className="mt-2 text-sm font-medium text-brand hover:underline">Se déconnecter</button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <Sidebar shopName={shop?.name ?? 'Boutique'} />
      <div className="flex flex-1 flex-col pb-16 md:pb-0">
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3.5 md:px-8">
          <div>
            <p className="text-xs text-neutral-400">Bonjour</p>
            <p className="text-sm font-semibold text-ink">{profile.full_name}</p>
          </div>
          <SyncIndicator />
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
