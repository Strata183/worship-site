-- Optional extra charts for PSP Worship Team songs.
-- The main chart remains on psp_worship_team_songs.file_path so weekly PDFs
-- keep using the normal chart unless an admin adds extra references.

create table if not exists public.psp_worship_team_song_charts (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.psp_worship_team_songs (id) on delete cascade,
  title text not null default '',
  file_path text not null,
  created_at timestamptz not null default now()
);

alter table public.psp_worship_team_song_charts enable row level security;

grant select, insert, update, delete on public.psp_worship_team_song_charts to authenticated;

drop policy if exists "PSP members can read song charts"
on public.psp_worship_team_song_charts;

drop policy if exists "PSP admins can manage song charts"
on public.psp_worship_team_song_charts;

create policy "PSP members can read song charts"
on public.psp_worship_team_song_charts
for select
to authenticated
using (public.is_psp_worship_team_member(auth.uid()));

create policy "PSP admins can manage song charts"
on public.psp_worship_team_song_charts
for all
to authenticated
using (public.is_psp_worship_team_admin(auth.uid()))
with check (public.is_psp_worship_team_admin(auth.uid()));

create index if not exists psp_worship_team_song_charts_song_idx
on public.psp_worship_team_song_charts (song_id, created_at);

notify pgrst, 'reload schema';
