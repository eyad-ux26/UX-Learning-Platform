-- UXGate slice 1: content, learner and progress tables with row-level security.
-- Rule: a learner reads and writes only their own rows. Answers and XP are written by the server
-- (service role) after it re-scores them, never directly by the browser.

-- ───────── content (readable by everyone, written only by the service role) ─────────

create table public.paths (
  id text primary key,
  kind text not null default 'interactive' check (kind in ('interactive', 'hybrid')),
  sort int not null default 0,
  title jsonb not null,
  subtitle jsonb,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.units (
  id text primary key,
  path_id text not null references public.paths (id) on delete cascade,
  sort int not null default 0,
  title jsonb not null,
  free boolean not null default false
);

create table public.skills (
  id text primary key,
  unit_id text not null references public.units (id) on delete cascade,
  title jsonb not null,
  criterion jsonb
);

create table public.lessons (
  id text primary key,
  unit_id text not null references public.units (id) on delete cascade,
  sort int not null default 0,
  mode text not null default 'lesson' check (mode in ('lesson', 'check')),
  minutes int
);

create table public.content_versions (
  id uuid primary key default gen_random_uuid(),
  lesson_id text not null references public.lessons (id) on delete cascade,
  hash text not null,
  body jsonb not null,
  published_at timestamptz not null default now(),
  unique (lesson_id, hash)
);

-- A published version never changes: old attempts must replay against the content they were played on.
create function public.content_versions_immutable() returns trigger language plpgsql as $$
begin
  raise exception 'content_versions rows are immutable';
end $$;
create trigger content_versions_no_update before update on public.content_versions
  for each row execute function public.content_versions_immutable();

-- ───────── learners ─────────

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  locale text not null default 'en' check (locale in ('en', 'ar')),
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  time_zone text,
  daily_goal int not null default 1 check (daily_goal between 1 and 3),
  reminder_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.onboarding (
  user_id uuid primary key references auth.users (id) on delete cascade,
  goal text,
  focus text,
  weekly_time text,
  recommended_path_id text references public.paths (id),
  skipped boolean not null default false,
  completed_at timestamptz
);

create table public.enrollments (
  user_id uuid not null references auth.users (id) on delete cascade,
  path_id text not null references public.paths (id),
  started_at timestamptz not null default now(),
  current_lesson_id text references public.lessons (id),
  primary key (user_id, path_id)
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  client_attempt_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null references public.lessons (id),
  content_version_id uuid not null references public.content_versions (id),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  kind text not null default 'lesson' check (kind in ('lesson', 'check', 'mastery', 'review')),
  unique (user_id, client_attempt_id)
);
create index attempts_user_lesson on public.attempts (user_id, lesson_id);

create table public.step_results (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  step_id text not null,
  skill_id text,
  try_no int not null,
  kind text not null check (kind in ('check', 'main_ok', 'reveal')),
  answer jsonb not null,
  correct boolean not null,
  hints_used int not null default 0,
  confidence int,
  misconception_id text,
  client_ts timestamptz,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index step_results_attempt on public.step_results (attempt_id, step_id);

-- One row per scored step: what the learner earned and how. Summed for XP, never edited.
create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  step_id text not null,
  outcome text not null check (outcome in ('independent', 'supported', 'revealed')),
  amount int not null check (amount >= 0),
  day date not null default current_date,
  created_at timestamptz not null default now(),
  unique (attempt_id, step_id)
);

create table public.skill_states (
  user_id uuid not null references auth.users (id) on delete cascade,
  skill_id text not null references public.skills (id),
  state text not null check (state in ('practiced', 'shown', 'kept')),
  shown_at timestamptz,
  kept_at timestamptz,
  next_review_at timestamptz,
  primary key (user_id, skill_id)
);

create table public.daily_activity (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  lessons_done int not null default 0,
  goal_met boolean not null default false,
  freeze_used boolean not null default false,
  primary key (user_id, day)
);

create table public.streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current int not null default 0,
  longest int not null default 0,
  freezes_available int not null default 0
);

-- A profile, onboarding row and streak row appear when an account is created.
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, display_name, locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    case when new.raw_user_meta_data ->> 'locale' = 'ar' then 'ar' else 'en' end
  );
  insert into public.onboarding (user_id) values (new.id);
  insert into public.streaks (user_id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────── privileges and row-level security ─────────

revoke all on all tables in schema public from anon, authenticated;
-- the server (service role) writes content, answers and XP
grant all on all tables in schema public to service_role;

-- content: anyone can read published content
grant select on public.paths, public.units, public.skills, public.lessons, public.content_versions to anon, authenticated;

alter table public.paths enable row level security;
alter table public.units enable row level security;
alter table public.skills enable row level security;
alter table public.lessons enable row level security;
alter table public.content_versions enable row level security;
create policy "read published paths" on public.paths for select using (status = 'published');
create policy "read units of published paths" on public.units for select using (exists (select 1 from public.paths p where p.id = path_id and p.status = 'published'));
create policy "read skills of published paths" on public.skills for select using (exists (select 1 from public.units u join public.paths p on p.id = u.path_id where u.id = unit_id and p.status = 'published'));
create policy "read lessons of published paths" on public.lessons for select using (exists (select 1 from public.units u join public.paths p on p.id = u.path_id where u.id = unit_id and p.status = 'published'));
create policy "read versions of published paths" on public.content_versions for select using (exists (select 1 from public.lessons l join public.units u on u.id = l.unit_id join public.paths p on p.id = u.path_id where l.id = lesson_id and p.status = 'published'));

-- learner-owned rows the browser may change itself
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.onboarding, public.enrollments to authenticated;
alter table public.profiles enable row level security;
alter table public.onboarding enable row level security;
alter table public.enrollments enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy "own profile update" on public.profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own onboarding read" on public.onboarding for select to authenticated using (user_id = (select auth.uid()));
create policy "own onboarding insert" on public.onboarding for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own onboarding update" on public.onboarding for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own enrollments read" on public.enrollments for select to authenticated using (user_id = (select auth.uid()));
create policy "own enrollments insert" on public.enrollments for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own enrollments update" on public.enrollments for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- progress rows: the learner can read their own, only the server writes them
grant select on public.attempts, public.step_results, public.xp_events, public.skill_states, public.daily_activity, public.streaks to authenticated;
alter table public.attempts enable row level security;
alter table public.step_results enable row level security;
alter table public.xp_events enable row level security;
alter table public.skill_states enable row level security;
alter table public.daily_activity enable row level security;
alter table public.streaks enable row level security;
create policy "own attempts read" on public.attempts for select to authenticated using (user_id = (select auth.uid()));
create policy "own step results read" on public.step_results for select to authenticated using (user_id = (select auth.uid()));
create policy "own xp read" on public.xp_events for select to authenticated using (user_id = (select auth.uid()));
create policy "own skill states read" on public.skill_states for select to authenticated using (user_id = (select auth.uid()));
create policy "own daily activity read" on public.daily_activity for select to authenticated using (user_id = (select auth.uid()));
create policy "own streak read" on public.streaks for select to authenticated using (user_id = (select auth.uid()));
