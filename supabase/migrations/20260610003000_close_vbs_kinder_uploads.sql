-- Close the temporary website upload path for VBS Kinder charts. Existing chart
-- rows remain readable to eligible users, but users can no longer add new chart
-- rows from the browser.

drop policy if exists "Eligible users can add VBS Kinder charts"
on public.vbs_kinder_charts;

revoke insert on public.vbs_kinder_charts from authenticated;

notify pgrst, 'reload schema';
