-- Track when a song in My Library was copied from a friend's library.

alter table public.songs
add column if not exists copied_from_song_id uuid references public.songs (id) on delete set null;

create unique index if not exists songs_owner_copied_source_unique
on public.songs (owner_id, copied_from_song_id)
where copied_from_song_id is not null;

notify pgrst, 'reload schema';
