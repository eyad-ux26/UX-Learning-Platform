-- 0004: replays of a finished lesson. 'paid' = the first replay of that lesson on that day (half XP, counts toward the
-- daily goal and streak); 'unpaid' = later replays that day (no XP). Null = a first play.
alter table public.attempts add column replay_kind text check (replay_kind in ('paid', 'unpaid'));
create index attempts_replay_paid on public.attempts (user_id, lesson_id, started_at) where replay_kind = 'paid';
