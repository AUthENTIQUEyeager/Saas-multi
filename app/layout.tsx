import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gestion Boutique - SaaS Multi-Boutiques',
  description: 'Plateforme de gestion des ventes, stock, dettes et livraisons pour boutiques.',
  manifest: '/manifest.json'
};

export const viewport: Viewport = {
  themeColor: '#FF6A00',
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
