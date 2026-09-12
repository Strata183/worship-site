-- The Steadfast delete policy was present, but authenticated users also need
-- the table-level DELETE privilege before that policy can take effect.
grant delete on public.steadfast_audio_recordings to authenticated;

notify pgrst, 'reload schema';
