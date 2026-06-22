-- Close the temporary VBS chart editing tools now that the chart list has been
-- replaced. Chart rows remain readable to eligible users.

drop policy if exists "Eligible users can add VBS Kinder charts"
on public.vbs_kinder_charts;

drop policy if exists "Eligible users can delete VBS Kinder charts"
on public.vbs_kinder_charts;

revoke insert on public.vbs_kinder_charts from authenticated;
revoke delete on public.vbs_kinder_charts from authenticated;

notify pgrst, 'reload schema';
