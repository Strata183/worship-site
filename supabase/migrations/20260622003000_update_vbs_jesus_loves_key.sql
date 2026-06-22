-- Set the medley key for the first VBS chart.

update public.vbs_kinder_charts
set song_key = 'D-A'
where lower(title) like '%jesus loves the little children%'
  and lower(title) like '%jesus loves me%';

notify pgrst, 'reload schema';
