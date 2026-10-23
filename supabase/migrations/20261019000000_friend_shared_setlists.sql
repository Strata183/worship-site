-- Let accepted friends view a setlist through a share link. The owner-only
-- policies on setlists and setlist_items remain unchanged.

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
    'notes', setlists.notes,
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', setlist_items.id,
          'item_type', setlist_items.item_type,
          'title', setlist_items.title,
          'body', setlist_items.body,
          'position', setlist_items.position,
          'song_id', setlist_items.song_id,
          'song_title', songs.title,
          'song_key', songs.song_key
        ) order by setlist_items.position, setlist_items.created_at
      )
      from public.setlist_items
      left join public.songs
        on songs.id = setlist_items.song_id
       and songs.owner_id = setlists.owner_id
      where setlist_items.setlist_id = setlists.id
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
