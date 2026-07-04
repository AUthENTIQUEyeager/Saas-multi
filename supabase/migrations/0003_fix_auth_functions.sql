-- ============================================
-- MIGRATION 0003 - Fiabiliser les policies RLS
-- À exécuter APRÈS 0001_init.sql et 0002_extra.sql
--
-- Problème résolu : jusqu'ici, jwt_role() et jwt_shop_id() lisaient les
-- claims custom du JWT (user_role, shop_id), qui ne sont injectées QUE si
-- le hook "Custom Access Token" est correctement configuré et actif.
-- Ce hook s'est révélé fragile (permissions, erreurs 500 au login) et
-- surtout : si mal configuré, TOUTES les écritures (produits, dettes,
-- clients, dépenses...) étaient silencieusement bloquées par RLS sans
-- qu'aucune erreur ne remonte à l'écran.
--
-- Cette migration fait lire le rôle et la boutique DIRECTEMENT depuis la
-- table profiles à chaque vérification (via une fonction SECURITY DEFINER
-- qui contourne RLS pour cette lecture précise). Plus besoin du hook JWT
-- pour que les permissions fonctionnent - une seule source de vérité :
-- la table profiles.
-- ============================================

create or replace function public.jwt_role()
returns text
language sql stable security definer set search_path = public as $$
  select role::text from profiles where id = auth.uid()
$$;

create or replace function public.jwt_shop_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select shop_id from profiles where id = auth.uid()
$$;

grant execute on function public.jwt_role to authenticated, anon;
grant execute on function public.jwt_shop_id to authenticated, anon;

-- Le hook "Custom Access Token" n'est plus utilisé par aucune policy.
-- Tu peux le laisser désactivé dans Authentication > Hooks sans que
-- rien ne casse.
