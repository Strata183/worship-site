-- Make the Master's Bible Study password claim return the server-side access state
-- after inserting the saved access row.

create or replace function public.claim_masters_bible_study_access(access_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  requester uuid := auth.uid();
begin
  if requester is null then
    raise exception 'You must be signed in to unlock Master''s Bible Study.';
  end if;

  if not public.access_code_matches('masters_bible_study', access_code) then
    raise exception 'That password did not work. Please try again.';
  end if;

  insert into public.masters_bible_study_access (user_id)
  values (requester)
  on conflict (user_id) do update
    set granted_at = public.masters_bible_study_access.granted_at;

  return public.has_masters_bible_study_access();
end;
$$;

grant execute on function public.claim_masters_bible_study_access(text) to authenticated;

notify pgrst, 'reload schema';
