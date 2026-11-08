-- NOT a migration and NOT applied automatically. Eyad decides whether to run it (after migration 0042).
-- Fixes learners who signed up with Google before 0042: their display_name is still their email prefix although
-- Google gave us a name. Only touches rows where display_name equals the email prefix and the metadata has a name,
-- so a name the learner chose themselves is never overwritten.
-- Preview first:
--   select p.user_id, p.display_name, coalesce(nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), nullif(btrim(u.raw_user_meta_data ->> 'name'), '')) as google_name
--   from public.profiles p join auth.users u on u.id = p.user_id
--   where p.display_name = split_part(u.email, '@', 1) and coalesce(nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), nullif(btrim(u.raw_user_meta_data ->> 'name'), '')) is not null;
update public.profiles p
set display_name = coalesce(nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), nullif(btrim(u.raw_user_meta_data ->> 'name'), '')),
    updated_at = now()
from auth.users u
where u.id = p.user_id
  and p.display_name = split_part(u.email, '@', 1)
  and coalesce(nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), nullif(btrim(u.raw_user_meta_data ->> 'name'), '')) is not null;
