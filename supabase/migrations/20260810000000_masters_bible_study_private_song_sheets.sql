-- Private Master's Bible Study song sheet PDFs.
-- The actual PDF files live in Cloudflare R2; this table stores the private R2 key.

create table if not exists public.masters_bible_study_song_sheets (
  week_date date primary key,
  file_path text not null,
  uploaded_by uuid references auth.users (id) on delete set null,
  uploaded_at timestamptz not null default now()
);

alter table public.masters_bible_study_song_sheets enable row level security;

grant select, insert, update on public.masters_bible_study_song_sheets
to authenticated;

drop policy if exists "Eligible users can read Masters Bible Study song sheets"
on public.masters_bible_study_song_sheets;

drop policy if exists "Masters Bible Study admins can add song sheets"
on public.masters_bible_study_song_sheets;

drop policy if exists "Masters Bible Study admins can update song sheets"
on public.masters_bible_study_song_sheets;

create policy "Eligible users can read Masters Bible Study song sheets"
on public.masters_bible_study_song_sheets
for select
to authenticated
using (public.has_masters_bible_study_access());

create policy "Masters Bible Study admins can add song sheets"
on public.masters_bible_study_song_sheets
for insert
to authenticated
with check (
  public.is_masters_bible_study_admin(auth.uid())
  and uploaded_by = auth.uid()
);

create policy "Masters Bible Study admins can update song sheets"
on public.masters_bible_study_song_sheets
for update
to authenticated
using (public.is_masters_bible_study_admin(auth.uid()))
with check (
  public.is_masters_bible_study_admin(auth.uid())
  and uploaded_by = auth.uid()
);

notify pgrst, 'reload schema';
