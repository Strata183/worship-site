-- Run after 20261027000000_setlist_events_and_teams.sql and
-- 20261027000100_setlist_event_flag.sql. The first creates
-- setlist_team_members and are_accepted_friends; the second adds is_event.
-- Accepted friends can read Events, while event writes remain owner only.
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
        or (
          setlists.is_event
          and public.are_accepted_friends(auth.uid(), setlists.owner_id)
        )
      )
  );
$$;

grant execute on function public.user_can_view_setlist(uuid) to authenticated;

create or replace function public.get_shared_setlist(requested_setlist_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', setlists.id,
    'title', setlists.title,
    'event_date', setlists.event_date,
    'start_time', setlists.start_time,
    'end_time', setlists.end_time,
    'location', setlists.location,
    'notes', setlists.notes,
    'theme', setlists.theme,
    'flow_notes', setlists.flow_notes,
    'is_event', setlists.is_event,
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', setlist_items.id,
          'item_type', setlist_items.item_type,
          'title', setlist_items.title,
          'body', setlist_items.body,
          'position', setlist_items.position,
          'song_id', setlist_items.song_id,
          'song_title', coalesce(songs.title, setlist_items.title),
          'song_key', coalesce(songs.song_key, setlist_items.song_key_snapshot),
          'artist_version', setlist_items.artist_version,
          'tempo_feel', setlist_items.tempo_feel,
          'theme_scripture', setlist_items.theme_scripture,
          'lead_vocal', setlist_items.lead_vocal,
          'other_vocals', setlist_items.other_vocals,
          'arrangement', setlist_items.arrangement,
          'status', setlist_items.status,
          'notes_link', setlist_items.notes_link
        ) order by setlist_items.position, setlist_items.created_at
      )
      from public.setlist_items
      left join public.songs
        on songs.id = setlist_items.song_id
       and songs.owner_id = setlists.owner_id
      where setlist_items.setlist_id = setlists.id
    ), '[]'::jsonb),
    'team', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'display_name', coalesce(profiles.display_name, 'Friend'),
          'roles', members.roles,
          'instrument_part', members.instrument_part,
          'needs_gear', members.needs_gear,
          'contact_notes', members.contact_notes
        ) order by members.position, profiles.display_name
      )
      from public.setlist_team_members as members
      left join public.profiles as profiles on profiles.id = members.user_id
      where members.setlist_id = setlists.id
    ), '[]'::jsonb)
  )
  from public.setlists
  where setlists.id = requested_setlist_id
    and auth.uid() is not null
    and (
      setlists.owner_id = auth.uid()
      or exists (
        select 1
        from public.friendships
        where friendships.status = 'accepted'
          and (
            (friendships.requester_id = setlists.owner_id and friendships.addressee_id = auth.uid())
            or (friendships.addressee_id = setlists.owner_id and friendships.requester_id = auth.uid())
          )
      )
    );
$$;

revoke all on function public.get_shared_setlist(uuid) from public;
grant execute on function public.get_shared_setlist(uuid) to authenticated;

notify pgrst, 'reload schema';
