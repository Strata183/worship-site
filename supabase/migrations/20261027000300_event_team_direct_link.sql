-- Run after the event/team, event-flag, and shared-event-read migrations.
-- Lets a shared event link route assigned teammates straight to the event.
create or replace function public.is_event_team_member(requested_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.setlist_team_members
    join public.setlists on setlists.id = setlist_team_members.setlist_id
    where setlist_team_members.setlist_id = requested_event_id
      and setlist_team_members.user_id = auth.uid()
      and setlists.is_event
  );
$$;

revoke all on function public.is_event_team_member(uuid) from public;
grant execute on function public.is_event_team_member(uuid) to authenticated;

notify pgrst, 'reload schema';
