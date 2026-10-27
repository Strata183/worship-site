-- Owners may add themselves as a team member on their own event.
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
  and (
    user_id = auth.uid()
    or public.are_accepted_friends(auth.uid(), user_id)
  )
);

notify pgrst, 'reload schema';
