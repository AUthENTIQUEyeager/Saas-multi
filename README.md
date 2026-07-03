# Gestion Boutique — SaaS Multi-Boutiques

PWA de gestion de ventes, stock, dettes, livraisons et dépenses pour boutiques (vêtements, alimentation, électronique, pharmacies...), multi-tenant, offline-first.

Stack : **Next.js 14 (App Router) + Supabase (DB/Auth/Storage) + Dexie.js (offline) + Tailwind CSS**, déployable sur **Vercel + Supabase** uniquement.

## 1. Installation locale

```bash
npm install
cp .env.example .env.local
# remplir .env.local avec les clés de ton projet Supabase
npm run dev
```

## 2. Mettre en place Supabase

```bash
npm install -g supabase
supabase login
supabase link --project-ref <ton-project-ref>
supabase db push          # applique supabase/migrations/0001_init.sql
supabase functions deploy create-shop
supabase functions deploy suspend-shop
```

Puis dans le **Dashboard Supabase** :
1. Authentication → Hooks → activer `custom_access_token_hook` (injecte `role` et `shop_id` dans le JWT — indispensable pour que les policies RLS fonctionnent)
2. Authentication → Providers → email/password activé, confirmation email désactivée si tu gères tout via l'Edge Function `create-shop`

## 3. Créer le premier Super Admin

Aucune UI ne permet de créer un super admin (volontaire). Depuis le SQL Editor Supabase, après avoir créé un utilisateur via Authentication → Users → Add User :

```sql
insert into profiles (id, full_name, role)
values ('<uuid-du-user-créé>', 'Ton Nom', 'super_admin');
```

## 4. Déployer sur Vercel

1. Push ce repo sur GitHub
2. Importer le repo dans Vercel
3. Ajouter les variables d'environnement (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) — **ne jamais** mettre `SUPABASE_SERVICE_ROLE_KEY` dans Vercel côté frontend, elle ne vit que dans les Edge Functions Supabase
4. Déployer

## 5. Structure du projet

```
app/
  login/          Point d'entrée unique (email + mot de passe)
  admin/          Super Admin - gestion des boutiques, analytique globale
  owner/          Espace Patron - lecture seule, multi-boutiques
  app/            Espace Manager/Employé - POS, produits, stock, clients,
                  dettes, fournisseurs, livraisons, dépenses, employés, rapports
lib/
  supabase/       Clients Supabase (browser / server / middleware)
  offline/        IndexedDB (Dexie) + logique de synchronisation
  auth/           Redirection post-connexion par rôle
supabase/
  migrations/     Schéma SQL complet + policies RLS + fonctions
  functions/      Edge Functions pour les actions sensibles (créer/suspendre boutique)
middleware.ts     Garde de routes par rôle (racine du projet)
```

## 6. Le module le plus critique : le POS offline

`components/pos/PosClient.tsx` fonctionne même sans connexion :
- Chaque vente est écrite immédiatement dans IndexedDB avec un `local_uuid`
- Dès que la connexion revient, `lib/offline/syncQueue.ts` pousse les ventes en attente vers la fonction Postgres `process_sale` (idempotente — aucun risque de doublon)
- Le stock n'est décrémenté **définitivement** que côté serveur, pour rester cohérent même si plusieurs employés vendent hors-ligne en simultané

## 7. Prochaines étapes suggérées

- Générer les icônes PWA réelles (voir `public/icons/README.txt`)
- Affiner les policies RLS des `employee_permissions` (permissions granulaires par tâche : caissier, gestionnaire de stock, livreur, comptable)
- Ajouter les paiements partiels de dettes (`debt_payments`) et de fournisseurs côté UI
- Ajouter des graphiques (Recharts, déjà en dépendance) sur `/app/rapports` et `/admin/analytics`
- Écran de suspension/réactivation de boutique côté `/admin/shops/[id]` branché sur l'Edge Function `suspend-shop`
