-- Private Steadfast audio recordings.
-- The actual audio files live in Cloudflare R2; this table stores metadata and R2 keys.

create table if not exists public.steadfast_audio_recordings (
  id uuid primary key default gen_random_uuid(),
  recorded_on date not null,
  title text not null,
  songs text[] not null default '{}',
  note text not null default '',
  file_path text not null,
  content_type text not null default 'audio/mpeg',
  uploaded_by uuid references auth.users (id) on delete set null,
  uploaded_at timestamptz not null default now()
);

alter table public.steadfast_audio_recordings enable row level security;

grant select, insert, update on public.steadfast_audio_recordings
to authenticated;

drop policy if exists "Eligible users can read Steadfast audio recordings"
on public.steadfast_audio_recordings;

drop policy if exists "Steadfast admins can add audio recordings"
on public.steadfast_audio_recordings;

drop policy if exists "Steadfast admins can update audio recordings"
on public.steadfast_audio_recordings;

create policy "Eligible users can read Steadfast audio recordings"
on public.steadfast_audio_recordings
for select
to authenticated
using (public.has_steadfast_access());

create policy "Steadfast admins can add audio recordings"
on public.steadfast_audio_recordings
for insert
to authenticated
with check (
  public.is_steadfast_admin(auth.uid())
  and uploaded_by = auth.uid()
);

create policy "Steadfast admins can update audio recordings"
on public.steadfast_audio_recordings
for update
to authenticated
using (public.is_steadfast_admin(auth.uid()))
with check (
  public.is_steadfast_admin(auth.uid())
  and uploaded_by = auth.uid()
);

notify pgrst, 'reload schema';
