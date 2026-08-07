-- Allow signed-in users to read their own Master's Bible Study access/request rows.
-- RLS policies still limit users to only their own records.

grant select on public.masters_bible_study_access to authenticated;
grant select on public.masters_bible_study_access_requests to authenticated;

notify pgrst, 'reload schema';
