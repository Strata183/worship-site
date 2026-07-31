grant delete on public.friendships to authenticated;

drop policy if exists "Users can remove their own friendships" on public.friendships;

create policy "Users can remove their own friendships"
on public.friendships
for delete
to authenticated
using (auth.uid() in (requester_id, addressee_id));

notify pgrst, 'reload schema';
