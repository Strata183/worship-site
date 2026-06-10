-- Temporary helper policy so an eligible VBS user can add chart rows from the
-- website while building the VBS chart list. Remove this policy when uploads
-- should be closed.

drop policy if exists "Eligible users can add VBS Kinder charts"
on public.vbs_kinder_charts;

create policy "Eligible users can add VBS Kinder charts"
on public.vbs_kinder_charts
for insert
to authenticated
with check (
  exists (
    select 1
    from public.vbs_kinder_access
    where vbs_kinder_access.user_id = auth.uid()
  )
);

notify pgrst, 'reload schema';
