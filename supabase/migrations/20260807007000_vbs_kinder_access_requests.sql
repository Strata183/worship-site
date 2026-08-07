-- Let VBS Kinder users request access and let VBS admins approve requests.

grant select on public.vbs_kinder_access to authenticated;

create table if not exists public.vbs_kinder_access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  unique (user_id)
);

create table if not exists public.vbs_kinder_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.vbs_kinder_access_requests enable row level security;
alter table public.vbs_kinder_admins enable row level security;

grant select on public.vbs_kinder_access_requests to authenticated;

drop policy if exists "Users can read their own VBS Kinder request"
on public.vbs_kinder_access_requests;

create policy "Users can read their own VBS Kinder request"
on public.vbs_kinder_access_requests
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.is_vbs_kinder_admin(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.vbs_kinder_admins
    where vbs_kinder_admins.user_id = $1
  );
$$;

grant execute on function public.is_vbs_kinder_admin(uuid) to authenticated;

create or replace function public.has_vbs_kinder_access()
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
        from public.vbs_kinder_access
        where vbs_kinder_access.user_id = auth.uid()
      )
      or public.is_vbs_kinder_admin(auth.uid())
    );
$$;

grant execute on function public.has_vbs_kinder_access() to authenticated;

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

  if not public.access_code_matches('vbs_kinder', access_code) then
    raise exception 'That password did not work. Please try again.';
  end if;

  insert into public.vbs_kinder_access (user_id)
  values (requester)
  on conflict (user_id) do update
    set granted_at = public.vbs_kinder_access.granted_at;

  return public.has_vbs_kinder_access();
end;
$$;

grant execute on function public.claim_vbs_kinder_access(text) to authenticated;

create or replace function public.request_vbs_kinder_access()
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

  insert into public.vbs_kinder_access_requests (user_id, status, requested_at)
  values (requester, 'pending', now())
  on conflict (user_id) do update
    set status = case
          when public.vbs_kinder_access_requests.status = 'approved'
            then public.vbs_kinder_access_requests.status
          else 'pending'
        end,
        requested_at = case
          when public.vbs_kinder_access_requests.status = 'approved'
            then public.vbs_kinder_access_requests.requested_at
          else now()
        end,
        reviewed_at = case
          when public.vbs_kinder_access_requests.status = 'approved'
            then public.vbs_kinder_access_requests.reviewed_at
          else null
        end,
        reviewed_by = case
          when public.vbs_kinder_access_requests.status = 'approved'
            then public.vbs_kinder_access_requests.reviewed_by
          else null
        end
  returning id into request_id;

  return request_id;
end;
$$;

grant execute on function public.request_vbs_kinder_access() to authenticated;

create or replace function public.get_vbs_kinder_access_request_status()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select vbs_kinder_access_requests.status
  from public.vbs_kinder_access_requests
  where vbs_kinder_access_requests.user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.get_vbs_kinder_access_request_status()
to authenticated;

create or replace function public.list_vbs_kinder_access_requests()
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
  if not public.is_vbs_kinder_admin(auth.uid()) then
    raise exception 'Only VBS Kinder admins can review access requests.';
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
    from public.vbs_kinder_access_requests as requests
    left join public.profiles
      on profiles.id = requests.user_id
    order by
      case requests.status when 'pending' then 0 when 'approved' then 1 else 2 end,
      requests.requested_at desc;
end;
$$;

grant execute on function public.list_vbs_kinder_access_requests()
to authenticated;

create or replace function public.review_vbs_kinder_access_request(
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
  if not public.is_vbs_kinder_admin(reviewer) then
    raise exception 'Only VBS Kinder admins can review access requests.';
  end if;

  if next_status not in ('approved', 'rejected') then
    raise exception 'Request status must be approved or rejected.';
  end if;

  select user_id
  into requested_user
  from public.vbs_kinder_access_requests
  where id = request_id;

  if requested_user is null then
    raise exception 'Access request not found.';
  end if;

  update public.vbs_kinder_access_requests
  set status = next_status,
      reviewed_at = now(),
      reviewed_by = reviewer
  where id = request_id;

  if next_status = 'approved' then
    insert into public.vbs_kinder_access (user_id)
    values (requested_user)
    on conflict (user_id) do update
      set granted_at = public.vbs_kinder_access.granted_at;
  end if;

  return true;
end;
$$;

grant execute on function public.review_vbs_kinder_access_request(uuid, text)
to authenticated;

notify pgrst, 'reload schema';
