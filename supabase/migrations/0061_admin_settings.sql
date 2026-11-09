-- 0061: admin panel Phase 2, part 2. Platform settings (SET-1 to SET-3): feature flags, learning rules, trial length,
-- maintenance mode, the Coming Soon gate and the team password.
--
--   * app_flags (0016) gets a label, a description and who changed it last. New flags, all off: trials, announcements,
--     content_db (learners get the lesson versions published from the panel; 0060).
--   * app_settings holds the learning rules that were code constants, with the same values as defaults, and the
--     access settings that were only Worker variables. The app falls back to its built-in defaults when a row is missing.
--   * The team password is stored only as a PBKDF2 hash (app_secrets), never shown; the panel can only replace it.
--   * app_config() is what the app reads (cached for a minute): flags and settings, never a secret.
-- Changes go through admin_set_flag and admin_set_setting, which check the permission and write the audit log. The
-- panel also asks for a fresh two-step code, a reason and the typed name before it calls them.

-- ───────── flags ─────────

alter table public.app_flags
  add column label text,
  add column description text,
  add column updated_by uuid references auth.users (id) on delete set null;

update public.app_flags set label = 'Weekly leaderboard', description = 'The Board tab: weekly XP of learners who joined it.' where key = 'leaderboard';
insert into public.app_flags (key, enabled, label, description) values
  ('trials', false, 'Free trials', 'New learners can start a free Pro trial (length in Learning rules). Change the terms before turning it on: they say "No trial".'),
  ('announcements', false, 'In-app announcements', 'Banners from Communications show in the learner app.'),
  ('content_db', false, 'Lessons from the panel', 'Learners get the lesson versions published in Content > Releases. Off: the versions built from the content files.')
on conflict (key) do nothing;

-- ───────── settings ─────────

create table public.app_settings (
  key text primary key check (key ~ '^[a-z]+\.[a-z_]+$'),
  value jsonb not null,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- The defaults are the code constants of 9 Nov 2026 (lib/learning-rules.ts). The week start is not here: it is fixed
-- per learner at sign-up (Saturday in Arabic, Monday in English), and changing it would move weeks already counted.
insert into public.app_settings (key, value) values
  ('learning.freeze_goal_days', '5'),
  ('learning.freeze_max', '2'),
  ('learning.max_mastery_misses', '2'),
  ('learning.variants_per_skill', '2'),
  ('learning.review_after_days', '3'),
  ('learning.miss_retry_days', '1'),
  ('trial.days', '7'),
  ('access.maintenance', 'false'),
  ('access.maintenance_message', '{"en":"We are making UXGate better. Please come back in a little while.","ar":"نعمل على تحسين UXGate. عُد بعد قليل من فضلك."}'),
  ('access.coming_soon', 'null')
on conflict (key) do nothing;

-- What a setting may hold. Answers null when the value is fine, or the sentence the panel shows.
create function public.app_setting_problem(p_key text, p_value jsonb) returns text language plpgsql immutable as $$
declare
  n numeric;
begin
  if p_key like 'learning.%' or p_key = 'trial.days' then
    if jsonb_typeof(p_value) <> 'number' then return 'enter a whole number'; end if;
    n := (p_value #>> '{}')::numeric;
    if n <> trunc(n) then return 'enter a whole number'; end if;
    return case p_key
      when 'learning.freeze_goal_days' then case when n between 1 and 7 then null else 'goal days must be 1 to 7' end
      when 'learning.freeze_max' then case when n between 0 and 5 then null else 'freezes must be 0 to 5' end
      when 'learning.max_mastery_misses' then case when n between 1 and 5 then null else 'misses must be 1 to 5' end
      when 'learning.variants_per_skill' then case when n between 1 and 4 then null else 'variants must be 1 to 4' end
      when 'learning.review_after_days' then case when n between 1 and 30 then null else 'review after 1 to 30 days' end
      when 'learning.miss_retry_days' then case when n between 1 and 14 then null else 'retry after 1 to 14 days' end
      when 'trial.days' then case when n in (3, 7, 14) then null else 'a trial is 3, 7 or 14 days' end
      else 'unknown setting' end;
  end if;
  if p_key = 'access.maintenance' then return case when jsonb_typeof(p_value) = 'boolean' then null else 'on or off' end; end if;
  if p_key = 'access.coming_soon' then return case when jsonb_typeof(p_value) in ('boolean', 'null') then null else 'on, off or follow Cloudflare' end; end if;
  if p_key = 'access.maintenance_message' then
    if jsonb_typeof(p_value) <> 'object' or char_length(coalesce(trim(p_value ->> 'en'), '')) < 3 or char_length(coalesce(trim(p_value ->> 'ar'), '')) < 3 then
      return 'write the message in English and Arabic';
    end if;
    if char_length(p_value ->> 'en') > 300 or char_length(p_value ->> 'ar') > 300 then return 'keep each message under 300 characters'; end if;
    return null;
  end if;
  return 'unknown setting';
end $$;

-- Secrets the app needs but nobody reads back: the team password hash.
create table public.app_secrets (
  key text primary key,
  value text not null,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;
alter table public.app_secrets enable row level security;
revoke all on public.app_settings, public.app_secrets from public, anon, authenticated;
grant select, insert, update, delete on public.app_settings, public.app_secrets to service_role;
-- 0016 let learners read flags; the new columns say who changed them, which learners do not need.
revoke select on public.app_flags from authenticated;
grant select (key, enabled) on public.app_flags to authenticated;

-- ───────── what the app reads ─────────

-- Flags and settings, no secrets. Cheap; the app and the middleware keep it for a minute.
create function public.app_config() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'flags', coalesce((select jsonb_object_agg(key, enabled) from public.app_flags), '{}'),
    'settings', coalesce((select jsonb_object_agg(key, value) from public.app_settings), '{}'),
    'team_password_set', exists (select 1 from public.app_secrets where key = 'team_password'))
$$;
revoke all on function public.app_config() from public;
grant execute on function public.app_config() to anon, authenticated, service_role;

-- The team password hash, for the team password check. Service role only.
create function public.app_team_password() returns text language sql stable security definer set search_path = public as $$
  select value from public.app_secrets where key = 'team_password'
$$;
revoke all on function public.app_team_password() from public, anon, authenticated;
grant execute on function public.app_team_password() to service_role;

-- ───────── panel functions ─────────

create function public.admin_set_flag(p_actor uuid, p_key text, p_enabled boolean, p_reason text, p_ip text, p_ua text, p_session uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  f public.app_flags;
begin
  perform public.admin_require(p_actor, 'settings.flags');
  if char_length(coalesce(trim(p_reason), '')) < 3 then raise exception 'write a reason of at least 3 characters' using errcode = '22023'; end if;
  select * into f from public.app_flags where key = p_key for update;
  if f.key is null then raise exception 'unknown flag' using errcode = '22023'; end if;
  if f.enabled = p_enabled then return; end if;
  update public.app_flags set enabled = p_enabled, updated_at = now(), updated_by = p_actor where key = p_key;
  perform public.admin_log(p_actor, 'settings.flag_changed', 'settings', 'flag', p_key, coalesce(f.label, p_key),
    jsonb_build_object('enabled', f.enabled), jsonb_build_object('enabled', p_enabled), p_reason, p_ip, p_ua, p_session);
end $$;

-- Learning rules and the trial length need settings.rules; access settings need settings.access.
create function public.admin_set_setting(p_actor uuid, p_key text, p_value jsonb, p_reason text, p_ip text, p_ua text, p_session uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_old jsonb;
  v_problem text;
begin
  perform public.admin_require(p_actor, case when p_key like 'access.%' then 'settings.access' else 'settings.rules' end);
  if char_length(coalesce(trim(p_reason), '')) < 3 then raise exception 'write a reason of at least 3 characters' using errcode = '22023'; end if;
  v_problem := public.app_setting_problem(p_key, p_value);
  if v_problem is not null then raise exception '%', v_problem using errcode = '22023'; end if;
  select value into v_old from public.app_settings where key = p_key for update;
  if v_old = p_value then return; end if;
  insert into public.app_settings (key, value, updated_by, updated_at) values (p_key, p_value, p_actor, now())
    on conflict (key) do update set value = excluded.value, updated_by = p_actor, updated_at = now();
  perform public.admin_log(p_actor, 'settings.changed', 'settings', 'setting', p_key, p_key,
    jsonb_build_object('value', v_old), jsonb_build_object('value', p_value), p_reason, p_ip, p_ua, p_session);
end $$;

-- Replaces the team password. The app sends only the hash ("pbkdf2$<iterations>$<salt>$<hash>"); every team pass made
-- with the old password stops working, because passes are signed with a key made from the hash.
create function public.admin_set_team_password(p_actor uuid, p_hash text, p_reason text, p_ip text, p_ua text, p_session uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_require(p_actor, 'settings.access');
  if char_length(coalesce(trim(p_reason), '')) < 3 then raise exception 'write a reason of at least 3 characters' using errcode = '22023'; end if;
  if p_hash !~ '^pbkdf2\$[0-9]{5,7}\$[0-9a-f]{32}\$[0-9a-f]{64}$' then raise exception 'not a password hash' using errcode = '22023'; end if;
  insert into public.app_secrets (key, value, updated_by, updated_at) values ('team_password', p_hash, p_actor, now())
    on conflict (key) do update set value = excluded.value, updated_by = p_actor, updated_at = now();
  perform public.admin_log(p_actor, 'settings.team_password_replaced', 'settings', 'setting', 'access.team_password', 'Team password',
    null, null, p_reason, p_ip, p_ua, p_session);
end $$;

revoke all on function public.admin_set_flag(uuid, text, boolean, text, text, text, uuid),
  public.admin_set_setting(uuid, text, jsonb, text, text, text, uuid),
  public.admin_set_team_password(uuid, text, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.admin_set_flag(uuid, text, boolean, text, text, text, uuid),
  public.admin_set_setting(uuid, text, jsonb, text, text, text, uuid),
  public.admin_set_team_password(uuid, text, text, text, text, uuid) to service_role;
