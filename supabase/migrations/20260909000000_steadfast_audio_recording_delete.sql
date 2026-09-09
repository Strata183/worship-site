-- Allow Steadfast admins to remove recording metadata after the matching R2 file is deleted.
drop policy if exists "Steadfast admins can delete audio recordings"
on public.steadfast_audio_recordings;

create policy "Steadfast admins can delete audio recordings"
on public.steadfast_audio_recordings
for delete
to authenticated
using (public.is_steadfast_admin(auth.uid()));
