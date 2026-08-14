-- Let PSP Worship Team users unlock with a password or request access from a PSP admin.
-- Approved users are added as PSP members. Only users with role = 'admin' can manage content.

create table if not exists public.psp_worship_team_access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  unique (user_id)
);

alter table public.psp_worship_team_access_requests enable row level security;

grant select on public.psp_worship_team_access_requests to authenticated;

drop policy if exists "Users can read their own PSP Worship Team request"
on public.psp_worship_team_access_requests;

create policy "Users can read their own PSP Worship Team request"
on public.psp_worship_team_access_requests
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.has_psp_worship_team_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and public.is_psp_worship_team_member(auth.uid());
$$;

grant execute on function public.has_psp_worship_team_access()
to authenticated;

create or replace function public.claim_psp_worship_team_access(access_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  requester uuid := auth.uid();
begin
  if requester is null then
    raise exception 'You must be signed in to unlock PSP Worship Team.';
  end if;

  if not public.access_code_matches('psp_worship_team', access_code) then
    raise exception 'That password did not work. Please try again.';
  end if;

  insert into public.psp_worship_team_members (user_id, role)
  values (requester, 'member')
  on conflict (user_id) do update
    set role = public.psp_worship_team_members.role;

  return public.has_psp_worship_team_access();
end;
$$;

grant execute on function public.claim_psp_worship_team_access(text)
to authenticated;

create or replace function public.request_psp_worship_team_access()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  requester uuid := auth.uid();
  request_id uuid;
begin
  if requester is null then
    raise exception 'You must be signed in to request access.';
  end if;

  insert into public.psp_worship_team_access_requests (user_id, status, requested_at)
  values (requester, 'pending', now())
  on conflict (user_id) do update
    set status = case
          when public.psp_worship_team_access_requests.status = 'approved'
            then public.psp_worship_team_access_requests.status
          else 'pending'
        end,
        requested_at = case
          when public.psp_worship_team_access_requests.status = 'approved'
            then public.psp_worship_team_access_requests.requested_at
          else now()
        end,
        reviewed_at = case
          when public.psp_worship_team_access_requests.status = 'approved'
            then public.psp_worship_team_access_requests.reviewed_at
          else null
        end,
        reviewed_by = case
          when public.psp_worship_team_access_requests.status = 'approved'
            then public.psp_worship_team_access_requests.reviewed_by
          else null
        end
  returning id into request_id;

  return request_id;
end;
$$;

grant execute on function public.request_psp_worship_team_access()
to authenticated;

create or replace function public.get_psp_worship_team_access_request_status()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select psp_worship_team_access_requests.status
  from public.psp_worship_team_access_requests
  where psp_worship_team_access_requests.user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.get_psp_worship_team_access_request_status()
to authenticated;

create or replace function public.list_psp_worship_team_access_requests()
returns table (
  id uuid,
  user_id uuid,
  display_name text,
  email text,
  status text,
  requested_at timestamptz,
  reviewed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_psp_worship_team_admin(auth.uid()) then
    raise exception 'Only PSP Worship Team admins can review access requests.';
  end if;

  return query
    select
      requests.id,
      requests.user_id,
      profiles.display_name,
      profiles.email,
      requests.status,
      requests.requested_at,
      requests.reviewed_at
    from public.psp_worship_team_access_requests as requests
    left join public.profiles
      on profiles.id = requests.user_id
    order by
      case requests.status when 'pending' then 0 when 'approved' then 1 else 2 end,
      requests.requested_at desc;
end;
$$;

grant execute on function public.list_psp_worship_team_access_requests()
to authenticated;

create or replace function public.review_psp_worship_team_access_request(
  request_id uuid,
  next_status text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewer uuid := auth.uid();
  requested_user uuid;
begin
  if not public.is_psp_worship_team_admin(reviewer) then
    raise exception 'Only PSP Worship Team admins can review access requests.';
  end if;

  if next_status not in ('approved', 'rejected') then
    raise exception 'Request status must be approved or rejected.';
  end if;

  select user_id
  into requested_user
  from public.psp_worship_team_access_requests
  where id = request_id;

  if requested_user is null then
    raise exception 'Access request not found.';
  end if;

  update public.psp_worship_team_access_requests
  set status = next_status,
      reviewed_at = now(),
      reviewed_by = reviewer
  where id = request_id;

  if next_status = 'approved' then
    insert into public.psp_worship_team_members (user_id, role)
    values (requested_user, 'member')
    on conflict (user_id) do update
      set role = public.psp_worship_team_members.role;
  end if;

  return true;
end;
$$;

grant execute on function public.review_psp_worship_team_access_request(uuid, text)
to authenticated;

notify pgrst, 'reload schema';
