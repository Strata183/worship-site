-- Setlists with nested folders and ordered setlist items.
-- A setlist item can be a library song or a blank/prayer placeholder.

create table if not exists public.setlist_folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  parent_folder_id uuid references public.setlist_folders (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.setlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  folder_id uuid references public.setlist_folders (id) on delete cascade,
  title text not null,
  event_date date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.setlist_items (
  id uuid primary key default gen_random_uuid(),
  setlist_id uuid not null references public.setlists (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  song_id uuid references public.songs (id) on delete set null,
  item_type text not null check (item_type in ('song', 'placeholder')),
  title text not null default '',
  body text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.setlist_folders enable row level security;
alter table public.setlists enable row level security;
alter table public.setlist_items enable row level security;

grant select, insert, update, delete on public.setlist_folders to authenticated;
grant select, insert, update, delete on public.setlists to authenticated;
grant select, insert, update, delete on public.setlist_items to authenticated;

create or replace function public.user_owns_setlist_folder(requested_folder_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    requested_folder_id is null
    or exists (
      select 1
      from public.setlist_folders
      where setlist_folders.id = requested_folder_id
        and setlist_folders.owner_id = auth.uid()
    );
$$;

grant execute on function public.user_owns_setlist_folder(uuid) to authenticated;

drop policy if exists "Users can manage their own setlist folders"
on public.setlist_folders;

drop policy if exists "Users can manage their own setlists"
on public.setlists;

drop policy if exists "Users can manage their own setlist items"
on public.setlist_items;

create policy "Users can manage their own setlist folders"
on public.setlist_folders
for all
to authenticated
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and public.user_owns_setlist_folder(parent_folder_id)
);

create policy "Users can manage their own setlists"
on public.setlists
for all
to authenticated
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and public.user_owns_setlist_folder(folder_id)
);

create policy "Users can manage their own setlist items"
on public.setlist_items
for all
to authenticated
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.setlists
    where setlists.id = setlist_items.setlist_id
      and setlists.owner_id = auth.uid()
  )
  and (
    song_id is null
    or exists (
      select 1
      from public.songs
      where songs.id = setlist_items.song_id
        and songs.owner_id = auth.uid()
    )
  )
);

create index if not exists setlist_folders_owner_parent_idx
on public.setlist_folders (owner_id, parent_folder_id, created_at desc);

create index if not exists setlists_owner_folder_idx
on public.setlists (owner_id, folder_id, created_at desc);

create index if not exists setlist_items_setlist_position_idx
on public.setlist_items (setlist_id, position);

notify pgrst, 'reload schema';
