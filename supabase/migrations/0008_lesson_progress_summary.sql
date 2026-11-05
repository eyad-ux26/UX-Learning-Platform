-- 0008: a per-lesson summary of the signed-in learner's own progress, so pages stop reading every attempt and
-- xp_event row on each request (that cost grew with the learner's history and pushed the Worker past its CPU limit).
-- One row per lesson the learner has started: whether any play of it finished, and the XP earned in it.
-- security invoker: it runs with the caller's rights, so row-level security still limits a learner to their own rows.
-- A learner's own id always wins over p_user; only the service role (no auth.uid(), RLS bypassed) reads another learner,
-- as the attempts API does.

create index if not exists xp_events_user_attempt on public.xp_events (user_id, attempt_id);

create or replace function public.my_lesson_progress(p_user uuid default null)
returns table (lesson_id text, finished boolean, xp integer)
language sql
stable
security invoker
set search_path = public
as $$
  select a.lesson_id, bool_or(a.finished_at is not null) as finished, coalesce(sum(x.xp), 0)::int as xp
  from public.attempts a
  left join (
    select e.attempt_id, sum(e.amount) as xp
    from public.xp_events e
    where e.user_id = coalesce(auth.uid(), p_user)
    group by e.attempt_id
  ) x on x.attempt_id = a.id
  where a.user_id = coalesce(auth.uid(), p_user)
  group by a.lesson_id
$$;

revoke all on function public.my_lesson_progress(uuid) from public, anon;
grant execute on function public.my_lesson_progress(uuid) to authenticated, service_role;
