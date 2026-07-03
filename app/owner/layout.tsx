import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Eye, LogOut, Store } from 'lucide-react';

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single();
  if (profile?.role !== 'owner') redirect('/login?error=acces_refuse');

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-4 md:px-8">
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5 text-brand" />
          <div>
            <p className="text-xs text-neutral-400">Espace Patron</p>
            <p className="text-sm font-semibold text-ink">{profile?.full_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-xs text-neutral-500 md:flex">
            <Eye className="h-3.5 w-3.5" /> Lecture seule
          </span>
          <form action="/api/auth/signout" method="post">
            <button className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-ink">
              <LogOut className="h-4 w-4" /> Déconnexion
            </button>
          </form>
        </div>
      </header>
      <main className="p-4 md:p-8">{children}</main>
    </div>
  );
}
