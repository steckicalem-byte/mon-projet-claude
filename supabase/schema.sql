-- Schéma Supabase de PronoFoot : à exécuter une fois dans « SQL Editor » de votre projet Supabase.
-- Une seule table générique pour les favoris, catégories et pronostics de chaque utilisateur.

create table if not exists public.user_items (
  user_id    uuid        not null references auth.users (id) on delete cascade default auth.uid(),
  kind       text        not null check (kind in ('bookmarks', 'categories', 'picks')),
  id         text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);

-- Sécurité au niveau des lignes : chaque utilisateur ne voit et ne modifie que ses données.
alter table public.user_items enable row level security;

drop policy if exists "Lire ses données" on public.user_items;
create policy "Lire ses données" on public.user_items
  for select using (auth.uid() = user_id);

drop policy if exists "Ajouter ses données" on public.user_items;
create policy "Ajouter ses données" on public.user_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "Modifier ses données" on public.user_items;
create policy "Modifier ses données" on public.user_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Supprimer ses données" on public.user_items;
create policy "Supprimer ses données" on public.user_items
  for delete using (auth.uid() = user_id);

-- Limite de taille par élément (protection contre l'abus de stockage).
alter table public.user_items drop constraint if exists user_items_data_size;
alter table public.user_items add constraint user_items_data_size check (pg_column_size(data) < 32768);
