-- Server-side access check for the Master's Bible Study page.
-- This avoids browser-side RLS reads accidentally hiding an existing access row.

create or replace function public.has_masters_bible_study_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and (
      exists (
        select 1
        from public.masters_bible_study_access
        where masters_bible_study_access.user_id = auth.uid()
      )
      or public.is_masters_bible_study_admin(auth.uid())
    );
$$;

grant execute on function public.has_masters_bible_study_access() to authenticated;

notify pgrst, 'reload schema';
