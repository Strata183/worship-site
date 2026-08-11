-- When a setlist folder is deleted, delete the setlists inside it too.
-- Setlist items already cascade through public.setlists.

alter table public.setlists
drop constraint if exists setlists_folder_id_fkey;

alter table public.setlists
add constraint setlists_folder_id_fkey
foreign key (folder_id)
references public.setlist_folders (id)
on delete cascade;

notify pgrst, 'reload schema';
