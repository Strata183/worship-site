-- Extend existing setlists into events without moving or deleting current data.
alter table public.setlists
  add column if not exists location text not null default '',
  add column if not exists start_time time,
  add column if not exists end_time time,
  add column if not exists theme text not null default '',
  add column if not exists flow_notes text not null default '';

alter table public.setlist_items
  add column if not exists song_key_snapshot text not null default '',
  add column if not exists artist_version text not null default '',
  add column if not exists tempo_feel text not null default '',
  add column if not exists theme_scripture text not null default '',
  add column if not exists lead_vocal text not null default '',
  add column if not exists other_vocals text not null default '',
  add column if not exists arrangement text not null default '',
  add column if not exists status text not null default 'Idea',
  add column if not exists notes_link text not null default '';

update public.setlist_items
set title = songs.title,
    song_key_snapshot = songs.song_key
from public.songs
where setlist_items.song_id = songs.id
  and setlist_items.item_type = 'song'
  and setlist_items.title = '';

create table if not exists public.setlist_team_members (
  id uuid primary key default gen_random_uuid(),
  setlist_id uuid not null references public.setlists (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  roles text[] not null default '{}',
  instrument_part text not null default '',
  needs_gear text not null default '',
  contact_notes text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (setlist_id, user_id)
);

alter table public.setlist_team_members enable row level security;
grant select, insert, update, delete on public.setlist_team_members to authenticated;

create or replace function public.are_accepted_friends(first_user_id uuid, second_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.friendships
    where friendships.status = 'accepted'
      and first_user_id = auth.uid()
      and (
        (friendships.requester_id = first_user_id and friendships.addressee_id = second_user_id)
        or (friendships.requester_id = second_user_id and friendships.addressee_id = first_user_id)
      )
  );
$$;

create or replace function public.user_can_view_setlist(requested_setlist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.setlists
    where setlists.id = requested_setlist_id
      and (
        setlists.owner_id = auth.uid()
        or exists (
          select 1
          from public.setlist_team_members
          where setlist_team_members.setlist_id = setlists.id
            and setlist_team_members.user_id = auth.uid()
        )
      )
  );
$$;

revoke all on function public.are_accepted_friends(uuid, uuid) from public;
revoke all on function public.user_can_view_setlist(uuid) from public;
grant execute on function public.are_accepted_friends(uuid, uuid) to authenticated;
grant execute on function public.user_can_view_setlist(uuid) to authenticated;

drop policy if exists "Team members can view assigned events"
on public.setlists;
create policy "Team members can view assigned events"
on public.setlists
for select
to authenticated
using (public.user_can_view_setlist(id));

drop policy if exists "Team members can view event songs"
on public.setlist_items;
create policy "Team members can view event songs"
on public.setlist_items
for select
to authenticated
using (public.user_can_view_setlist(setlist_id));

drop policy if exists "Event teams can view their members"
on public.setlist_team_members;
create policy "Event teams can view their members"
on public.setlist_team_members
for select
to authenticated
using (public.user_can_view_setlist(setlist_id));

drop policy if exists "Event owners manage team members"
on public.setlist_team_members;
create policy "Event owners manage team members"
on public.setlist_team_members
for all
to authenticated
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.setlists
    where setlists.id = setlist_team_members.setlist_id
      and setlists.owner_id = auth.uid()
  )
  and user_id <> auth.uid()
  and public.are_accepted_friends(auth.uid(), user_id)
);

create or replace function public.get_setlist_team_members(requested_setlist_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', members.id,
      'user_id', members.user_id,
      'roles', members.roles,
      'instrument_part', members.instrument_part,
      'needs_gear', members.needs_gear,
      'contact_notes', members.contact_notes,
      'position', members.position,
      'display_name', coalesce(profiles.display_name, 'Friend')
    ) order by members.position, profiles.display_name
  ), '[]'::jsonb)
  from public.setlist_team_members as members
  left join public.profiles as profiles on profiles.id = members.user_id
  where members.setlist_id = requested_setlist_id
    and public.user_can_view_setlist(requested_setlist_id);
$$;

revoke all on function public.get_setlist_team_members(uuid) from public;
grant execute on function public.get_setlist_team_members(uuid) to authenticated;

create index if not exists setlist_team_members_user_idx
on public.setlist_team_members (user_id, setlist_id);

notify pgrst, 'reload schema';
