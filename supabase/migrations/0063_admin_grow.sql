-- 0063: admin panel Phase 2, part 3. Content quality (QLT), reports (RPT), communications (COM) and the help centre
-- (SUP-11). Service role only, like the rest of the panel; changes go through functions that check the permission and
-- write the audit log. Learners read only what is meant for them: live announcements and published help articles.

-- ───────── content quality ─────────

-- A flag on one step: from learner reports (review_requests) or from the numbers (low right first time, many reveals).
-- The panel shows candidates live; a row here exists once someone acts on one, and keeps its status.
create table public.content_flags (
  id uuid primary key default gen_random_uuid(),
  lesson_id text not null references public.lessons (id) on delete cascade,
  step_id text not null,
  source text not null check (source in ('learners', 'numbers', 'team')),
  status text not null default 'to_check' check (status in ('to_check', 'fixing', 'fixed', 'wont_fix')),
  note text check (note is null or char_length(note) <= 1000),
  misconception_id text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  check_after timestamptz,          -- "a week later check the numbers"
  unique (lesson_id, step_id)
);

-- First tries per step of one lesson (or every lesson of a path): how many, how many right, hints, reveals, confidence.
create function public.admin_step_stats(p_lesson text default null, p_path text default null, p_since timestamptz default now() - interval '90 days')
returns table (lesson_id text, step_id text, skill_id text, first_tries bigint, first_right bigint, with_hints bigint, reveals bigint, avg_confidence numeric, misconceptions jsonb)
language sql stable security definer set search_path = public as $$
  with tries as (
    select a.lesson_id, s.step_id, s.skill_id, s.correct, s.hints_used, s.kind, s.confidence, s.misconception_id
    from public.step_results s join public.attempts a on a.id = s.attempt_id
    where s.created_at >= p_since and s.try_no = 1 and s.kind in ('check', 'reveal')
      and (p_lesson is null or a.lesson_id = p_lesson)
      and (p_path is null or a.lesson_id like p_path || '-%')
  )
  select t.lesson_id, t.step_id, max(t.skill_id), count(*) filter (where t.kind = 'check'), count(*) filter (where t.kind = 'check' and t.correct),
         count(*) filter (where t.hints_used > 0), count(*) filter (where t.kind = 'reveal'), round(avg(t.confidence), 2),
         coalesce(jsonb_object_agg(t.misconception_id, 1) filter (where t.misconception_id is not null), '{}')
  from tries t group by t.lesson_id, t.step_id
$$;

-- Misconceptions hit, per id (first tries), for the skills screen.
create function public.admin_misconception_counts(p_path text, p_since timestamptz default now() - interval '90 days')
returns table (misconception_id text, hits bigint) language sql stable security definer set search_path = public as $$
  select s.misconception_id, count(*) from public.step_results s join public.attempts a on a.id = s.attempt_id
  where s.misconception_id is not null and s.try_no = 1 and s.created_at >= p_since and a.lesson_id like p_path || '-%'
  group by s.misconception_id
$$;

-- Per skill of a path (skill ids look like SK-P01-U01-01): first tries and right, learners at Shown and Kept.
create function public.admin_skill_stats(p_path text)
returns table (skill_id text, first_tries bigint, first_right bigint, shown bigint, kept bigint) language sql stable security definer set search_path = public as $$
  with st as (
    select s.skill_id, count(*) filter (where s.kind = 'check') as ft, count(*) filter (where s.kind = 'check' and s.correct) as fr
    from public.step_results s join public.attempts a on a.id = s.attempt_id
    where s.try_no = 1 and s.skill_id like 'SK-' || p_path || '-%' group by s.skill_id
  ), ss as (
    select skill_id, count(*) filter (where state in ('shown', 'kept')) as shown, count(*) filter (where state = 'kept') as kept
    from public.skill_states where skill_id like 'SK-' || p_path || '-%' group by skill_id
  )
  select coalesce(st.skill_id, ss.skill_id), coalesce(st.ft, 0), coalesce(st.fr, 0), coalesce(ss.shown, 0), coalesce(ss.kept, 0)
  from st full join ss on ss.skill_id = st.skill_id
$$;

-- Learner reports per step (open review requests), for the quality list.
create function public.admin_step_reports(p_since timestamptz default now() - interval '90 days')
returns table (lesson_id text, step_id text, reports bigint, open_reports bigint, reasons jsonb, last_at timestamptz) language sql stable security definer set search_path = public as $$
  select r.lesson_id, r.step_id, count(*), count(*) filter (where r.status = 'open'),
         jsonb_object_agg(r.reason, 1), max(r.created_at)
  from public.review_requests r where r.created_at >= p_since group by r.lesson_id, r.step_id
$$;

create function public.admin_set_flag_status(p_actor uuid, p_lesson text, p_step text, p_source text, p_status text, p_note text,
  p_misconception text, p_ip text, p_ua text, p_session uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  f public.content_flags;
begin
  perform public.admin_require(p_actor, case when p_status in ('fixed', 'wont_fix') then 'quality.manage' else 'content.edit' end);
  if p_status not in ('to_check', 'fixing', 'fixed', 'wont_fix') then raise exception 'bad status' using errcode = '22023'; end if;
  if p_status = 'wont_fix' and char_length(coalesce(trim(p_note), '')) < 3 then raise exception 'say why it will not be fixed' using errcode = '22023'; end if;
  select * into f from public.content_flags where lesson_id = p_lesson and step_id = p_step for update;
  insert into public.content_flags as c (lesson_id, step_id, source, status, note, misconception_id, created_by, updated_by, check_after)
  values (p_lesson, p_step, coalesce(p_source, 'team'), p_status, p_note, p_misconception, p_actor, p_actor, case when p_status = 'fixed' then now() + interval '7 days' end)
  on conflict (lesson_id, step_id) do update set status = p_status, note = coalesce(p_note, c.note), updated_by = p_actor, updated_at = now(),
    misconception_id = coalesce(p_misconception, c.misconception_id), check_after = case when p_status = 'fixed' then now() + interval '7 days' else c.check_after end;
  perform public.admin_log(p_actor, 'content.quality_flag', 'content', 'step', p_lesson || ' ' || p_step, p_lesson || ' ' || p_step,
    case when f.id is null then null else jsonb_build_object('status', f.status) end, jsonb_build_object('status', p_status), p_note, p_ip, p_ua, p_session);
end $$;

-- ───────── reports ─────────

-- Learning (RPT-1): lessons finished, skills shown and kept, paths finished (certificates), per path, in a period.
create function public.admin_report_learning(p_from timestamptz, p_to timestamptz)
returns table (path_id text, lessons_finished bigint, learners bigint, skills_shown bigint, skills_kept bigint, paths_finished bigint)
language sql stable security definer set search_path = public as $$
  with l as (
    select split_part(a.lesson_id, '-', 1) as path_id, count(*) filter (where a.finished_at is not null) as fin, count(distinct a.user_id) as who
    from public.attempts a where a.started_at >= p_from and a.started_at < p_to group by 1
  ), s as (
    select split_part(regexp_replace(skill_id, '^SK-', ''), '-', 1) as path_id, count(*) filter (where shown_at >= p_from and shown_at < p_to) as shown,
           count(*) filter (where kept_at >= p_from and kept_at < p_to) as kept
    from public.skill_states group by 1
  ), c as (
    select path_id, count(*) as n from public.certificates where issued_at >= p_from and issued_at < p_to group by 1
  )
  select p.id, coalesce(l.fin, 0), coalesce(l.who, 0), coalesce(s.shown, 0), coalesce(s.kept, 0), coalesce(c.n, 0)
  from public.paths p left join l on l.path_id = p.id left join s on s.path_id = p.id left join c on c.path_id = p.id
  order by p.sort
$$;

-- Growth (RPT-2): sign-ups per day, how many started a lesson, finished one, started a trial, paid.
create function public.admin_report_growth(p_from timestamptz, p_to timestamptz)
returns table (day date, signups bigint, started bigint, finished bigint, trials bigint, paid bigint, waitlist bigint)
language sql stable security definer set search_path = public as $$
  with days as (select generate_series(date_trunc('day', p_from), date_trunc('day', p_to - interval '1 second'), interval '1 day')::date as day),
  u as (select created_at::date as day, count(*) n from public.profiles where created_at >= p_from and created_at < p_to group by 1),
  st as (select f.day, count(*) n from (select min(started_at)::date as day from public.attempts group by user_id) f where f.day >= p_from::date and f.day < p_to::date group by 1),
  fi as (select f.day, count(*) n from (select min(finished_at)::date as day from public.attempts where finished_at is not null group by user_id) f where f.day >= p_from::date and f.day < p_to::date group by 1),
  tr as (select started_at::date as day, count(*) n from public.trials where started_at >= p_from and started_at < p_to group by 1),
  pd as (select paid_at::date as day, count(*) n from public.payments where kind = 'first' and status in ('paid', 'refunded') and provider <> 'mock' and paid_at >= p_from and paid_at < p_to group by 1),
  wl as (select consent_at::date as day, count(*) n from public.waitlist where consent_at >= p_from and consent_at < p_to group by 1)
  select d.day, coalesce(u.n, 0), coalesce(st.n, 0), coalesce(fi.n, 0), coalesce(tr.n, 0), coalesce(pd.n, 0), coalesce(wl.n, 0)
  from days d left join u using (day) left join st using (day) left join fi using (day) left join tr using (day) left join pd using (day) left join wl using (day)
  order by d.day
$$;

-- Money (RPT-3): live plans by region, provider and period, with what they renew at (minor units, own currency).
create function public.admin_report_money()
returns table (region text, provider text, period text, currency text, plans bigint, renew_minor bigint)
language sql stable security definer set search_path = public as $$
  select region, provider, period, currency, count(*), sum(renew_amount_minor)::bigint
  from public.subscriptions where status in ('active', 'grace') and provider <> 'mock'
  group by 1, 2, 3, 4 order by 1, 2, 3
$$;

-- Certificates (RPT-4): issued per path in a period, and how many are public (shared achievement pages).
create function public.admin_report_certs(p_from timestamptz, p_to timestamptz)
returns table (path_id text, issued bigint, public bigint) language plpgsql stable security definer set search_path = public as $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'certificates' and column_name = 'public') then
    return query execute 'select path_id, count(*), count(*) filter (where public) from public.certificates where issued_at >= $1 and issued_at < $2 group by 1 order by 1' using p_from, p_to;
  else
    return query select c.path_id, count(*), 0::bigint from public.certificates c where c.issued_at >= p_from and c.issued_at < p_to group by 1 order by 1;
  end if;
end $$;

-- Saved and scheduled reports (RPT-5). A scheduled one is emailed to admins every week by the daily job.
create table public.admin_saved_reports (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 80),
  report text not null check (report in ('learning', 'growth', 'money', 'certs')),
  range_days integer not null default 30 check (range_days in (7, 30, 90, 365)),
  weekly boolean not null default false,
  recipients text[] not null default '{}',
  last_sent_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ───────── communications ─────────

-- In-app announcements (COM-3): a banner in the learner app while it runs, behind the flag `announcements`.
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title jsonb not null check (char_length(title ->> 'en') between 3 and 80 and char_length(title ->> 'ar') between 3 and 80),
  body jsonb not null check (char_length(body ->> 'en') between 3 and 240 and char_length(body ->> 'ar') between 3 and 240),
  link text check (link is null or link ~ '^/(app|paths|pricing)(/[A-Za-z0-9/_-]*)?$'),
  audience text not null default 'all' check (audience in ('all', 'free', 'pro')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft', 'waiting_approval', 'scheduled', 'cancelled')),
  approval_id uuid,
  audience_count integer,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- Email campaigns (COM-2) to learners who did not unsubscribe from news. Sent by the daily job in batches once
-- scheduled (and approved when over 500 people).
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 80),
  subject jsonb not null check (char_length(subject ->> 'en') between 3 and 120 and char_length(subject ->> 'ar') between 3 and 120),
  body jsonb not null check (char_length(body ->> 'en') between 10 and 4000 and char_length(body ->> 'ar') between 10 and 4000),
  button jsonb,
  audience text not null default 'all' check (audience in ('all', 'free', 'pro', 'trial')),
  send_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'waiting_approval', 'scheduled', 'sending', 'sent', 'cancelled')),
  approval_id uuid,
  audience_count integer,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.campaign_sends (
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  sent_at timestamptz not null default now(),
  provider_id text,
  primary key (campaign_id, user_id)
);

-- Who an audience is: accounts that did not turn off news emails and are not being deleted.
create function public.admin_audience(p_audience text) returns table (user_id uuid, email text, locale text, display_name text)
language sql stable security definer set search_path = public as $$
  select u.id, u.email::text, coalesce(p.locale, 'en'), p.display_name
  from auth.users u join public.profiles p on p.user_id = u.id
  left join public.entitlements e on e.user_id = u.id
  where u.email is not null
    and p.delete_after is null
    -- News email is a choice of its own ('news' in notification_prefs, on unless turned off; every campaign email links to turning it off).
    and not exists (select 1 from public.notification_prefs n where n.user_id = u.id and n.prefs -> 'news' ->> 'email' = 'false')
    and case p_audience
      when 'all' then true
      when 'pro' then e.plan = 'pro' and e.valid_until > now() and e.source in ('live', 'manual', 'trial')
      when 'free' then not coalesce(e.plan = 'pro' and e.valid_until > now() and e.source in ('live', 'manual', 'trial'), false)
      when 'trial' then e.source = 'trial' and e.valid_until > now()
      else false end
$$;

create function public.admin_audience_count(p_audience text) returns bigint language sql stable security definer set search_path = public as $$
  select count(*) from public.admin_audience(p_audience)
$$;

-- The next people a campaign goes to: its audience, less everyone it already went to. The sender marks each one in
-- campaign_sends before sending, so a person never gets the same campaign twice.
create function public.campaign_next(p_campaign uuid, p_limit integer default 100) returns table (user_id uuid, email text, locale text, display_name text)
language sql stable security definer set search_path = public as $$
  select a.* from public.campaigns c, public.admin_audience(c.audience) a
  where c.id = p_campaign and not exists (select 1 from public.campaign_sends s where s.campaign_id = c.id and s.user_id = a.user_id)
  order by a.user_id limit least(greatest(p_limit, 1), 500)
$$;

-- What a learner sees: live announcements for their plan (and only while the flag is on).
create function public.my_announcements() returns table (id uuid, title jsonb, body jsonb, link text, ends_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.id, a.title, a.body, a.link, a.ends_at from public.announcements a
  left join public.entitlements e on e.user_id = auth.uid()
  where auth.uid() is not null and a.status = 'scheduled' and now() >= a.starts_at and now() < a.ends_at
    and exists (select 1 from public.app_flags where key = 'announcements' and enabled)
    and case a.audience when 'all' then true
      when 'pro' then coalesce(e.plan = 'pro' and e.valid_until > now() and e.source in ('live', 'manual', 'trial'), false)
      else not coalesce(e.plan = 'pro' and e.valid_until > now() and e.source in ('live', 'manual', 'trial'), false) end
  order by a.starts_at desc limit 1
$$;

-- ───────── help centre ─────────

create table public.help_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  topic text not null check (topic in ('account', 'learning', 'billing', 'certificates', 'technical')),
  title jsonb not null check (char_length(title ->> 'en') between 3 and 120 and char_length(title ->> 'ar') between 3 and 120),
  body jsonb not null check (char_length(body ->> 'en') between 10 and 8000 and char_length(body ->> 'ar') between 10 and 8000),
  status text not null default 'draft' check (status in ('draft', 'published')),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  views integer not null default 0
);

-- Searches in the help centre that found nothing, so the team can write the missing article.
create table public.help_misses (
  term text primary key check (char_length(term) between 2 and 80),
  hits integer not null default 1,
  last_at timestamptz not null default now()
);

create function public.help_note_miss(p_term text) returns void language sql security definer set search_path = public as $$
  insert into public.help_misses (term) values (lower(left(btrim(p_term), 80)))
  on conflict (term) do update set hits = public.help_misses.hits + 1, last_at = now()
$$;

-- ───────── system health ─────────

-- One row per scheduled job run (lib/server/job-run.ts), for System health (SYS-2). Kept 30 days by the daily job.
create table public.job_runs (
  id bigint generated always as identity primary key,
  name text not null check (name ~ '^[a-z-]{2,30}$'),
  ok boolean not null,
  detail text check (detail is null or char_length(detail) <= 500),
  finished_at timestamptz not null default now()
);
create index job_runs_name_at on public.job_runs (name, finished_at desc);

create function public.job_runs_prune() returns integer language sql security definer set search_path = public as $$
  with d as (delete from public.job_runs where finished_at < now() - interval '30 days' returning 1) select count(*)::int from d
$$;

-- ───────── privileges ─────────

alter table public.content_flags enable row level security;
alter table public.admin_saved_reports enable row level security;
alter table public.announcements enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_sends enable row level security;
alter table public.help_articles enable row level security;
alter table public.help_misses enable row level security;
alter table public.job_runs enable row level security;
revoke all on public.content_flags, public.admin_saved_reports, public.announcements, public.campaigns, public.campaign_sends,
  public.help_articles, public.help_misses, public.job_runs from public, anon, authenticated;
grant select, insert, update, delete on public.content_flags, public.admin_saved_reports, public.announcements, public.campaigns,
  public.campaign_sends, public.help_articles, public.help_misses, public.job_runs to service_role;
-- Published help articles are public (the help pages and the app read them).
grant select on public.help_articles to anon, authenticated;
create policy "published help" on public.help_articles for select to anon, authenticated using (status = 'published');

revoke all on function public.admin_step_stats(text, text, timestamptz), public.admin_misconception_counts(text, timestamptz), public.admin_skill_stats(text),
  public.admin_step_reports(timestamptz), public.admin_set_flag_status(uuid, text, text, text, text, text, text, text, text, uuid),
  public.admin_report_learning(timestamptz, timestamptz), public.admin_report_growth(timestamptz, timestamptz), public.admin_report_money(),
  public.admin_report_certs(timestamptz, timestamptz), public.admin_audience(text), public.admin_audience_count(text), public.help_note_miss(text), public.job_runs_prune(), public.campaign_next(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.admin_step_stats(text, text, timestamptz), public.admin_misconception_counts(text, timestamptz), public.admin_skill_stats(text),
  public.admin_step_reports(timestamptz), public.admin_set_flag_status(uuid, text, text, text, text, text, text, text, text, uuid),
  public.admin_report_learning(timestamptz, timestamptz), public.admin_report_growth(timestamptz, timestamptz), public.admin_report_money(),
  public.admin_report_certs(timestamptz, timestamptz), public.admin_audience(text), public.admin_audience_count(text), public.help_note_miss(text), public.job_runs_prune(), public.campaign_next(uuid, integer)
  to service_role;
revoke all on function public.my_announcements() from public, anon;
grant execute on function public.my_announcements() to authenticated, service_role;
