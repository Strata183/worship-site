# Page Access Codes

Shared page passwords are stored as hashes in Supabase, not in this repo.

Run this in the Supabase SQL editor to set or rotate a password:

```sql
insert into public.page_access_codes (page_key, access_code_hash, updated_at)
values (
  'vbs_kinder',
  extensions.crypt('PUT_VBS_PASSWORD_HERE', extensions.gen_salt('bf')),
  now()
)
on conflict (page_key) do update
  set access_code_hash = excluded.access_code_hash,
      updated_at = now();
```

```sql
insert into public.page_access_codes (page_key, access_code_hash, updated_at)
values (
  'masters_bible_study',
  extensions.crypt('PUT_MASTERS_PASSWORD_HERE', extensions.gen_salt('bf')),
  now()
)
on conflict (page_key) do update
  set access_code_hash = excluded.access_code_hash,
      updated_at = now();
```

Use the real passwords only in Supabase. Do not commit them to GitHub.
