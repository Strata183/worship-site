-- Optional annotated PDFs for PSP Worship Team weeks.
-- These are visible to PSP members only on the specific week where an admin
-- has uploaded one.

alter table public.psp_worship_team_sets
add column if not exists annotated_file_path text not null default '';

notify pgrst, 'reload schema';
