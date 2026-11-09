-- 0062: free trials (the Admins' answer of 9 Nov 2026: design trials now). Behind the flag `trials` (0061, off).
--
--   * A learner who never had Pro, a trial or a subscription can start one trial. It gives Pro through the same
--     entitlements row the app already checks, with source 'trial', until the trial ends. No card is asked for.
--   * The length comes from the setting trial.days (3, 7 or 14; default 7) when the trial starts.
--   * Paying during the trial turns it into a normal subscription: the webhooks write source 'live' and the trial is
--     marked converted. At the end Pro simply stops (valid_until); the daily job sends the two trial emails.
--   * Support can extend a trial (trials.extend), with a reason, and it is logged.
-- The terms say "No trial" today: they must change before the flag is turned on.

alter table public.entitlements drop constraint if exists entitlements_source_check;
alter table public.entitlements add constraint entitlements_source_check check (source in ('live', 'mock', 'manual', 'trial'));

create table public.trials (
  user_id uuid primary key references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  days integer not null check (days in (3, 7, 14)),
  ends_at timestamptz not null,
  extended_days integer not null default 0 check (extended_days between 0 and 60),
  status text not null default 'active' check (status in ('active', 'converted', 'ended')),
  converted_at timestamptz,
  reminder_sent_at timestamptz,     -- "your trial ends in 2 days"
  ended_sent_at timestamptz         -- "your trial ended"
);
create index trials_ending on public.trials (ends_at) where status = 'active';

alter table public.trials enable row level security;
revoke all on public.trials from public, anon, authenticated;
grant select on public.trials to authenticated;
grant select, insert, update, delete on public.trials to service_role;
create policy "own trial" on public.trials for select to authenticated using (user_id = auth.uid());

-- Pro counts for a trial too.
create or replace function public.has_pro(p_user uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.entitlements e where e.user_id = p_user and e.plan = 'pro' and e.source in ('live', 'manual', 'trial') and e.valid_until > now())
$$;
revoke all on function public.has_pro(uuid) from public, anon, authenticated;
grant execute on function public.has_pro(uuid) to service_role;

-- Paying during a trial: the webhook writes a live entitlement and the trial is converted. Free Pro given by support
-- during a trial (source manual) ends the trial quietly: no "your trial ended" email (ended_sent_at is set).
create function public.trials_on_entitlement() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.source = 'live' and new.plan = 'pro' and (old.source is distinct from 'live') then
    update public.trials set status = 'converted', converted_at = now() where user_id = new.user_id and status = 'active';
  elsif new.source = 'manual' and new.plan = 'pro' and old.source = 'trial' then
    update public.trials set status = 'ended', ended_sent_at = coalesce(ended_sent_at, now()) where user_id = new.user_id and status = 'active';
  end if;
  return new;
end $$;
create trigger trials_on_entitlement after update on public.entitlements for each row execute function public.trials_on_entitlement();

-- Why a learner cannot start a trial, or null when they can. Service role only.
create function public.trial_refusal(p_user uuid) returns text language sql stable security definer set search_path = public as $$
  select case
    when not exists (select 1 from public.app_flags where key = 'trials' and enabled) then 'off'
    when exists (select 1 from public.trials where user_id = p_user) then 'used'
    when exists (select 1 from public.subscriptions where user_id = p_user and provider <> 'mock') then 'subscribed'
    when exists (select 1 from public.entitlements where user_id = p_user and (pro_since is not null or (plan = 'pro' and valid_until > now() and source <> 'mock'))) then 'had_pro'
    else null end
$$;

-- Starts the learner's one trial. Answers the end time.
create function public.start_trial(p_user uuid) returns timestamptz language plpgsql security definer set search_path = public as $$
declare
  v_why text := public.trial_refusal(p_user);
  v_days integer;
  v_end timestamptz;
begin
  if v_why is not null then raise exception 'trial not available: %', v_why using errcode = '42501'; end if;
  v_days := coalesce((select (value #>> '{}')::integer from public.app_settings where key = 'trial.days'), 7);
  if v_days not in (3, 7, 14) then v_days := 7; end if;
  v_end := now() + make_interval(days => v_days);
  insert into public.trials (user_id, days, ends_at) values (p_user, v_days, v_end);
  insert into public.entitlements as e (user_id, plan, valid_until, source, updated_at) values (p_user, 'pro', v_end, 'trial', now())
    on conflict (user_id) do update set plan = 'pro', valid_until = v_end, source = 'trial', updated_at = now();
  return v_end;
end $$;

-- Support extends a trial that is running or ended in the last 14 days (and was not converted).
create function public.admin_extend_trial(p_actor uuid, p_user uuid, p_days integer, p_reason text, p_ip text, p_ua text, p_session uuid)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare
  t public.trials;
  v_end timestamptz;
begin
  perform public.admin_require(p_actor, 'trials.extend');
  if char_length(coalesce(trim(p_reason), '')) < 3 then raise exception 'write a reason of at least 3 characters' using errcode = '22023'; end if;
  if p_days not between 1 and 14 then raise exception 'extend by 1 to 14 days' using errcode = '22023'; end if;
  select * into t from public.trials where user_id = p_user for update;
  if t.user_id is null then raise exception 'this learner has no trial' using errcode = '22023'; end if;
  if t.status = 'converted' then raise exception 'this learner already pays' using errcode = '22023'; end if;
  if t.ends_at < now() - interval '14 days' then raise exception 'this trial ended more than 14 days ago' using errcode = '22023'; end if;
  if t.extended_days + p_days > 60 then raise exception 'a trial can be extended by 60 days at most' using errcode = '22023'; end if;
  if exists (select 1 from public.entitlements where user_id = p_user and plan = 'pro' and source in ('live', 'manual') and valid_until > now()) then
    raise exception 'this learner already has Pro' using errcode = '22023';
  end if;
  v_end := greatest(t.ends_at, now()) + make_interval(days => p_days);
  update public.trials set ends_at = v_end, extended_days = t.extended_days + p_days, status = 'active', ended_sent_at = null where user_id = p_user;
  insert into public.entitlements (user_id, plan, valid_until, source, updated_at) values (p_user, 'pro', v_end, 'trial', now())
    on conflict (user_id) do update set plan = 'pro', valid_until = v_end, source = 'trial', updated_at = now();
  perform public.admin_log(p_actor, 'billing.trial_extended', 'billing', 'learner', p_user::text, null,
    jsonb_build_object('ends_at', t.ends_at), jsonb_build_object('ends_at', v_end, 'days', p_days), p_reason, p_ip, p_ua, p_session);
  return v_end;
end $$;

-- For the daily job: trials that end within 2 days (reminder) and trials that ended (end email, status ended), with
-- the address and language to write to. At most p_limit rows per run.
create function public.trials_due(p_now timestamptz default now(), p_limit integer default 100)
returns table (user_id uuid, kind text, ends_at timestamptz, email text, locale text, display_name text)
language sql stable security definer set search_path = public as $$
  select d.user_id, d.kind, d.ends_at, u.email::text, coalesce(p.locale, 'en'), p.display_name
  from (
    select t.user_id, 'reminder' as kind, t.ends_at from public.trials t
      where t.status = 'active' and t.reminder_sent_at is null and t.ends_at > p_now and t.ends_at <= p_now + interval '2 days'
    union all
    select t.user_id, 'ended', t.ends_at from public.trials t
      where t.status = 'active' and t.ends_at <= p_now and t.ended_sent_at is null
  ) d
  join auth.users u on u.id = d.user_id
  left join public.profiles p on p.user_id = d.user_id
  order by d.ends_at
  limit p_limit
$$;

create function public.trial_mark(p_user uuid, p_kind text) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_kind = 'reminder' then update public.trials set reminder_sent_at = now() where user_id = p_user;
  elsif p_kind = 'ended' then update public.trials set ended_sent_at = now(), status = 'ended' where user_id = p_user and status = 'active' and ends_at <= now();
  else raise exception 'bad kind' using errcode = '22023'; end if;
end $$;

revoke all on function public.trial_refusal(uuid), public.start_trial(uuid), public.admin_extend_trial(uuid, uuid, integer, text, text, text, uuid),
  public.trials_due(timestamptz, integer), public.trial_mark(uuid, text) from public, anon, authenticated;
grant execute on function public.trial_refusal(uuid), public.start_trial(uuid), public.admin_extend_trial(uuid, uuid, integer, text, text, text, uuid),
  public.trials_due(timestamptz, integer), public.trial_mark(uuid, text) to service_role;
