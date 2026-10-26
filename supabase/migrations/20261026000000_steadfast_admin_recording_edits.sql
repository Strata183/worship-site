-- Steadfast admins can edit recording metadata regardless of who uploaded it.
drop policy if exists "Steadfast admins can update audio recordings"
on public.steadfast_audio_recordings;

create policy "Steadfast admins can update audio recordings"
on public.steadfast_audio_recordings
for update
to authenticated
using (public.is_steadfast_admin(auth.uid()))
with check (public.is_steadfast_admin(auth.uid()));

notify pgrst, 'reload schema';
