-- Sign-in emails follow the language of the page the learner asked from. The sign-in email template reads the saved
-- language on the account, so the app saves the page's language first. Only the server (service_role) may call this.
-- It changes nothing when the email has no account, and the app answers the same way either way.
create or replace function public.set_locale_by_email(p_email text, p_locale text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_locale not in ('en', 'ar') then return; end if;
  update auth.users
    set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('locale', p_locale)
    where lower(email) = lower(p_email);
  update public.profiles set locale = p_locale, updated_at = now()
    where user_id in (select id from auth.users where lower(email) = lower(p_email));
end $$;

revoke all on function public.set_locale_by_email(text, text) from public, anon, authenticated;
grant execute on function public.set_locale_by_email(text, text) to service_role;
