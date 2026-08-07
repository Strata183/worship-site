-- Access control for the Master's Bible Study page.
-- Users can unlock with a shared password or request access for an admin to approve.
-- The password hash is stored in public.page_access_codes, so the real password
-- does not live in this repo.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.page_access_codes (
  page_key text primary key,
  access_code_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.page_access_codes enable row level security;

create or replace function public.access_code_matches(
  requested_page_key text,
  access_code text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  configured_hash text;
begin
  select page_access_codes.access_code_hash
  into configured_hash
  from public.page_access_codes
  where page_access_codes.page_key = requested_page_key;

  if configured_hash is null then
    raise exception 'Access code is not configured yet.';
  end if;

  if access_code is null or length(trim(access_code)) = 0 then
    return false;
  end if;

  return extensions.crypt(access_code, configured_hash) = configured_hash;
end;
$$;

grant execute on function public.access_code_matches(text, text) to authenticated;

create table if not exists public.masters_bible_study_access (
  user_id uuid primary key references auth.users (id) on delete cascade,
  granted_at timestamptz not null default now()
);

create table if not exists public.masters_bible_study_access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  unique (user_id)
);

create table if not exists public.masters_bible_study_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.masters_bible_study_access enable row level security;
alter table public.masters_bible_study_access_requests enable row level security;
alter table public.masters_bible_study_admins enable row level security;

drop policy if exists "Users can read their own Masters Bible Study access" on public.masters_bible_study_access;
drop policy if exists "Users can read their own Masters Bible Study request" on public.masters_bible_study_access_requests;

create policy "Users can read their own Masters Bible Study access"
on public.masters_bible_study_access
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can read their own Masters Bible Study request"
on public.masters_bible_study_access_requests
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.is_masters_bible_study_admin(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.masters_bible_study_admins
    where masters_bible_study_admins.user_id = $1
  );
$$;

grant execute on function public.is_masters_bible_study_admin(uuid) to authenticated;

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

  return true;
end;
$$;

grant execute on function public.claim_masters_bible_study_access(text) to authenticated;

create or replace function public.request_masters_bible_study_access()
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

  insert into public.masters_bible_study_access_requests (user_id, status, requested_at)
  values (requester, 'pending', now())
  on conflict (user_id) do update
    set status = case
          when public.masters_bible_study_access_requests.status = 'approved'
            then public.masters_bible_study_access_requests.status
          else 'pending'
        end,
        requested_at = case
          when public.masters_bible_study_access_requests.status = 'approved'
            then public.masters_bible_study_access_requests.requested_at
          else now()
        end,
        reviewed_at = case
          when public.masters_bible_study_access_requests.status = 'approved'
            then public.masters_bible_study_access_requests.reviewed_at
          else null
        end,
        reviewed_by = case
          when public.masters_bible_study_access_requests.status = 'approved'
            then public.masters_bible_study_access_requests.reviewed_by
          else null
        end
  returning id into request_id;

  return request_id;
end;
$$;

grant execute on function public.request_masters_bible_study_access() to authenticated;

create or replace function public.list_masters_bible_study_access_requests()
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
  if not public.is_masters_bible_study_admin(auth.uid()) then
    raise exception 'Only Master''s Bible Study admins can review access requests.';
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
    from public.masters_bible_study_access_requests as requests
    left join public.profiles
      on profiles.id = requests.user_id
    order by
      case requests.status when 'pending' then 0 when 'approved' then 1 else 2 end,
      requests.requested_at desc;
end;
$$;

grant execute on function public.list_masters_bible_study_access_requests() to authenticated;

create or replace function public.review_masters_bible_study_access_request(
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
  if not public.is_masters_bible_study_admin(reviewer) then
    raise exception 'Only Master''s Bible Study admins can review access requests.';
  end if;

  if next_status not in ('approved', 'rejected') then
    raise exception 'Request status must be approved or rejected.';
  end if;

  select user_id
  into requested_user
  from public.masters_bible_study_access_requests
  where id = request_id;

  if requested_user is null then
    raise exception 'Access request not found.';
  end if;

  update public.masters_bible_study_access_requests
  set status = next_status,
      reviewed_at = now(),
      reviewed_by = reviewer
  where id = request_id;

  if next_status = 'approved' then
    insert into public.masters_bible_study_access (user_id)
    values (requested_user)
    on conflict (user_id) do update
      set granted_at = public.masters_bible_study_access.granted_at;
  end if;

  return true;
end;
$$;

grant execute on function public.review_masters_bible_study_access_request(uuid, text) to authenticated;

notify pgrst, 'reload schema';
