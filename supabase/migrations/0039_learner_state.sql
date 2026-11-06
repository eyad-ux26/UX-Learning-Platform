-- 0039: everything the signed-in app shell reads about the learner, in one call (issue #184).
-- Before this, each signed-in page sent 10 to 14 separate reads to the database (profile, lessons, activity, skills,
-- paths, streak, plan, unread notices...). Every read is its own HTTP request, and a request that fails is retried by
-- the client after 1 s, 2 s and 4 s, so pages for learners with history took 2 to 7 s. One read keeps it to one trip.
--
-- security invoker: it runs with the caller's rights, so row-level security still limits a learner to their own rows,
-- and a caller with no learner id (auth.uid() is null) gets empty lists. It changes no data. The app works without it
-- (it falls back to the separate reads), only slower.
-- p_since: the first day of daily activity to return (the app asks for about the last 4 months).

create or replace function public.my_learner_state(p_since date)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'profile', (
      select jsonb_build_object(
        'display_name', p.display_name, 'daily_goal', p.daily_goal, 'time_zone', p.time_zone, 'locale', p.locale,
        'week_start', p.week_start, 'current_path_id', p.current_path_id, 'handle', p.handle, 'share_enabled', p.share_enabled,
        'leaderboard_joined_at', p.leaderboard_joined_at, 'reminder_time', p.reminder_time, 'created_at', p.created_at)
      from public.profiles p where p.user_id = (select auth.uid())
    ),
    'lessons', coalesce((select jsonb_agg(to_jsonb(l)) from public.my_lesson_progress() l), '[]'::jsonb),
    'activity', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'lessons_done', d.lessons_done, 'goal_met', d.goal_met, 'freeze_used', d.freeze_used) order by d.day)
      from public.daily_activity d where d.user_id = (select auth.uid()) and d.day >= p_since
    ), '[]'::jsonb),
    'onboarding', (
      select jsonb_build_object('completed_at', o.completed_at, 'recommended_path_id', o.recommended_path_id)
      from public.onboarding o where o.user_id = (select auth.uid())
    ),
    'skills', coalesce((
      select jsonb_agg(jsonb_build_object('skill_id', s.skill_id, 'state', s.state, 'shown_at', s.shown_at, 'kept_at', s.kept_at, 'next_review_at', s.next_review_at))
      from public.skill_states s where s.user_id = (select auth.uid())
    ), '[]'::jsonb),
    'enrollments', coalesce((
      select jsonb_agg(jsonb_build_object('path_id', e.path_id, 'started_at', e.started_at, 'last_active_at', e.last_active_at))
      from public.enrollments e where e.user_id = (select auth.uid())
    ), '[]'::jsonb),
    'streak', (
      select jsonb_build_object('longest', s.longest, 'freezes_available', s.freezes_available, 'settled_through', s.settled_through)
      from public.streaks s where s.user_id = (select auth.uid())
    ),
    'freeze_note', (
      select jsonb_build_object('id', f.id, 'day', f.day)
      from public.freeze_events f
      where f.user_id = (select auth.uid()) and f.kind = 'used' and f.seen_at is null
      order by f.day desc limit 1
    ),
    'entitlement', (
      select jsonb_build_object('plan', x.plan, 'valid_until', x.valid_until, 'pro_since', x.pro_since, 'pro_ended_at', x.pro_ended_at, 'source', x.source)
      from public.entitlements x where x.user_id = (select auth.uid())
    ),
    'unread', (select count(*)::int from public.notifications n where n.user_id = (select auth.uid()) and n.read_at is null),
    'certificates', coalesce((
      select jsonb_agg(jsonb_build_object('path_id', c.path_id, 'issued_at', c.issued_at, 'code', c.code) order by c.issued_at)
      from public.certificates c where c.user_id = (select auth.uid())
    ), '[]'::jsonb),
    'leaderboard_open', coalesce((select a.enabled from public.app_flags a where a.key = 'leaderboard'), false)
  )
$$;

revoke all on function public.my_learner_state(date) from public, anon;
grant execute on function public.my_learner_state(date) to authenticated;
