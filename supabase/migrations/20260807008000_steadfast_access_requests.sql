-- Let Steadfast users unlock with a password or request access from an admin.

create table if not exists public.steadfast_access (
  user_id uuid primary key references auth.users (id) on delete cascade,
  granted_at timestamptz not null default now()
);

create table if not exists public.steadfast_access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  unique (user_id)
);

create table if not exists public.steadfast_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.steadfast_access enable row level security;
alter table public.steadfast_access_requests enable row level security;
alter table public.steadfast_admins enable row level security;

grant select on public.steadfast_access to authenticated;
grant select on public.steadfast_access_requests to authenticated;

drop policy if exists "Users can read their own Steadfast access"
on public.steadfast_access;

drop policy if exists "Users can read their own Steadfast request"
on public.steadfast_access_requests;

create policy "Users can read their own Steadfast access"
on public.steadfast_access
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can read their own Steadfast request"
on public.steadfast_access_requests
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.is_steadfast_admin(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.steadfast_admins
    where steadfast_admins.user_id = $1
  );
$$;

grant execute on function public.is_steadfast_admin(uuid) to authenticated;

create or replace function public.has_steadfast_access()
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
        from public.steadfast_access
        where steadfast_access.user_id = auth.uid()
      )
      or public.is_steadfast_admin(auth.uid())
    );
$$;

grant execute on function public.has_steadfast_access() to authenticated;

create or replace function public.claim_steadfast_access(access_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  requester uuid := auth.uid();
begin
  if requester is null then
    raise exception 'You must be signed in to unlock Steadfast.';
  end if;

  if not public.access_code_matches('steadfast', access_code) then
    raise exception 'That password did not work. Please try again.';
  end if;

  insert into public.steadfast_access (user_id)
  values (requester)
  on conflict (user_id) do update
    set granted_at = public.steadfast_access.granted_at;

  return public.has_steadfast_access();
end;
$$;

grant execute on function public.claim_steadfast_access(text) to authenticated;

create or replace function public.request_steadfast_access()
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

  insert into public.steadfast_access_requests (user_id, status, requested_at)
  values (requester, 'pending', now())
  on conflict (user_id) do update
    set status = case
          when public.steadfast_access_requests.status = 'approved'
            then public.steadfast_access_requests.status
          else 'pending'
        end,
        requested_at = case
          when public.steadfast_access_requests.status = 'approved'
            then public.steadfast_access_requests.requested_at
          else now()
        end,
        reviewed_at = case
          when public.steadfast_access_requests.status = 'approved'
            then public.steadfast_access_requests.reviewed_at
          else null
        end,
        reviewed_by = case
          when public.steadfast_access_requests.status = 'approved'
            then public.steadfast_access_requests.reviewed_by
          else null
        end
  returning id into request_id;

  return request_id;
end;
$$;

grant execute on function public.request_steadfast_access() to authenticated;

create or replace function public.get_steadfast_access_request_status()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select steadfast_access_requests.status
  from public.steadfast_access_requests
  where steadfast_access_requests.user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.get_steadfast_access_request_status()
to authenticated;

create or replace function public.list_steadfast_access_requests()
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
  if not public.is_steadfast_admin(auth.uid()) then
    raise exception 'Only Steadfast admins can review access requests.';
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
    from public.steadfast_access_requests as requests
    left join public.profiles
      on profiles.id = requests.user_id
    order by
      case requests.status when 'pending' then 0 when 'approved' then 1 else 2 end,
      requests.requested_at desc;
end;
$$;

grant execute on function public.list_steadfast_access_requests()
to authenticated;

create or replace function public.review_steadfast_access_request(
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
  if not public.is_steadfast_admin(reviewer) then
    raise exception 'Only Steadfast admins can review access requests.';
  end if;

  if next_status not in ('approved', 'rejected') then
    raise exception 'Request status must be approved or rejected.';
  end if;

  select user_id
  into requested_user
  from public.steadfast_access_requests
  where id = request_id;

  if requested_user is null then
    raise exception 'Access request not found.';
  end if;

  update public.steadfast_access_requests
  set status = next_status,
      reviewed_at = now(),
      reviewed_by = reviewer
  where id = request_id;

  if next_status = 'approved' then
    insert into public.steadfast_access (user_id)
    values (requested_user)
    on conflict (user_id) do update
      set granted_at = public.steadfast_access.granted_at;
  end if;

  return true;
end;
$$;

grant execute on function public.review_steadfast_access_request(uuid, text)
to authenticated;

notify pgrst, 'reload schema';
