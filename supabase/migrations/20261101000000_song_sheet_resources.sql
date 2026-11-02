-- Allow additional PDF music sheets to be attached to songs as resources.

alter table public.song_resources
  drop constraint if exists song_resources_resource_type_check;

alter table public.song_resources
  add constraint song_resources_resource_type_check
  check (resource_type in ('note', 'link', 'audio', 'sheet'));

notify pgrst, 'reload schema';
