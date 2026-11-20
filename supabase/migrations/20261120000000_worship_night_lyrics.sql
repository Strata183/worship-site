create table if not exists public.worship_night_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.worship_night_songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  lyrics text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.worship_night_admins enable row level security;
alter table public.worship_night_songs enable row level security;

grant select on public.worship_night_songs to anon, authenticated;
grant insert, update, delete on public.worship_night_songs to authenticated;

create or replace function public.is_worship_night_admin(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() = $1 and exists (
    select 1 from public.worship_night_admins
    where worship_night_admins.user_id = $1
  );
$$;

revoke all on function public.is_worship_night_admin(uuid) from public;
grant execute on function public.is_worship_night_admin(uuid) to authenticated;

drop policy if exists "Anyone can read Worship Night songs" on public.worship_night_songs;
create policy "Anyone can read Worship Night songs"
on public.worship_night_songs for select to anon, authenticated using (true);

drop policy if exists "Worship Night admins can manage songs" on public.worship_night_songs;
create policy "Worship Night admins can manage songs"
on public.worship_night_songs for all to authenticated
using (public.is_worship_night_admin(auth.uid()))
with check (public.is_worship_night_admin(auth.uid()));

-- After creating the admin account, add its auth.users UUID here in Supabase:
-- insert into public.worship_night_admins (user_id)
-- values ('YOUR-ADMIN-USER-UUID');

notify pgrst, 'reload schema';
