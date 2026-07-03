'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShoppingCart, Package, Boxes, Users, HandCoins,
  Truck, Bike, Receipt, UserCog, FileBarChart, LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/app', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { href: '/app/pos', label: 'Vente (POS)', icon: ShoppingCart },
  { href: '/app/produits', label: 'Produits', icon: Package },
  { href: '/app/stock', label: 'Stock', icon: Boxes },
  { href: '/app/clients', label: 'Clients', icon: Users },
  { href: '/app/dettes', label: 'Dettes', icon: HandCoins },
  { href: '/app/fournisseurs', label: 'Fournisseurs', icon: Truck },
  { href: '/app/livraisons', label: 'Livraisons', icon: Bike },
  { href: '/app/depenses', label: 'Dépenses', icon: Receipt },
  { href: '/app/employes', label: 'Employés', icon: UserCog },
  { href: '/app/rapports', label: 'Rapports', icon: FileBarChart }
];

export function Sidebar({ shopName }: { shopName: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col border-r border-neutral-200 bg-white md:flex">
      <div className="border-b border-neutral-100 px-5 py-5">
        <p className="text-xs text-neutral-400">Boutique</p>
        <p className="truncate font-semibold text-ink">{shopName}</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        {NAV.map(({ href, label, icon: Icon, end }) => {
          const active = end ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                active ? 'bg-brand-light text-brand-dark font-semibold' : 'text-neutral-600 hover:bg-neutral-100'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <form action="/api/auth/signout" method="post" className="border-t border-neutral-100 p-3">
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-neutral-500 hover:bg-neutral-100">
          <LogOut className="h-4 w-4" /> Déconnexion
        </button>
      </form>
    </aside>
  );
}
