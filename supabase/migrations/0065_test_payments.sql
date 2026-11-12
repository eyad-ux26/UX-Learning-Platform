-- Admin panel: keep test money out of the money screens (QA Phase 1 round 2). Run after 0064.
-- Payments and subscriptions made with the test provider ('mock') or against Paddle's sandbox were counted as real
-- revenue on the dashboard, the revenue page and the accountant export. Every row now says whether it is test money.
-- The app sets it when it writes the row (lib/server/billing/store.ts); test-provider rows are always test.
--
-- RUN BEFORE PADDLE GOES LIVE: the backfill below marks every existing Paddle row as test, which is right only while
-- all Paddle payments so far were made in the sandbox.

alter table public.payments add column test boolean not null default false;
alter table public.subscriptions add column test boolean not null default false;

create function public.billing_mark_test()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.provider = 'mock' then new.test := true; end if;
  return new;
end $$;

create trigger payments_mark_test before insert on public.payments for each row execute function public.billing_mark_test();
create trigger subscriptions_mark_test before insert on public.subscriptions for each row execute function public.billing_mark_test();

-- Everything so far is test money: the test provider, and Paddle while it runs in the sandbox (5 Nov tests).
update public.payments set test = true where provider in ('mock', 'paddle');
update public.subscriptions set test = true where provider in ('mock', 'paddle');

create index payments_real_paid on public.payments (paid_at) where not test;

-- Dashboard numbers without test money.
create or replace function public.admin_dash_counts(p_from timestamptz, p_to timestamptz)
returns table (metric text, n bigint)
language sql stable security definer set search_path = public as $$
  select 'signups', count(*) from public.profiles where created_at >= p_from and created_at < p_to
  union all
  select 'active', count(distinct user_id) from public.daily_activity
    where day >= (p_from at time zone 'Africa/Cairo')::date and day <= (p_to at time zone 'Africa/Cairo')::date and lessons_done > 0
  union all
  select 'subscribers', count(*) from public.subscriptions where created_at >= p_from and created_at < p_to and not test
  union all
  select 'cancellations', count(*) from public.subscriptions where cancelled_at >= p_from and cancelled_at < p_to and not test
  union all
  select 'certificates', count(*) from public.certificates where issued_at >= p_from and issued_at < p_to and revoked_at is null
$$;

create or replace function public.admin_dash_money(p_from timestamptz)
returns table (day date, provider text, currency text, paid_minor bigint, payments bigint, refunded_minor bigint, refunds bigint)
language sql stable security definer set search_path = public as $$
  with p as (
    select (paid_at at time zone 'Africa/Cairo')::date d, provider, currency, amount_minor, false is_refund from public.payments where paid_at >= p_from and not test
    union all
    select (refunded_at at time zone 'Africa/Cairo')::date, provider, currency, amount_minor, true from public.payments where refunded_at >= p_from and not test
  )
  select d, provider, currency,
    coalesce(sum(amount_minor) filter (where not is_refund), 0), count(*) filter (where not is_refund),
    coalesce(sum(amount_minor) filter (where is_refund), 0), count(*) filter (where is_refund)
  from p group by d, provider, currency order by d
$$;

create or replace function public.admin_funnel(p_from timestamptz)
returns table (step text, n bigint)
language sql stable security definer set search_path = public as $$
  with c as (select user_id from public.profiles where created_at >= p_from)
  select 'signup', count(*) from c
  union all
  select 'lesson', count(distinct a.user_id) from public.attempts a join c using (user_id) where a.finished_at is not null and a.kind = 'lesson'
  union all
  select 'unit', count(distinct a.user_id) from public.attempts a join c using (user_id) where a.finished_at is not null and a.kind = 'check'
  union all
  select 'subscribe', count(distinct s.user_id) from public.subscriptions s join c using (user_id) where not s.test
  union all
  select 'path', count(distinct x.user_id) from public.certificates x join c using (user_id) where x.revoked_at is null
  union all
  select 'share', count(distinct x.user_id) from public.certificates x join c using (user_id) where x.revoked_at is null and x.public
$$;

-- Reports (0063) without test money: they left out the test provider but counted Paddle sandbox payments.
create or replace function public.admin_report_growth(p_from timestamptz, p_to timestamptz)
returns table (day date, signups bigint, started bigint, finished bigint, trials bigint, paid bigint, waitlist bigint)
language sql stable security definer set search_path = public as $$
  with days as (select generate_series(date_trunc('day', p_from), date_trunc('day', p_to - interval '1 second'), interval '1 day')::date as day),
  u as (select created_at::date as day, count(*) n from public.profiles where created_at >= p_from and created_at < p_to group by 1),
  st as (select f.day, count(*) n from (select min(started_at)::date as day from public.attempts group by user_id) f where f.day >= p_from::date and f.day < p_to::date group by 1),
  fi as (select f.day, count(*) n from (select min(finished_at)::date as day from public.attempts where finished_at is not null group by user_id) f where f.day >= p_from::date and f.day < p_to::date group by 1),
  tr as (select started_at::date as day, count(*) n from public.trials where started_at >= p_from and started_at < p_to group by 1),
  pd as (select paid_at::date as day, count(*) n from public.payments where kind = 'first' and status in ('paid', 'refunded') and not test and paid_at >= p_from and paid_at < p_to group by 1),
  wl as (select consent_at::date as day, count(*) n from public.waitlist where consent_at >= p_from and consent_at < p_to group by 1)
  select d.day, coalesce(u.n, 0), coalesce(st.n, 0), coalesce(fi.n, 0), coalesce(tr.n, 0), coalesce(pd.n, 0), coalesce(wl.n, 0)
  from days d left join u using (day) left join st using (day) left join fi using (day) left join tr using (day) left join pd using (day) left join wl using (day)
  order by d.day
$$;

create or replace function public.admin_report_money()
returns table (region text, provider text, period text, currency text, plans bigint, renew_minor bigint)
language sql stable security definer set search_path = public as $$
  select region, provider, period, currency, count(*), sum(renew_amount_minor)::bigint
  from public.subscriptions where status in ('active', 'grace') and not test
  group by 1, 2, 3, 4 order by 1, 2, 3
$$;

revoke all on function public.billing_mark_test() from public, anon, authenticated;
