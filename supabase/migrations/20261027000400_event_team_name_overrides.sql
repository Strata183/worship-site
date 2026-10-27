-- Event owners can use a display name for a teammate on a single event.
alter table public.setlist_team_members
  add column if not exists name_override text not null default '';

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
      'name_override', members.name_override,
      'roles', members.roles,
      'instrument_part', members.instrument_part,
      'needs_gear', members.needs_gear,
      'contact_notes', members.contact_notes,
      'position', members.position,
      'display_name', coalesce(nullif(members.name_override, ''), profiles.display_name, 'Friend')
    ) order by members.position, profiles.display_name
  ), '[]'::jsonb)
  from public.setlist_team_members as members
  left join public.profiles as profiles on profiles.id = members.user_id
  where members.setlist_id = requested_setlist_id
    and public.user_can_view_setlist(requested_setlist_id);
$$;

revoke all on function public.get_setlist_team_members(uuid) from public;
grant execute on function public.get_setlist_team_members(uuid) to authenticated;

notify pgrst, 'reload schema';
