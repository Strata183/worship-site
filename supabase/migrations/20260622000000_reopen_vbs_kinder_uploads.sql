-- Temporary VBS chart upload support. This adds a dedicated song key field and
-- lets eligible VBS users insert chart metadata after uploading PDFs to R2.

alter table public.vbs_kinder_charts
add column if not exists song_key text not null default '';

grant insert on public.vbs_kinder_charts to authenticated;

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
