-- Slice 4: settings, notification choices, the inbox, reminders by email and push, review request answers,
-- and deleting an account with a 30-day undo. Numbering: slice 4 uses 0026 to 0035, slice 5 starts at 0036.
-- Same rule as before: a learner reads only their own rows; anything that is sent, scored or scheduled is written by the server.

-- ───────── notification choices ─────────

-- One row per learner: for each kind, which channels are on. Missing kinds or channels fall back to the defaults in
-- apps/web/lib/notifications.ts. Billing email is always on; the server ignores any attempt to turn it off.
create table public.notification_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;
grant select on public.notification_prefs to authenticated;
create policy "own notification prefs read" on public.notification_prefs for select to authenticated using (user_id = (select auth.uid()));

-- ───────── the inbox ─────────

-- Copy is not stored: the app renders each kind in the learner's language from `data` (lesson id, badge id, ...).
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('reminder', 'goal', 'review', 'badge', 'answer', 'billing', 'welcome')),
  data jsonb not null default '{}'::jsonb,
  href text check (href is null or href ~ '^/[A-Za-z0-9/_?=&.-]*$'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user on public.notifications (user_id, created_at desc);
create index notifications_unread on public.notifications (user_id) where read_at is null;
alter table public.notifications enable row level security;
grant select on public.notifications to authenticated;
create policy "own notifications read" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
-- Marking as read goes through this function, so the browser can change nothing else on the row.
create function public.mark_notifications_read(p_ids uuid[] default null) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_n integer;
begin
  if v_me is null then return 0; end if;
  update public.notifications set read_at = now()
    where user_id = v_me and read_at is null and (p_ids is null or id = any (p_ids));
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

-- ───────── emails we sent ─────────

-- Every email the app sends itself (sign-in and reset emails are sent by Supabase Auth). The partial unique index is the
-- "at most one reminder email a day" rule: the goal-still-open copy is a variant of the same daily reminder, never a second email.
create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  kind text not null,
  day date not null,
  provider_id text,
  sent_at timestamptz not null default now()
);
create unique index email_log_one_reminder_a_day on public.email_log (user_id, day) where kind in ('reminder', 'goal');
create index email_log_user on public.email_log (user_id, sent_at desc);
alter table public.email_log enable row level security;
grant select on public.email_log to authenticated;
create policy "own email log read" on public.email_log for select to authenticated using (user_id = (select auth.uid()));

-- ───────── push on each device ─────────

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://'),
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_ok_at timestamptz
);
create index push_subscriptions_user on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
grant select on public.push_subscriptions to authenticated;
create policy "own push subscriptions read" on public.push_subscriptions for select to authenticated using (user_id = (select auth.uid()));

-- ───────── answers to review requests (slice 2 table) ─────────

-- The admin side writes these later. The learner sees the reply, signed "The UXGate team", and what changed.
alter table public.review_requests
  add column if not exists reply jsonb,
  add column if not exists replied_at timestamptz,
  add column if not exists xp_added integer not null default 0;

-- ───────── deleting an account ─────────

-- Deleting signs the learner out everywhere and schedules removal 30 days later. Signing in before then undoes it.
-- The daily job removes the auth user after `delete_after`, and every learner table cascades from auth.users.
alter table public.profiles
  add column if not exists delete_requested_at timestamptz,
  add column if not exists delete_after timestamptz,
  add column if not exists welcome_sent_at timestamptz;
create index profiles_delete_after on public.profiles (delete_after) where delete_after is not null;

-- ───────── the hourly reminder job ─────────

-- Learners whose reminder hour is the current hour in their own time zone, who have not had a reminder email for that
-- local day, and whose account is not being deleted. Service role only. An unknown time zone counts as UTC.
create function public.reminder_candidates(p_limit integer default 25)
returns table (user_id uuid, email text, locale text, display_name text, daily_goal integer, current_path_id text, local_day date, lessons_today integer, active_days date[], reminder_time time)
language sql stable security definer set search_path = public as $$
  with p as (
    select pr.user_id, pr.locale, pr.display_name, pr.daily_goal, pr.reminder_time,
      (select cp from (select to_jsonb(pr) ->> 'current_path_id' as cp) x) as current_path_id,
      case when pr.time_zone is not null and exists (select 1 from pg_timezone_names z where z.name = pr.time_zone) then pr.time_zone else 'UTC' end as tz
    from public.profiles pr
    where pr.reminder_time is not null and pr.delete_after is null
  ), due as (
    select p.*, (now() at time zone p.tz)::date as lday
    from p
    where extract(hour from (now() at time zone p.tz)) = extract(hour from p.reminder_time)
  )
  select d.user_id, u.email::text, d.locale, d.display_name, d.daily_goal, d.current_path_id, d.lday,
    coalesce((select a.lessons_done from public.daily_activity a where a.user_id = d.user_id and a.day = d.lday), 0),
    coalesce((select array_agg(a.day order by a.day desc) from public.daily_activity a where a.user_id = d.user_id and a.lessons_done > 0 and a.day > d.lday - 60), '{}'),
    d.reminder_time
  from due d
  join auth.users u on u.id = d.user_id
  where not exists (select 1 from public.email_log l where l.user_id = d.user_id and l.day = d.lday and l.kind in ('reminder', 'goal'))
  order by d.user_id
  limit greatest(1, least(p_limit, 200));
$$;
revoke all on function public.reminder_candidates(integer) from public, anon, authenticated;
grant execute on function public.reminder_candidates(integer) to service_role;
