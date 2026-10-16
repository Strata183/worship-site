create table if not exists public.worship_night_email_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(trim(email))),
  signed_up_at timestamptz not null default now()
);

alter table public.worship_night_email_signups enable row level security;

grant insert (email) on public.worship_night_email_signups to anon, authenticated;

create policy "Anyone can join the Worship Night email list"
on public.worship_night_email_signups
for insert
to anon, authenticated
with check (email <> '');
