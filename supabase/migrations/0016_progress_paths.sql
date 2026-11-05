-- Slice 3: several paths, streak freezes, certificates, the achievement page and the opt-in leaderboard.
-- Numbering: slice 2 uses 0006 to 0015, slice 3 starts at 0016.
-- Same rule as before: a learner reads only their own rows; anything that scores or awards is written by the server.

-- ───────── joining and switching paths ─────────

-- Only a published path can be joined (Coming soon paths are not in the database as published, so they cannot be started).
drop policy "own enrollments insert" on public.enrollments;
create policy "own enrollments insert" on public.enrollments for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.paths p where p.id = path_id and p.status = 'published'));
-- A row the learner has cannot be moved to another path or back-dated: the browser may only set which lesson is current
-- and when the path was last active. (The current path must be an enrollment, so it can only be a published path too.)
revoke insert, update on public.enrollments from authenticated;
grant insert (user_id, path_id, current_lesson_id, last_active_at) on public.enrollments to authenticated;
grant update (current_lesson_id, last_active_at) on public.enrollments to authenticated;
-- The suggested path in onboarding must be a published one as well.
drop policy "own onboarding insert" on public.onboarding;
drop policy "own onboarding update" on public.onboarding;
create policy "own onboarding insert" on public.onboarding for insert to authenticated
  with check (user_id = (select auth.uid()) and (recommended_path_id is null or exists (select 1 from public.paths p where p.id = recommended_path_id and p.status = 'published')));
create policy "own onboarding update" on public.onboarding for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (recommended_path_id is null or exists (select 1 from public.paths p where p.id = recommended_path_id and p.status = 'published')));

-- Every start and every switch is logged, so "why is this my current path" can always be answered. Only the server writes it.
create table public.path_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('started', 'switched')),
  path_id text not null references public.paths (id),
  from_path_id text references public.paths (id),
  created_at timestamptz not null default now()
);
create index path_events_user on public.path_events (user_id, created_at desc);
grant select on public.path_events to authenticated;
alter table public.path_events enable row level security;
create policy "own path events read" on public.path_events for select to authenticated using (user_id = (select auth.uid()));

-- ───────── streak and freezes ─────────

-- Days up to and including this one have been settled (goal days counted, freezes earned or used). The daily job and
-- every Home visit move it forward; running them again changes nothing.
alter table public.streaks add column settled_through date;

-- A learner's own yesterday. A time zone the database does not know counts as UTC rather than failing the whole query.
create or replace function public.local_yesterday(p_tz text) returns date language plpgsql stable set search_path = public as $$
begin
  return (now() at time zone coalesce(nullif(p_tz, ''), 'UTC'))::date - 1;
exception when others then
  return (now() at time zone 'UTC')::date - 1;
end $$;


-- One row each time a freeze is earned or used. `seen_at` stays empty until the learner has seen the calm note.
create table public.freeze_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('earned', 'used')),
  day date not null,
  seen_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, kind, day)
);
grant select on public.freeze_events to authenticated;
alter table public.freeze_events enable row level security;
create policy "own freeze events read" on public.freeze_events for select to authenticated using (user_id = (select auth.uid()));

-- ───────── certificates ─────────

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  path_id text not null references public.paths (id),
  issued_at timestamptz not null default now(),
  code text not null unique default substr(md5(gen_random_uuid()::text), 1, 12),
  unique (user_id, path_id)
);
grant select on public.certificates to authenticated;
alter table public.certificates enable row level security;
create policy "own certificates read" on public.certificates for select to authenticated using (user_id = (select auth.uid()));

-- ───────── achievement page and leaderboard (both off by default) ─────────

alter table public.profiles
  add column handle text,
  add column share_enabled boolean not null default false,
  add column leaderboard_joined_at timestamptz,
  add column leaderboard_name text;
create unique index profiles_handle_key on public.profiles (lower(handle)) where handle is not null;
alter table public.profiles add constraint profiles_handle_shape check (handle is null or handle ~ '^[a-z0-9][a-z0-9-]{2,29}$');

-- The first day of the learner's week (0 = Sunday ... 6 = Saturday), fixed at sign-up from their language:
-- Saturday for Arabic, Monday for English. Changing the language later does not move the week. Existing learners are
-- set once from their current language.
alter table public.profiles add column week_start smallint not null default 1 check (week_start between 0 and 6);
update public.profiles set week_start = case when locale = 'ar' then 6 else 1 end;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_locale text := case when new.raw_user_meta_data ->> 'locale' = 'ar' then 'ar' else 'en' end;
begin
  insert into public.profiles (user_id, display_name, locale, week_start)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)), v_locale, case when v_locale = 'ar' then 6 else 1 end);
  insert into public.onboarding (user_id) values (new.id);
  insert into public.streaks (user_id) values (new.id);
  return new;
end $$;

-- Who the nightly job still has to settle: only learners whose settled day is before their own yesterday, so a learner
-- already settled (in any zone, east or west of UTC) is never picked again, oldest first.
create or replace function public.settle_candidates(p_limit integer) returns table (user_id uuid, time_zone text, locale text, week_start smallint)
language sql stable security definer set search_path = public as $$
  select s.user_id, p.time_zone, p.locale, p.week_start
  from public.streaks s join public.profiles p on p.user_id = s.user_id
  where s.settled_through is null or s.settled_through < public.local_yesterday(p.time_zone)
  order by s.settled_through asc nulls first, s.user_id
  limit greatest(1, least(p_limit, 500));
$$;
revoke all on function public.settle_candidates(integer) from public, anon, authenticated;
grant execute on function public.settle_candidates(integer) to service_role;

-- The browser may update a learner's own profile row, but not these columns: the server sets them after checking the rules.
-- (Column privileges: update is granted per column, replacing the table-wide update from 0001.)
revoke update on public.profiles from authenticated;
grant update (display_name, locale, theme, time_zone, daily_goal, reminder_time, current_path_id, updated_at) on public.profiles to authenticated;

-- Feature flags the admin panel will own later. The leaderboard is behind one and starts off.
create table public.app_flags (
  key text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.app_flags (key, enabled) values ('leaderboard', false);
grant select on public.app_flags to authenticated;
alter table public.app_flags enable row level security;
create policy "flags readable" on public.app_flags for select to authenticated using (true);

-- Weekly XP of everyone who has joined, newest week first. It answers nothing to a learner who has not joined,
-- never lists a learner who has not joined, and returns only the name they chose and their XP.
create function public.weekly_leaderboard(p_since timestamptz, p_limit integer default 50)
returns table (rank bigint, name text, xp bigint, is_me boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then return; end if;
  if not exists (select 1 from public.app_flags where key = 'leaderboard' and enabled) then return; end if;
  if not exists (select 1 from public.profiles where user_id = v_me and leaderboard_joined_at is not null) then return; end if;
  -- the week can only start in the last 8 days
  if p_since < now() - interval '8 days' or p_since > now() then return; end if;
  return query
    with totals as (
      select p.user_id, coalesce(p.leaderboard_name, p.display_name, '') as nm, coalesce(sum(x.amount), 0)::bigint as total
      from public.profiles p
      left join public.xp_events x on x.user_id = p.user_id and x.created_at >= p_since
      where p.leaderboard_joined_at is not null
      group by p.user_id, p.leaderboard_name, p.display_name
    )
    select (rank() over (order by total desc))::bigint, nm, total, user_id = v_me
    from totals order by 1, 2 limit greatest(1, least(p_limit, 100));
end $$;
revoke all on function public.weekly_leaderboard(timestamptz, integer) from public, anon;
grant execute on function public.weekly_leaderboard(timestamptz, integer) to authenticated, service_role;

-- The server (service role) writes the new tables; 0001's grant only covered the tables that existed then.
grant all on public.path_events, public.freeze_events, public.certificates, public.app_flags to service_role;
