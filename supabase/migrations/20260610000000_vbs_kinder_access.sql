-- Allow signed-in users to claim access to the VBS Kinder Music page with a
-- shared team password. The password check happens in this database function
-- instead of directly in the React page.

create table if not exists public.vbs_kinder_access (
  user_id uuid primary key references auth.users (id) on delete cascade,
  granted_at timestamptz not null default now()
);

alter table public.vbs_kinder_access enable row level security;

drop policy if exists "Users can read their own VBS Kinder access" on public.vbs_kinder_access;

create policy "Users can read their own VBS Kinder access"
on public.vbs_kinder_access
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.claim_vbs_kinder_access(access_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  requester uuid := auth.uid();
begin
  if requester is null then
    raise exception 'You must be signed in to unlock VBS Kinder Music.';
  end if;

  if access_code <> 'VBS2026' then
    raise exception 'That password did not work. Please try again.';
  end if;

  insert into public.vbs_kinder_access (user_id)
  values (requester)
  on conflict (user_id) do update
    set granted_at = public.vbs_kinder_access.granted_at;

  return true;
end;
$$;

grant execute on function public.claim_vbs_kinder_access(text) to authenticated;

notify pgrst, 'reload schema';
