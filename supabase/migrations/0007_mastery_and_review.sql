-- Slice 2: mastery rounds, single-try outcomes and "ask for human review".

-- A mastery attempt asks only some steps of a unit's re-test bank. The plan lists their ids so the server
-- knows when the round is finished.
alter table public.attempts add column if not exists plan jsonb;

-- Skill checks and the mastery round can end a step as 'missed' (wrong on the only try, no XP).
alter table public.xp_events drop constraint if exists xp_events_outcome_check;
alter table public.xp_events add constraint xp_events_outcome_check check (outcome in ('independent', 'supported', 'revealed', 'missed'));

-- A learner who thinks a graded answer also works can ask for a person to look. Written by the server only;
-- the admin side reads it later. The learner can read their own requests.
create table public.review_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null references public.lessons (id),
  step_id text not null,
  content_version_id uuid references public.content_versions (id),
  answer jsonb not null,
  reason text not null check (reason in ('answer_works', 'unclear', 'broken', 'other')),
  note text check (note is null or char_length(note) <= 280),
  status text not null default 'open' check (status in ('open', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (user_id, lesson_id, step_id, created_at)
);
create index review_requests_status on public.review_requests (status, created_at);
alter table public.review_requests enable row level security;
grant select on public.review_requests to authenticated;
create policy "own review requests read" on public.review_requests for select to authenticated using (user_id = (select auth.uid()));
