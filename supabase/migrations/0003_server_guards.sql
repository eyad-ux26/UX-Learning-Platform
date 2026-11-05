-- 0003: server-side guards used by the attempts API (service role only).
-- 1) a small rate limiter: one counter per user, key and time window
-- 2) an atomic "lesson finished today" counter, so two tabs finishing together cannot lose a lesson

create table public.rate_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (user_id, key)
);
alter table public.rate_limits enable row level security; -- no policies: nobody reads or writes it except the service role

-- Counts one hit and answers true while the user is within `p_limit` hits per `p_window_seconds`.
create function public.hit_rate_limit(p_user uuid, p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_hits integer;
begin
  insert into public.rate_limits as r (user_id, key, window_start, hits)
  values (p_user, p_key, now(), 1)
  on conflict (user_id, key) do update
    set hits = case when r.window_start <= now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
        window_start = case when r.window_start <= now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;
  return v_hits <= p_limit;
end $$;

-- Adds one finished lesson to the user's day and returns the new total. `goal_met` follows the daily goal.
create function public.bump_lessons_done(p_user uuid, p_day date, p_goal integer)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_done integer;
begin
  insert into public.daily_activity as d (user_id, day, lessons_done, goal_met)
  values (p_user, p_day, 1, 1 >= p_goal)
  on conflict (user_id, day) do update
    set lessons_done = d.lessons_done + 1, goal_met = (d.lessons_done + 1) >= p_goal
  returning lessons_done into v_done;
  return v_done;
end $$;

revoke all on function public.hit_rate_limit(uuid, text, integer, integer) from public, anon, authenticated;
revoke all on function public.bump_lessons_done(uuid, date, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(uuid, text, integer, integer) to service_role;
grant execute on function public.bump_lessons_done(uuid, date, integer) to service_role;
revoke all on public.rate_limits from anon, authenticated;
