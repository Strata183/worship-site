-- Private workspace for the PSP Worship Team.
-- Members can view the shared chart library and weekly sets. Admins can manage
-- songs, sets, and set order.

create table if not exists public.psp_worship_team_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.psp_worship_team_songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  song_key text not null default '',
  tags text[] not null default '{}',
  file_path text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.psp_worship_team_sets (
  id uuid primary key default gen_random_uuid(),
  service_date date not null,
  leader text not null default '',
  annotated_file_path text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

alter table public.psp_worship_team_sets
add column if not exists annotated_file_path text not null default '';

create table if not exists public.psp_worship_team_set_songs (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.psp_worship_team_sets (id) on delete cascade,
  song_id uuid references public.psp_worship_team_songs (id) on delete set null,
  title text not null default '',
  song_key text not null default '',
  note text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.psp_worship_team_members enable row level security;
alter table public.psp_worship_team_songs enable row level security;
alter table public.psp_worship_team_sets enable row level security;
alter table public.psp_worship_team_set_songs enable row level security;

grant select, insert, update, delete on public.psp_worship_team_members to authenticated;
grant select, insert, update, delete on public.psp_worship_team_songs to authenticated;
grant select, insert, update, delete on public.psp_worship_team_sets to authenticated;
grant select, insert, update, delete on public.psp_worship_team_set_songs to authenticated;

create or replace function public.is_psp_worship_team_member(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.psp_worship_team_members
    where psp_worship_team_members.user_id = $1
  );
$$;

grant execute on function public.is_psp_worship_team_member(uuid) to authenticated;

create or replace function public.is_psp_worship_team_admin(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.psp_worship_team_members
    where psp_worship_team_members.user_id = $1
      and psp_worship_team_members.role = 'admin'
  );
$$;

grant execute on function public.is_psp_worship_team_admin(uuid) to authenticated;

drop policy if exists "PSP members can read team members"
on public.psp_worship_team_members;

drop policy if exists "PSP admins can manage team members"
on public.psp_worship_team_members;

drop policy if exists "PSP members can read songs"
on public.psp_worship_team_songs;

drop policy if exists "PSP admins can manage songs"
on public.psp_worship_team_songs;

drop policy if exists "PSP members can read sets"
on public.psp_worship_team_sets;

drop policy if exists "PSP admins can manage sets"
on public.psp_worship_team_sets;

drop policy if exists "PSP members can read set songs"
on public.psp_worship_team_set_songs;

drop policy if exists "PSP admins can manage set songs"
on public.psp_worship_team_set_songs;

create policy "PSP members can read team members"
on public.psp_worship_team_members
for select
to authenticated
using (public.is_psp_worship_team_member(auth.uid()));

create policy "PSP admins can manage team members"
on public.psp_worship_team_members
for all
to authenticated
using (public.is_psp_worship_team_admin(auth.uid()))
with check (public.is_psp_worship_team_admin(auth.uid()));

create policy "PSP members can read songs"
on public.psp_worship_team_songs
for select
to authenticated
using (public.is_psp_worship_team_member(auth.uid()));

create policy "PSP admins can manage songs"
on public.psp_worship_team_songs
for all
to authenticated
using (public.is_psp_worship_team_admin(auth.uid()))
with check (public.is_psp_worship_team_admin(auth.uid()));

create policy "PSP members can read sets"
on public.psp_worship_team_sets
for select
to authenticated
using (public.is_psp_worship_team_member(auth.uid()));

create policy "PSP admins can manage sets"
on public.psp_worship_team_sets
for all
to authenticated
using (public.is_psp_worship_team_admin(auth.uid()))
with check (public.is_psp_worship_team_admin(auth.uid()));

create policy "PSP members can read set songs"
on public.psp_worship_team_set_songs
for select
to authenticated
using (public.is_psp_worship_team_member(auth.uid()));

create policy "PSP admins can manage set songs"
on public.psp_worship_team_set_songs
for all
to authenticated
using (public.is_psp_worship_team_admin(auth.uid()))
with check (public.is_psp_worship_team_admin(auth.uid()));

create index if not exists psp_worship_team_songs_title_idx
on public.psp_worship_team_songs (lower(title));

create index if not exists psp_worship_team_sets_date_idx
on public.psp_worship_team_sets (service_date desc);

create index if not exists psp_worship_team_set_songs_order_idx
on public.psp_worship_team_set_songs (set_id, position);

notify pgrst, 'reload schema';
