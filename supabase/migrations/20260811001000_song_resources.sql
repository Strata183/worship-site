-- Optional resources attached to songs: notes, links, and private audio demos.

create table if not exists public.song_resources (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  resource_type text not null check (resource_type in ('note', 'link', 'audio')),
  title text not null default '',
  body text not null default '',
  url text not null default '',
  file_path text not null default '',
  content_type text not null default '',
  created_at timestamptz not null default now()
);

alter table public.song_resources enable row level security;

grant select, insert, update, delete on public.song_resources to authenticated;

drop policy if exists "Users can read resources for visible songs"
on public.song_resources;

drop policy if exists "Song owners can add resources"
on public.song_resources;

drop policy if exists "Song resource owners can update resources"
on public.song_resources;

drop policy if exists "Song resource owners can delete resources"
on public.song_resources;

create policy "Users can read resources for visible songs"
on public.song_resources
for select
to authenticated
using (
  exists (
    select 1
    from public.songs
    where songs.id = song_resources.song_id
  )
);

create policy "Song owners can add resources"
on public.song_resources
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.songs
    where songs.id = song_resources.song_id
      and songs.owner_id = auth.uid()
  )
);

create policy "Song resource owners can update resources"
on public.song_resources
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Song resource owners can delete resources"
on public.song_resources
for delete
to authenticated
using (owner_id = auth.uid());

notify pgrst, 'reload schema';
