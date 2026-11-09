-- Admin panel Phase 1: dashboard numbers (DSH-1 to DSH-4). Read-only, counted in the database so the page loads in one
-- round of calls. Service role only: the panel calls them after its own permission check. Days are Cairo days.

-- Key numbers for one window: sign-ups, active learners, new paid subscriptions, cancellations, certificates issued.
create function public.admin_dash_counts(p_from timestamptz, p_to timestamptz)
returns table (metric text, n bigint)
language sql stable security definer set search_path = public as $$
  select 'signups', count(*) from public.profiles where created_at >= p_from and created_at < p_to
  union all
  select 'active', count(distinct user_id) from public.daily_activity
    where day >= (p_from at time zone 'Africa/Cairo')::date and day <= (p_to at time zone 'Africa/Cairo')::date and lessons_done > 0
  union all
  select 'subscribers', count(*) from public.subscriptions where created_at >= p_from and created_at < p_to
  union all
  select 'cancellations', count(*) from public.subscriptions where cancelled_at >= p_from and cancelled_at < p_to
  union all
  select 'certificates', count(*) from public.certificates where issued_at >= p_from and issued_at < p_to and revoked_at is null
$$;

-- Money by Cairo day, provider and currency (the page turns it into USD at the fixed rates).
create function public.admin_dash_money(p_from timestamptz)
returns table (day date, provider text, currency text, paid_minor bigint, payments bigint, refunded_minor bigint, refunds bigint)
language sql stable security definer set search_path = public as $$
  with p as (
    select (paid_at at time zone 'Africa/Cairo')::date d, provider, currency, amount_minor, false is_refund from public.payments where paid_at >= p_from
    union all
    select (refunded_at at time zone 'Africa/Cairo')::date, provider, currency, amount_minor, true from public.payments where refunded_at >= p_from
  )
  select d, provider, currency,
    coalesce(sum(amount_minor) filter (where not is_refund), 0), count(*) filter (where not is_refund),
    coalesce(sum(amount_minor) filter (where is_refund), 0), count(*) filter (where is_refund)
  from p group by d, provider, currency order by d
$$;

-- Funnel for learners who signed up in the window: first lesson, first unit check, subscribe, a path, a public certificate.
create function public.admin_funnel(p_from timestamptz)
returns table (step text, n bigint)
language sql stable security definer set search_path = public as $$
  with c as (select user_id from public.profiles where created_at >= p_from)
  select 'signup', count(*) from c
  union all
  select 'lesson', count(distinct a.user_id) from public.attempts a join c using (user_id) where a.finished_at is not null and a.kind = 'lesson'
  union all
  select 'unit', count(distinct a.user_id) from public.attempts a join c using (user_id) where a.finished_at is not null and a.kind = 'check'
  union all
  select 'subscribe', count(distinct s.user_id) from public.subscriptions s join c using (user_id)
  union all
  select 'path', count(distinct x.user_id) from public.certificates x join c using (user_id) where x.revoked_at is null
  union all
  select 'share', count(distinct x.user_id) from public.certificates x join c using (user_id) where x.revoked_at is null and x.public
$$;

-- Learners with a lesson try in each path in the window ("Paths this week").
create function public.admin_path_activity(p_from timestamptz, p_to timestamptz)
returns table (path_id text, learners bigint)
language sql stable security definer set search_path = public as $$
  select u.path_id, count(distinct a.user_id)
  from public.attempts a join public.lessons l on l.id = a.lesson_id join public.units u on u.id = l.unit_id
  where a.started_at >= p_from and a.started_at < p_to
  group by u.path_id order by 2 desc
$$;

revoke all on function public.admin_dash_counts(timestamptz, timestamptz), public.admin_dash_money(timestamptz), public.admin_funnel(timestamptz),
  public.admin_path_activity(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_dash_counts(timestamptz, timestamptz), public.admin_dash_money(timestamptz), public.admin_funnel(timestamptz),
  public.admin_path_activity(timestamptz, timestamptz) to service_role;
