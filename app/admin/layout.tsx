import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Shield, Store, BarChart3, Users, LogOut } from 'lucide-react';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single();
  if (profile?.role !== 'super_admin') redirect('/login?error=acces_refuse');

  const nav = [
    { href: '/admin/shops', label: 'Boutiques', icon: Store },
    { href: '/admin/analytics', label: 'Analytique globale', icon: BarChart3 },
    { href: '/admin/users', label: 'Utilisateurs', icon: Users }
  ];

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <aside className="hidden w-64 flex-col border-r border-neutral-200 bg-ink text-white md:flex">
        <div className="flex items-center gap-2 border-b border-white/10 px-6 py-5">
          <Shield className="h-5 w-5 text-brand" />
          <span className="font-bold">Super Admin</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/80 hover:bg-white/10 hover:text-white">
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <form action="/api/auth/signout" method="post" className="border-t border-white/10 p-3">
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 hover:bg-white/10 hover:text-white">
            <LogOut className="h-4 w-4" /> Déconnexion
          </button>
        </form>
      </aside>
      <main className="flex-1 p-4 md:p-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-400">Super Admin</p>
            <h1 className="text-lg font-bold text-ink">Bonjour, {profile?.full_name}</h1>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
