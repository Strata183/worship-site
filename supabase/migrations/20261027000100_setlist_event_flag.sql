-- Keep the original folder-based setlists separate from the Events workspace.
alter table public.setlists
  add column if not exists is_event boolean not null default false;

create index if not exists setlists_owner_event_idx
on public.setlists (owner_id, is_event, event_date desc);

notify pgrst, 'reload schema';
