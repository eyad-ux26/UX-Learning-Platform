-- Google sign-ups carry the learner's name in raw_user_meta_data as 'full_name' and 'name', not 'display_name', so the
-- trigger fell back to the email prefix (a certificate read "eyad.0588"). Use, in order: display_name, full_name, name,
-- the email prefix. Blank values are skipped. Same function, same owner and grants (create or replace keeps them).
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_locale text := case when new.raw_user_meta_data ->> 'locale' = 'ar' then 'ar' else 'en' end;
begin
  insert into public.profiles (user_id, display_name, locale, week_start)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(new.email, '@', 1)
    ),
    v_locale, case when v_locale = 'ar' then 6 else 1 end);
  insert into public.onboarding (user_id) values (new.id);
  insert into public.streaks (user_id) values (new.id);
  return new;
end $$;
