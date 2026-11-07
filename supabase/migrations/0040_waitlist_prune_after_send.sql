-- 0040: the daily job deleted every unconfirmed address 30 days after it joined, even one whose confirmation email never
-- went out (no email service yet: those addresses wait queued, 0038 waitlist_queued). Now an unconfirmed address is
-- deleted only 30 days after its last confirmation email (confirm_sent_at, written by join_waitlist and
-- waitlist_mark_sent). A queued address that was never emailed (confirm_sent_at is null) is kept until its link goes out.

create or replace function public.prune_waitlist()
returns integer language sql security definer set search_path = public as $$
  with gone as (
    delete from public.waitlist
    where confirmed_at is null and confirm_sent_at is not null and confirm_sent_at < now() - interval '30 days'
    returning 1
  )
  select count(*)::integer from gone;
$$;

-- create or replace keeps the grants from 0038; repeated here so the function stays service role only whatever ran before.
revoke all on function public.prune_waitlist() from public, anon, authenticated;
grant execute on function public.prune_waitlist() to service_role;
