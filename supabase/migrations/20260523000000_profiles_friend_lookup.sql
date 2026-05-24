-- Keep public.profiles in sync with Supabase Auth users and provide a narrow
-- email lookup for sending friend requests.

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'Friend'),
    lower(new.email)
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;

create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

insert into public.profiles (id, display_name, email)
select
  users.id,
  coalesce(users.raw_user_meta_data->>'display_name', split_part(users.email, '@', 1), 'Friend'),
  lower(users.email)
from auth.users
where users.email is not null
on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(public.profiles.display_name, excluded.display_name);

create or replace function public.find_profile_id_by_email(profile_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select profiles.id
  from public.profiles
  where lower(profiles.email) = lower(trim(profile_email))
  limit 1;
$$;

grant execute on function public.find_profile_id_by_email(text) to authenticated;

create or replace function public.send_friend_request(addressee_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  requester uuid := auth.uid();
  addressee uuid;
  request_id uuid;
begin
  if requester is null then
    raise exception 'You must be signed in to send a friend request.';
  end if;

  select profiles.id
  into addressee
  from public.profiles
  where lower(profiles.email) = lower(trim(addressee_email))
  limit 1;

  if addressee is null then
    raise exception 'No profile found for %. Ask them to sign in once, then try again.', addressee_email;
  end if;

  if addressee = requester then
    raise exception 'You cannot send a friend request to yourself.';
  end if;

  select friendships.id
  into request_id
  from public.friendships
  where (
    friendships.requester_id = requester and friendships.addressee_id = addressee
  ) or (
    friendships.requester_id = addressee and friendships.addressee_id = requester
  )
  limit 1;

  if request_id is not null then
    return request_id;
  end if;

  insert into public.friendships (requester_id, addressee_id)
  values (requester, addressee)
  returning id into request_id;

  return request_id;
end;
$$;

grant execute on function public.send_friend_request(text) to authenticated;

notify pgrst, 'reload schema';
