'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, Package, HandCoins, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/app', label: 'Accueil', icon: LayoutDashboard, end: true },
  { href: '/app/pos', label: 'Vente', icon: ShoppingCart },
  { href: '/app/produits', label: 'Produits', icon: Package },
  { href: '/app/dettes', label: 'Dettes', icon: HandCoins },
  { href: '/app/rapports', label: 'Plus', icon: Menu }
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-neutral-200 bg-white md:hidden">
      {NAV.map(({ href, label, icon: Icon, end }) => {
        const active = end ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px]',
              active ? 'text-brand' : 'text-neutral-500'
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
