-- Private chart metadata for VBS Kinder Music. The actual PDFs live in
-- Cloudflare R2. This table stores the private R2 object key and only exposes
-- chart rows to signed-in users who have claimed VBS access.

create table if not exists public.vbs_kinder_charts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  file_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.vbs_kinder_charts enable row level security;

drop policy if exists "Eligible users can read VBS Kinder charts"
on public.vbs_kinder_charts;

create policy "Eligible users can read VBS Kinder charts"
on public.vbs_kinder_charts
for select
to authenticated
using (
  exists (
    select 1
    from public.vbs_kinder_access
    where vbs_kinder_access.user_id = auth.uid()
  )
);

notify pgrst, 'reload schema';
