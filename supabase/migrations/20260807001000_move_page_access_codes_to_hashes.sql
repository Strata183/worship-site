-- Move shared page access passwords out of SQL function bodies.
-- Set the real passwords directly in Supabase with hashed rows in page_access_codes.

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

  return true;
end;
$$;

grant execute on function public.claim_vbs_kinder_access(text) to authenticated;

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

  update public.masters_bible_study_access_requests
  set status = 'approved',
      reviewed_at = now(),
      reviewed_by = requester
  where user_id = requester;

  return true;
end;
$$;

grant execute on function public.claim_masters_bible_study_access(text) to authenticated;

notify pgrst, 'reload schema';
