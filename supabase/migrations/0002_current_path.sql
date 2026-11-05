-- A learner can join several paths; one of them is the current path (spec 4.4b).
-- Joining a path is a row in enrollments, which is already unique per (user_id, path_id).

alter table public.enrollments add column last_active_at timestamptz;

-- The current path must be one the learner has joined: the pair has to exist in enrollments.
-- With a null current path the check is skipped, so a new learner has none until onboarding sets it.
alter table public.profiles add column current_path_id text;
alter table public.profiles
  add constraint profiles_current_path_enrolled
  foreign key (user_id, current_path_id) references public.enrollments (user_id, path_id);
