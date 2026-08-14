-- Optional annotated chart PDFs for PSP Worship Team songs.
-- These are visible to PSP members only when an admin has uploaded one.

alter table public.psp_worship_team_songs
add column if not exists annotated_file_path text not null default '';

notify pgrst, 'reload schema';
