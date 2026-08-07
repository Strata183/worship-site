-- Let signed-in users check their own Master's Bible Study request status
-- without reading the requests table directly from the browser.

create or replace function public.get_masters_bible_study_access_request_status()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select masters_bible_study_access_requests.status
  from public.masters_bible_study_access_requests
  where masters_bible_study_access_requests.user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.get_masters_bible_study_access_request_status()
to authenticated;

notify pgrst, 'reload schema';
