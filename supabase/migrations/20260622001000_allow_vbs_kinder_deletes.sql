-- Temporary VBS chart cleanup support. Remove this permission when the upload
-- and cleanup tools are no longer needed on the website.

grant delete on public.vbs_kinder_charts to authenticated;

drop policy if exists "Eligible users can delete VBS Kinder charts"
on public.vbs_kinder_charts;

create policy "Eligible users can delete VBS Kinder charts"
on public.vbs_kinder_charts
for delete
to authenticated
using (
  exists (
    select 1
    from public.vbs_kinder_access
    where vbs_kinder_access.user_id = auth.uid()
  )
);

notify pgrst, 'reload schema';
