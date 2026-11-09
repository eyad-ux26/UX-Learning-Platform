-- 0044: admin panel Phase 1, access and audit (docs/admin/README.md).
-- Who can use the panel, with which roles and permissions, their panel sessions, second-person approvals, team notes on
-- learners and the append-only audit log.
--
-- Rules kept here, in the database, so no app bug can break them:
--   * Every admin table is service role only (RLS on, no policies). The app checks the admin's permissions first
--     (apps/web/lib/admin/guard.ts), then the functions below check them again before they change anything.
--   * The audit log cannot be changed or emptied by anyone, the service role included.
--   * The founding super admin cannot lose super admin or be suspended. The last active super admin cannot be removed.
--   * Super admin is only given by a grant that waited its 24 hours (or the founding bootstrap at the end of this file).
--   * Nobody changes their own roles or decides their own approval request.

-- ───────── permissions and roles ─────────

-- Every permission the panel knows. The list matches PERMISSIONS in apps/web/lib/admin/permissions.ts (a test checks it).
create table public.admin_permission_keys (
  key text primary key check (key ~ '^[a-z]+(\.[a-z_]+)+$'),
  area text not null,
  label text not null
);

create table public.admin_roles (
  id text primary key check (id ~ '^[a-z][a-z0-9_]{1,40}$'),
  name text not null check (char_length(name) between 2 and 60),
  description text not null default '',
  builtin boolean not null default false,
  permissions text[] not null default '{}',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A role only holds known permissions, and only the server's migrations change a built-in role.
create function public.admin_roles_check() returns trigger language plpgsql set search_path = public as $$
begin
  if exists (select 1 from unnest(new.permissions) p where p not in (select key from public.admin_permission_keys)) then
    raise exception 'admin_roles: unknown permission' using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' and old.builtin and current_setting('ug.builtin_roles', true) is distinct from 'on' then
    raise exception 'admin_roles: built-in roles are read only' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' and new.builtin and current_setting('ug.builtin_roles', true) is distinct from 'on' then
    raise exception 'admin_roles: built-in roles come from migrations' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' and not new.builtin and 'team.super' = any (new.permissions) then
    raise exception 'admin_roles: a custom role cannot manage super admins' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and not new.builtin and 'team.super' = any (new.permissions) then
    raise exception 'admin_roles: a custom role cannot manage super admins' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger admin_roles_check before insert or update on public.admin_roles for each row execute function public.admin_roles_check();

create function public.admin_roles_no_delete_builtin() returns trigger language plpgsql set search_path = public as $$
begin
  if old.builtin then raise exception 'admin_roles: built-in roles cannot be deleted' using errcode = '42501'; end if;
  return old;
end $$;
create trigger admin_roles_no_delete_builtin before delete on public.admin_roles for each row execute function public.admin_roles_no_delete_builtin();

-- ───────── team members ─────────

create table public.admin_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  status text not null default 'active' check (status in ('active', 'suspended')),
  founding boolean not null default false,
  invited_by uuid references auth.users (id) on delete set null,
  joined_at timestamptz not null default now(),
  suspended_at timestamptz,
  last_sign_in_at timestamptz,
  last_sign_in_where text
);
create unique index admin_members_one_founding on public.admin_members (founding) where founding;
create unique index admin_members_email on public.admin_members (lower(email));

create table public.admin_member_roles (
  user_id uuid not null references public.admin_members (user_id) on delete cascade,
  role_id text not null references public.admin_roles (id) on delete cascade,
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role_id)
);
create index admin_member_roles_role on public.admin_member_roles (role_id);

-- The founding super admin keeps super admin and stays active; the panel always keeps one active super admin.
create function public.admin_member_roles_guard() returns trigger language plpgsql set search_path = public as $$
declare
  v_left integer;
begin
  if tg_op = 'INSERT' then
    if new.role_id = 'super_admin' and current_setting('ug.allow_super', true) is distinct from 'on' then
      raise exception 'super admin is given only by a grant that waited 24 hours' using errcode = '42501';
    end if;
    return new;
  end if;
  -- DELETE or UPDATE of a super admin row
  if old.role_id = 'super_admin' and (tg_op = 'DELETE' or new.role_id <> 'super_admin' or new.user_id <> old.user_id) then
    if exists (select 1 from public.admin_members m where m.user_id = old.user_id and m.founding)
       and current_setting('ug.member_delete', true) is distinct from 'on' then
      raise exception 'the founding super admin cannot lose super admin' using errcode = '42501';
    end if;
    select count(*) into v_left from public.admin_member_roles r join public.admin_members m using (user_id)
      where r.role_id = 'super_admin' and m.status = 'active' and r.user_id <> old.user_id;
    if v_left = 0 and current_setting('ug.member_delete', true) is distinct from 'on' then
      raise exception 'the last active super admin cannot be removed' using errcode = '42501';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger admin_member_roles_guard before insert or update or delete on public.admin_member_roles
  for each row execute function public.admin_member_roles_guard();

create function public.admin_members_guard() returns trigger language plpgsql set search_path = public as $$
declare
  v_left integer;
begin
  if tg_op = 'DELETE' then
    if old.founding and current_setting('ug.member_delete', true) is distinct from 'on' then
      raise exception 'the founding super admin cannot be removed' using errcode = '42501';
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' then
    if old.founding <> new.founding and current_setting('ug.allow_super', true) is distinct from 'on' then
      raise exception 'founding is set once' using errcode = '42501';
    end if;
    if new.status = 'suspended' and old.status = 'active' then
      if old.founding then raise exception 'the founding super admin cannot be suspended' using errcode = '42501'; end if;
      select count(*) into v_left from public.admin_member_roles r join public.admin_members m using (user_id)
        where r.role_id = 'super_admin' and m.status = 'active' and r.user_id <> old.user_id;
      if v_left = 0 and exists (select 1 from public.admin_member_roles r where r.user_id = old.user_id and r.role_id = 'super_admin') then
        raise exception 'the last active super admin cannot be suspended' using errcode = '42501';
      end if;
      new.suspended_at := now();
      -- Suspending ends every panel session at once.
      update public.admin_sessions set ended_at = now(), end_reason = 'suspended' where user_id = old.user_id and ended_at is null;
    elsif new.status = 'active' and old.status = 'suspended' then
      new.suspended_at := null;
    end if;
  end if;
  if tg_op = 'INSERT' and new.founding and current_setting('ug.allow_super', true) is distinct from 'on' then
    raise exception 'founding is set once' using errcode = '42501';
  end if;
  return new;
end $$;

-- ───────── panel sessions ─────────

-- One row per Supabase session (the session_id claim) that opened the panel after two-step sign-in. A session ends after
-- 30 minutes idle or 12 hours in total, when the admin signs out, signs out everywhere or is suspended. An ended
-- session never opens again: the admin signs in again, which makes a new Supabase session.
create table public.admin_sessions (
  session_id uuid primary key,
  user_id uuid not null references public.admin_members (user_id) on delete cascade,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  end_reason text check (end_reason in ('idle', 'total', 'signout', 'everywhere', 'suspended', 'removed')),
  ip text,
  user_agent text,
  revealed_at timestamptz,          -- personal data reveal asked a reason in this session
  view_as jsonb                     -- {"user": uuid, "until": timestamptz} while viewing as a learner
);
create index admin_sessions_user on public.admin_sessions (user_id, started_at desc);

create trigger admin_members_guard before insert or update or delete on public.admin_members
  for each row execute function public.admin_members_guard();

-- ───────── invites ─────────

create table public.admin_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email) and email like '%@%'),
  roles text[] not null check (cardinality(roles) between 1 and 10 and not ('super_admin' = any (roles))),
  token_hash text not null unique,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '72 hours',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  cancelled_at timestamptz,
  sent_count integer not null default 1
);
create unique index admin_invites_open on public.admin_invites (email) where accepted_at is null and cancelled_at is null;

-- ───────── super admin grants ─────────

create table public.super_admin_grants (
  id uuid primary key default gen_random_uuid(),
  target uuid not null references public.admin_members (user_id) on delete cascade,
  granted_by uuid not null references auth.users (id),
  reason text not null check (char_length(reason) between 3 and 500),
  created_at timestamptz not null default now(),
  effective_at timestamptz not null default now() + interval '24 hours',
  status text not null default 'pending' check (status in ('pending', 'active', 'cancelled')),
  decided_by uuid references auth.users (id),
  decided_at timestamptz
);
create unique index super_admin_grants_one_pending on public.super_admin_grants (target) where status = 'pending';

-- ───────── approvals (four eyes) ─────────

create table public.admin_approvals (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('refund', 'price', 'email', 'publish', 'super_admin')),
  permission text not null references public.admin_permission_keys (key),  -- what the approver needs
  title text not null,
  detail jsonb not null default '{}',     -- before/after and the facts the approver sees
  target_type text,
  target_id text,
  reason text not null check (char_length(reason) between 3 and 1000),
  requested_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  status text not null default 'waiting' check (status in ('waiting', 'approved', 'declined', 'cancelled', 'failed')),
  decided_by uuid references auth.users (id),
  decided_at timestamptz,
  note text,
  reminded_at timestamptz
);
create index admin_approvals_waiting on public.admin_approvals (status, created_at);
create unique index admin_approvals_one_open on public.admin_approvals (kind, target_type, target_id) where status = 'waiting';

create function public.admin_approvals_guard() returns trigger language plpgsql set search_path = public as $$
begin
  if old.status <> 'waiting' and new.status is distinct from old.status and not (old.status = 'approved' and new.status = 'failed') then
    raise exception 'approval already decided' using errcode = '42501';
  end if;
  if new.decided_by is not null and new.decided_by = old.requested_by then
    raise exception 'nobody approves their own request' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger admin_approvals_guard before update on public.admin_approvals for each row execute function public.admin_approvals_guard();

-- ───────── team notes on learners ─────────

create table public.learner_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  body text not null check (char_length(body) between 1 and 4000),
  mentions uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index learner_notes_user on public.learner_notes (user_id, created_at desc);

-- ───────── audit log ─────────

create table public.admin_audit (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid,                     -- kept when the account goes: the name and email below stay too
  actor_email text,
  actor_roles text[] not null default '{}',
  action text not null check (action ~ '^[a-z_]+\.[a-z_.]+$'),
  area text not null,
  target_type text,
  target_id text,
  target_label text,
  before jsonb,
  after jsonb,
  reason text,
  ip text,
  user_agent text,
  session_id uuid
);
create index admin_audit_at on public.admin_audit (at desc);
create index admin_audit_actor on public.admin_audit (actor_id, at desc);
create index admin_audit_target on public.admin_audit (target_type, target_id, at desc);
create index admin_audit_area on public.admin_audit (area, at desc);

create function public.admin_audit_append_only() returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'the audit log is append-only' using errcode = '42501';
end $$;
create trigger admin_audit_no_update before update or delete on public.admin_audit
  for each row execute function public.admin_audit_append_only();
create trigger admin_audit_no_truncate before truncate on public.admin_audit
  for each statement execute function public.admin_audit_append_only();

-- ───────── sign-in pause ─────────

-- Failed admin sign-ins per address and per email: 5 in 15 minutes pauses sign-in for the rest of the 15 minutes.
create table public.admin_signin_tries (
  bucket text primary key,
  window_start timestamptz not null default now(),
  hits integer not null default 0
);

-- Counts one failed try in each bucket. Answers true while every bucket is within the limit.
create function public.admin_signin_fail(p_buckets text[], p_limit integer default 5, p_window_seconds integer default 900)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  b text;
  v integer;
  ok boolean := true;
begin
  foreach b in array p_buckets loop
    insert into public.admin_signin_tries as t (bucket, window_start, hits) values (b, now(), 1)
    on conflict (bucket) do update
      set hits = case when t.window_start <= now() - make_interval(secs => p_window_seconds) then 1 else t.hits + 1 end,
          window_start = case when t.window_start <= now() - make_interval(secs => p_window_seconds) then now() else t.window_start end
    returning hits into v;
    if v > p_limit then ok := false; end if;
  end loop;
  return ok;
end $$;

-- True while any of these buckets is paused.
create function public.admin_signin_paused(p_buckets text[], p_limit integer default 5, p_window_seconds integer default 900)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_signin_tries t where t.bucket = any (p_buckets) and t.hits >= p_limit
                 and t.window_start > now() - make_interval(secs => p_window_seconds))
$$;

alter table public.admin_signin_tries enable row level security;
revoke all on public.admin_signin_tries from public, anon, authenticated;
grant select, insert, update, delete on public.admin_signin_tries to service_role;
revoke all on function public.admin_signin_fail(text[], integer, integer), public.admin_signin_paused(text[], integer, integer) from public, anon, authenticated;
grant execute on function public.admin_signin_fail(text[], integer, integer), public.admin_signin_paused(text[], integer, integer) to service_role;

-- ───────── row-level security: service role only ─────────

alter table public.admin_permission_keys enable row level security;
alter table public.admin_roles enable row level security;
alter table public.admin_members enable row level security;
alter table public.admin_member_roles enable row level security;
alter table public.admin_sessions enable row level security;
alter table public.admin_invites enable row level security;
alter table public.super_admin_grants enable row level security;
alter table public.admin_approvals enable row level security;
alter table public.learner_notes enable row level security;
alter table public.admin_audit enable row level security;
revoke all on public.admin_permission_keys, public.admin_roles, public.admin_members, public.admin_member_roles,
  public.admin_sessions, public.admin_invites, public.super_admin_grants, public.admin_approvals, public.learner_notes,
  public.admin_audit from public, anon, authenticated;
grant select, insert, update, delete on public.admin_permission_keys, public.admin_roles, public.admin_members,
  public.admin_member_roles, public.admin_sessions, public.admin_invites, public.super_admin_grants,
  public.admin_approvals, public.learner_notes to service_role;
-- The audit log: read and add only (the triggers refuse the rest anyway).
grant select, insert on public.admin_audit to service_role;

-- ───────── functions the panel calls (service role only) ─────────

-- The permissions an active member has right now, through all their roles. Empty for anyone else.
create function public.admin_perms(p_user uuid) returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct p order by p), '{}')
  from public.admin_members m
  join public.admin_member_roles mr on mr.user_id = m.user_id
  join public.admin_roles r on r.id = mr.role_id
  cross join lateral unnest(r.permissions) p
  where m.user_id = p_user and m.status = 'active'
$$;

create function public.admin_require(p_user uuid, p_perm text) returns void language plpgsql stable security definer set search_path = public as $$
begin
  if p_user is null or not (p_perm = any (public.admin_perms(p_user))) then
    raise exception 'admin permission % needed', p_perm using errcode = '42501';
  end if;
end $$;

-- Super admin grants whose 24 hours have passed become active. Cheap; the panel calls it when it loads a member.
create function public.admin_activate_super_grants() returns integer language plpgsql security definer set search_path = public as $$
declare
  g record;
  n integer := 0;
begin
  for g in select * from public.super_admin_grants where status = 'pending' and effective_at <= now() for update skip locked loop
    if exists (select 1 from public.admin_members m where m.user_id = g.target and m.status = 'active')
       and exists (select 1 from public.admin_members m join public.admin_member_roles r using (user_id)
                   where m.user_id = g.granted_by and m.status = 'active' and r.role_id = 'super_admin') then
      perform set_config('ug.allow_super', 'on', true);
      insert into public.admin_member_roles (user_id, role_id, granted_by) values (g.target, 'super_admin', g.granted_by) on conflict do nothing;
      perform set_config('ug.allow_super', 'off', true);
      update public.super_admin_grants set status = 'active', decided_at = now() where id = g.id;
      insert into public.admin_audit (actor_id, actor_email, action, area, target_type, target_id, target_label, before, after, reason)
        select g.granted_by, (select email from public.admin_members where user_id = g.granted_by), 'team.super_grant_active', 'team',
               'admin', g.target::text, (select email from public.admin_members where user_id = g.target),
               jsonb_build_object('super_admin', false), jsonb_build_object('super_admin', true), g.reason;
    else
      -- The target or the granting super admin is no longer active: the grant lapses.
      update public.super_admin_grants set status = 'cancelled', decided_at = now() where id = g.id;
      insert into public.admin_audit (action, area, target_type, target_id, reason)
        values ('team.super_grant_lapsed', 'team', 'admin', g.target::text, 'Target or granting super admin no longer active');
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Who this member is and what they can do, for the panel's guard. Also activates due super admin grants.
create function public.admin_context(p_user uuid)
returns table (user_id uuid, email text, display_name text, status text, founding boolean, roles text[], perms text[])
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.super_admin_grants g where g.status = 'pending' and g.effective_at <= now()) then
    perform public.admin_activate_super_grants();
  end if;
  return query
    select m.user_id, m.email, m.display_name, m.status, m.founding,
           coalesce((select array_agg(r.role_id order by r.role_id) from public.admin_member_roles r where r.user_id = m.user_id), '{}'),
           public.admin_perms(m.user_id)
    from public.admin_members m where m.user_id = p_user;
end $$;

-- One audit entry. The actor's email and roles are read here, at the time of the action.
create function public.admin_log(p_actor uuid, p_action text, p_area text, p_target_type text, p_target_id text, p_target_label text,
  p_before jsonb, p_after jsonb, p_reason text, p_ip text, p_ua text, p_session uuid)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_id bigint;
begin
  insert into public.admin_audit (actor_id, actor_email, actor_roles, action, area, target_type, target_id, target_label, before, after, reason, ip, user_agent, session_id)
  values (p_actor, (select m.email from public.admin_members m where m.user_id = p_actor),
          coalesce((select array_agg(r.role_id order by r.role_id) from public.admin_member_roles r where r.user_id = p_actor), '{}'),
          p_action, p_area, p_target_type, p_target_id, left(p_target_label, 200), p_before, p_after, left(p_reason, 1000),
          left(p_ip, 64), left(p_ua, 300), p_session)
  returning id into v_id;
  return v_id;
end $$;

-- Opens or keeps a panel session. Answers 'ok', 'expired' (idle or total limit reached: ended now) or 'ended'.
create function public.admin_touch_session(p_session uuid, p_user uuid, p_ip text, p_ua text, p_idle_seconds integer default 1800, p_total_seconds integer default 43200)
returns text language plpgsql security definer set search_path = public as $$
declare
  s public.admin_sessions;
  v_new boolean := false;
begin
  select * into s from public.admin_sessions where session_id = p_session for update;
  if not found then
    insert into public.admin_sessions (session_id, user_id, ip, user_agent) values (p_session, p_user, left(p_ip, 64), left(p_ua, 300)) returning * into s;
    v_new := true;
  end if;
  if s.user_id <> p_user or s.ended_at is not null then return 'ended'; end if;
  if s.started_at <= now() - make_interval(secs => p_total_seconds) then
    update public.admin_sessions set ended_at = now(), end_reason = 'total' where session_id = p_session;
    return 'expired';
  end if;
  if s.last_seen_at <= now() - make_interval(secs => p_idle_seconds) then
    update public.admin_sessions set ended_at = now(), end_reason = 'idle' where session_id = p_session;
    return 'expired';
  end if;
  update public.admin_sessions set last_seen_at = now() where session_id = p_session;
  if v_new then
    update public.admin_members set last_sign_in_at = now() where user_id = p_user;
    perform public.admin_log(p_user, 'auth.sign_in', 'auth', 'session', p_session::text, null, null, null, null, p_ip, p_ua, p_session);
  end if;
  return 'ok';
end $$;

-- Changes a member's roles (never super admin: that has its own grant). The actor needs team.invite, and team.roles for a
-- custom role; nobody changes their own roles.
create function public.admin_set_roles(p_actor uuid, p_target uuid, p_roles text[], p_reason text, p_ip text, p_ua text, p_session uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_before text[];
  v_after text[];
  v_keep_super boolean;
begin
  perform public.admin_require(p_actor, 'team.invite');
  if p_actor = p_target then raise exception 'nobody changes their own roles' using errcode = '42501'; end if;
  if 'super_admin' = any (p_roles) then raise exception 'super admin has its own grant' using errcode = '42501'; end if;
  if exists (select 1 from unnest(p_roles) r where r not in (select id from public.admin_roles)) then
    raise exception 'unknown role' using errcode = '22023';
  end if;
  if exists (select 1 from public.admin_roles r where r.id = any (p_roles) and not r.builtin) and not ('team.roles' = any (public.admin_perms(p_actor))) then
    raise exception 'admin permission team.roles needed for custom roles' using errcode = '42501';
  end if;
  select coalesce(array_agg(role_id order by role_id), '{}') into v_before from public.admin_member_roles where user_id = p_target;
  if not exists (select 1 from public.admin_members where user_id = p_target) then raise exception 'not a team member' using errcode = '22023'; end if;
  -- A member who is a super admin keeps it here; removing super admin is admin_remove_super.
  v_keep_super := 'super_admin' = any (v_before);
  -- Changing a super admin's other roles needs team.super.
  if v_keep_super and not ('team.super' = any (public.admin_perms(p_actor))) then
    raise exception 'admin permission team.super needed' using errcode = '42501';
  end if;
  delete from public.admin_member_roles where user_id = p_target and role_id <> 'super_admin' and not (role_id = any (p_roles));
  insert into public.admin_member_roles (user_id, role_id, granted_by) select p_target, r, p_actor from unnest(p_roles) r on conflict do nothing;
  select coalesce(array_agg(role_id order by role_id), '{}') into v_after from public.admin_member_roles where user_id = p_target;
  perform public.admin_log(p_actor, 'team.roles_changed', 'team', 'admin', p_target::text, (select email from public.admin_members where user_id = p_target),
    jsonb_build_object('roles', v_before), jsonb_build_object('roles', v_after), p_reason, p_ip, p_ua, p_session);
end $$;

-- Suspends or restores a member. Suspending ends their panel sessions (admin_members_guard).
create function public.admin_set_status(p_actor uuid, p_target uuid, p_status text, p_reason text, p_ip text, p_ua text, p_session uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_before text;
begin
  perform public.admin_require(p_actor, 'team.invite');
  if p_actor = p_target then raise exception 'nobody suspends themselves' using errcode = '42501'; end if;
  if exists (select 1 from public.admin_member_roles where user_id = p_target and role_id = 'super_admin')
     and not ('team.super' = any (public.admin_perms(p_actor))) then
    raise exception 'admin permission team.super needed' using errcode = '42501';
  end if;
  select status into v_before from public.admin_members where user_id = p_target for update;
  if not found then raise exception 'not a team member' using errcode = '22023'; end if;
  update public.admin_members set status = p_status where user_id = p_target;
  perform public.admin_log(p_actor, case when p_status = 'suspended' then 'team.suspended' else 'team.unsuspended' end, 'team', 'admin', p_target::text,
    (select email from public.admin_members where user_id = p_target), jsonb_build_object('status', v_before), jsonb_build_object('status', p_status), p_reason, p_ip, p_ua, p_session);
end $$;

-- Removes a member from the team (their account stays a learner account; the audit log keeps their name).
create function public.admin_remove_member(p_actor uuid, p_target uuid, p_reason text, p_ip text, p_ua text, p_session uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  m public.admin_members;
  v_roles text[];
begin
  perform public.admin_require(p_actor, 'team.invite');
  if p_actor = p_target then raise exception 'nobody removes themselves' using errcode = '42501'; end if;
  select * into m from public.admin_members where user_id = p_target for update;
  if not found then raise exception 'not a team member' using errcode = '22023'; end if;
  if m.founding then raise exception 'the founding super admin cannot be removed' using errcode = '42501'; end if;
  select coalesce(array_agg(role_id order by role_id), '{}') into v_roles from public.admin_member_roles where user_id = p_target;
  if 'super_admin' = any (v_roles) then raise exception 'remove super admin first' using errcode = '42501'; end if;
  update public.admin_sessions set ended_at = now(), end_reason = 'removed' where user_id = p_target and ended_at is null;
  delete from public.admin_members where user_id = p_target;
  perform public.admin_log(p_actor, 'team.removed', 'team', 'admin', p_target::text, m.email,
    jsonb_build_object('roles', v_roles, 'status', m.status), null, p_reason, p_ip, p_ua, p_session);
end $$;

-- Asks for super admin for another active member. Takes effect after 24 hours unless a super admin cancels it.
-- The app checks the target's two-step sign-in and the actor's fresh re-authentication before calling this.
create function public.admin_request_super(p_actor uuid, p_target uuid, p_reason text, p_ip text, p_ua text, p_session uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  perform public.admin_require(p_actor, 'team.super');
  if p_actor = p_target then raise exception 'nobody changes their own roles' using errcode = '42501'; end if;
  if not exists (select 1 from public.admin_members where user_id = p_target and status = 'active') then
    raise exception 'only an active team member can become super admin' using errcode = '22023';
  end if;
  if exists (select 1 from public.admin_member_roles where user_id = p_target and role_id = 'super_admin') then
    raise exception 'already a super admin' using errcode = '22023';
  end if;
  insert into public.super_admin_grants (target, granted_by, reason) values (p_target, p_actor, p_reason) returning id into v_id;
  perform public.admin_log(p_actor, 'team.super_grant_requested', 'team', 'admin', p_target::text, (select email from public.admin_members where user_id = p_target),
    jsonb_build_object('super_admin', false), jsonb_build_object('super_admin', 'pending', 'effective_at', now() + interval '24 hours'), p_reason, p_ip, p_ua, p_session);
  return v_id;
end $$;

create function public.admin_cancel_super(p_actor uuid, p_grant uuid, p_reason text, p_ip text, p_ua text, p_session uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  g public.super_admin_grants;
begin
  perform public.admin_require(p_actor, 'team.super');
  select * into g from public.super_admin_grants where id = p_grant and status = 'pending' for update;
  if not found then raise exception 'no pending grant' using errcode = '22023'; end if;
  update public.super_admin_grants set status = 'cancelled', decided_by = p_actor, decided_at = now() where id = p_grant;
  perform public.admin_log(p_actor, 'team.super_grant_cancelled', 'team', 'admin', g.target::text, (select email from public.admin_members where user_id = g.target),
    jsonb_build_object('super_admin', 'pending'), jsonb_build_object('super_admin', false), p_reason, p_ip, p_ua, p_session);
end $$;

create function public.admin_remove_super(p_actor uuid, p_target uuid, p_reason text, p_ip text, p_ua text, p_session uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_require(p_actor, 'team.super');
  if p_actor = p_target then raise exception 'nobody changes their own roles' using errcode = '42501'; end if;
  delete from public.admin_member_roles where user_id = p_target and role_id = 'super_admin'; -- the guard keeps the founding and the last one
  if not found then raise exception 'not a super admin' using errcode = '22023'; end if;
  perform public.admin_log(p_actor, 'team.super_removed', 'team', 'admin', p_target::text, (select email from public.admin_members where user_id = p_target),
    jsonb_build_object('super_admin', true), jsonb_build_object('super_admin', false), p_reason, p_ip, p_ua, p_session);
end $$;

-- Creates or replaces an open invite (the email gets a new link; the old one stops working).
create function public.admin_invite(p_actor uuid, p_email text, p_roles text[], p_token_hash text, p_ip text, p_ua text, p_session uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_email text := lower(trim(p_email));
begin
  perform public.admin_require(p_actor, 'team.invite');
  if 'super_admin' = any (p_roles) then raise exception 'super admin has its own grant' using errcode = '42501'; end if;
  if exists (select 1 from unnest(p_roles) r where r not in (select id from public.admin_roles)) then raise exception 'unknown role' using errcode = '22023'; end if;
  if exists (select 1 from public.admin_roles r where r.id = any (p_roles) and not r.builtin) and not ('team.roles' = any (public.admin_perms(p_actor))) then
    raise exception 'admin permission team.roles needed for custom roles' using errcode = '42501';
  end if;
  if exists (select 1 from public.admin_members where lower(email) = v_email) then raise exception 'already a team member' using errcode = '22023'; end if;
  update public.admin_invites set cancelled_at = now() where email = v_email and accepted_at is null and cancelled_at is null;
  insert into public.admin_invites (email, roles, token_hash, invited_by) values (v_email, p_roles, p_token_hash, p_actor) returning id into v_id;
  perform public.admin_log(p_actor, 'team.invited', 'team', 'invite', v_id::text, v_email, null, jsonb_build_object('roles', p_roles), null, p_ip, p_ua, p_session);
  return v_id;
end $$;

create function public.admin_cancel_invite(p_actor uuid, p_invite uuid, p_ip text, p_ua text, p_session uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  i public.admin_invites;
begin
  perform public.admin_require(p_actor, 'team.invite');
  update public.admin_invites set cancelled_at = now() where id = p_invite and accepted_at is null and cancelled_at is null returning * into i;
  if not found then raise exception 'no open invite' using errcode = '22023'; end if;
  perform public.admin_log(p_actor, 'team.invite_cancelled', 'team', 'invite', p_invite::text, i.email, jsonb_build_object('roles', i.roles), null, null, p_ip, p_ua, p_session);
end $$;

-- Accepts an invite: only the person signed in with that exact email, within 72 hours.
create function public.admin_accept_invite(p_user uuid, p_email text, p_token_hash text, p_name text, p_ip text, p_ua text)
returns text[] language plpgsql security definer set search_path = public as $$
declare
  i public.admin_invites;
begin
  select * into i from public.admin_invites where token_hash = p_token_hash for update;
  if not found or i.accepted_at is not null or i.cancelled_at is not null then raise exception 'invite not found' using errcode = '22023'; end if;
  if i.expires_at <= now() then raise exception 'invite expired' using errcode = '22023'; end if;
  if i.email <> lower(trim(p_email)) then raise exception 'invite is for another email' using errcode = '42501'; end if;
  if exists (select 1 from public.admin_members where user_id = p_user) then raise exception 'already a team member' using errcode = '22023'; end if;
  insert into public.admin_members (user_id, email, display_name, invited_by) values (p_user, i.email, left(p_name, 80), i.invited_by);
  insert into public.admin_member_roles (user_id, role_id, granted_by) select p_user, r, i.invited_by from unnest(i.roles) r where r in (select id from public.admin_roles);
  update public.admin_invites set accepted_at = now(), accepted_by = p_user where id = i.id;
  perform public.admin_log(p_user, 'team.invite_accepted', 'team', 'admin', p_user::text, i.email, null, jsonb_build_object('roles', i.roles), null, p_ip, p_ua, null);
  return i.roles;
end $$;

-- Asks a second person. The approver needs p_permission and cannot be the one asking (admin_approvals_guard).
create function public.admin_request_approval(p_actor uuid, p_kind text, p_permission text, p_title text, p_detail jsonb, p_target_type text, p_target_id text,
  p_reason text, p_ip text, p_ua text, p_session uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if cardinality(public.admin_perms(p_actor)) = 0 then raise exception 'not an active team member' using errcode = '42501'; end if;
  insert into public.admin_approvals (kind, permission, title, detail, target_type, target_id, reason, requested_by)
  values (p_kind, p_permission, p_title, coalesce(p_detail, '{}'), p_target_type, p_target_id, p_reason, p_actor) returning id into v_id;
  perform public.admin_log(p_actor, 'approval.requested', 'approvals', p_target_type, p_target_id, p_title, null, jsonb_build_object('approval', v_id, 'kind', p_kind, 'detail', p_detail), p_reason, p_ip, p_ua, p_session);
  return v_id;
end $$;

-- Approves or declines. The app carries out an approved request right after (a refund, for example) and marks it
-- 'failed' if the provider refuses.
create function public.admin_decide_approval(p_actor uuid, p_id uuid, p_decision text, p_note text, p_ip text, p_ua text, p_session uuid)
returns public.admin_approvals language plpgsql security definer set search_path = public as $$
declare
  a public.admin_approvals;
begin
  if p_decision not in ('approved', 'declined', 'cancelled') then raise exception 'bad decision' using errcode = '22023'; end if;
  select * into a from public.admin_approvals where id = p_id for update;
  if not found or a.status <> 'waiting' then raise exception 'approval not waiting' using errcode = '22023'; end if;
  if p_decision = 'cancelled' then
    if a.requested_by <> p_actor then raise exception 'only the person who asked can cancel' using errcode = '42501'; end if;
    update public.admin_approvals set status = 'cancelled', decided_at = now(), note = p_note where id = p_id returning * into a;
  else
    perform public.admin_require(p_actor, a.permission);
    if a.requested_by = p_actor then raise exception 'nobody approves their own request' using errcode = '42501'; end if;
    update public.admin_approvals set status = p_decision, decided_by = p_actor, decided_at = now(), note = p_note where id = p_id returning * into a;
  end if;
  perform public.admin_log(p_actor, 'approval.' || p_decision, 'approvals', a.target_type, a.target_id, a.title,
    jsonb_build_object('status', 'waiting'), jsonb_build_object('status', p_decision, 'approval', a.id), p_note, p_ip, p_ua, p_session);
  return a;
end $$;

revoke all on function public.admin_perms(uuid), public.admin_require(uuid, text), public.admin_activate_super_grants(), public.admin_context(uuid),
  public.admin_log(uuid, text, text, text, text, text, jsonb, jsonb, text, text, text, uuid),
  public.admin_touch_session(uuid, uuid, text, text, integer, integer),
  public.admin_set_roles(uuid, uuid, text[], text, text, text, uuid), public.admin_set_status(uuid, uuid, text, text, text, text, uuid),
  public.admin_remove_member(uuid, uuid, text, text, text, uuid), public.admin_request_super(uuid, uuid, text, text, text, uuid),
  public.admin_cancel_super(uuid, uuid, text, text, text, uuid), public.admin_remove_super(uuid, uuid, text, text, text, uuid),
  public.admin_invite(uuid, text, text[], text, text, text, uuid), public.admin_cancel_invite(uuid, uuid, text, text, uuid),
  public.admin_accept_invite(uuid, text, text, text, text, text),
  public.admin_request_approval(uuid, text, text, text, jsonb, text, text, text, text, text, uuid),
  public.admin_decide_approval(uuid, uuid, text, text, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.admin_perms(uuid), public.admin_require(uuid, text), public.admin_activate_super_grants(), public.admin_context(uuid),
  public.admin_log(uuid, text, text, text, text, text, jsonb, jsonb, text, text, text, uuid),
  public.admin_touch_session(uuid, uuid, text, text, integer, integer),
  public.admin_set_roles(uuid, uuid, text[], text, text, text, uuid), public.admin_set_status(uuid, uuid, text, text, text, text, uuid),
  public.admin_remove_member(uuid, uuid, text, text, text, uuid), public.admin_request_super(uuid, uuid, text, text, text, uuid),
  public.admin_cancel_super(uuid, uuid, text, text, text, uuid), public.admin_remove_super(uuid, uuid, text, text, text, uuid),
  public.admin_invite(uuid, text, text[], text, text, text, uuid), public.admin_cancel_invite(uuid, uuid, text, text, uuid),
  public.admin_accept_invite(uuid, text, text, text, text, text),
  public.admin_request_approval(uuid, text, text, text, jsonb, text, text, text, text, text, uuid),
  public.admin_decide_approval(uuid, uuid, text, text, text, text, uuid)
  to service_role;

-- ───────── seed: permissions and built-in roles ─────────
-- Generated from apps/web/lib/admin/permissions.ts (npm run admin:sql -w @uxgate/web prints this block). Keep both in step.
-- @@PERMISSIONS@@
insert into public.admin_permission_keys (key, area, label) values
  ('dashboard.view', 'overview', 'See the dashboard'),
  ('learners.view', 'learners', 'See learners and Learner 360'),
  ('learners.reveal', 'learners', 'Reveal masked personal data (asks a reason, logged)'),
  ('learners.act', 'learners', 'Support actions: resend emails, reset one lesson, add a freeze, Pro for up to 30 days'),
  ('learners.manage', 'learners', 'Change email, suspend, export data, delete an account'),
  ('learners.view_as', 'learners', 'View as learner (read only, logged)'),
  ('learners.notes', 'learners', 'Write team notes on a learner'),
  ('support.view', 'support', 'See the support inbox'),
  ('support.reply', 'support', 'Reply to tickets and change their status'),
  ('support.assign', 'support', 'Assign tickets to others'),
  ('support.macros', 'support', 'Create and edit macros'),
  ('support.settings', 'support', 'Change SLA targets, business hours and assignment'),
  ('appeals.view', 'support', 'See appeals and review requests'),
  ('appeals.decide', 'support', 'Accept or reject appeals'),
  ('subs.view', 'billing', 'See subscriptions'),
  ('payments.view', 'billing', 'See payments'),
  ('refunds.view', 'billing', 'See refund requests'),
  ('refunds.approve', 'billing', 'Refund up to the agent limit; larger refunds go to approval'),
  ('refunds.approve_any', 'billing', 'Refund any amount and approve large refunds'),
  ('comp.grant', 'billing', 'Give free Pro (comp) for any length'),
  ('problems.view', 'billing', 'See billing problems'),
  ('problems.retry', 'billing', 'Retry a webhook that failed'),
  ('revenue.view', 'billing', 'See revenue'),
  ('billing.export', 'billing', 'Export billing data for the accountant'),
  ('discounts.view', 'billing', 'See discount codes'),
  ('discounts.create', 'billing', 'Create discount codes'),
  ('discounts.edit', 'billing', 'Pause, resume and change discount codes'),
  ('students.review', 'billing', 'Review student checks'),
  ('prices.view', 'billing', 'See prices and plans'),
  ('certs.view', 'certificates', 'Find certificates'),
  ('certs.manage', 'certificates', 'Revoke and re-issue certificates'),
  ('team.view', 'team', 'See the team and roles'),
  ('team.invite', 'team', 'Invite, suspend and change the roles of team members (not super admins)'),
  ('team.roles', 'team', 'Create and edit custom roles'),
  ('team.super', 'team', 'Grant and remove super admin'),
  ('audit.view', 'audit', 'Read the whole audit log'),
  ('audit.area_support', 'audit', 'Read the audit log for learners and support'),
  ('audit.area_billing', 'audit', 'Read the audit log for billing'),
  ('audit.area_content', 'audit', 'Read the audit log for content'),
  ('audit.export', 'audit', 'Export the audit log'),
  ('testing.tools', 'testing', 'Team testing tools on their own learner account'),
  ('help.view', 'phase2', 'Help centre'),
  ('content.view', 'phase2', 'See content'),
  ('content.edit', 'phase2', 'Edit content drafts'),
  ('content.publish', 'phase2', 'Publish content'),
  ('media.view', 'phase2', 'Media library'),
  ('instructors.view', 'phase2', 'Instructors'),
  ('quality.view', 'phase2', 'Content quality'),
  ('releases.view', 'phase2', 'Releases'),
  ('reports.view', 'phase2', 'Reports'),
  ('comms.view', 'phase2', 'Communications'),
  ('settings.view', 'phase2', 'Platform settings'),
  ('health.view', 'phase2', 'System health')
on conflict (key) do update set area = excluded.area, label = excluded.label;
select set_config('ug.builtin_roles', 'on', false);
insert into public.admin_roles (id, name, description, builtin, permissions) values
  ('super_admin', 'Super admin', 'Founders. Everything, including super admins and the audit log export.', true, array['dashboard.view', 'learners.view', 'learners.reveal', 'learners.act', 'learners.manage', 'learners.view_as', 'learners.notes', 'support.view', 'support.reply', 'support.assign', 'support.macros', 'support.settings', 'appeals.view', 'appeals.decide', 'subs.view', 'payments.view', 'refunds.view', 'refunds.approve', 'refunds.approve_any', 'comp.grant', 'problems.view', 'problems.retry', 'revenue.view', 'billing.export', 'discounts.view', 'discounts.create', 'discounts.edit', 'students.review', 'prices.view', 'certs.view', 'certs.manage', 'team.view', 'team.invite', 'team.roles', 'team.super', 'audit.view', 'audit.area_support', 'audit.area_billing', 'audit.area_content', 'audit.export', 'testing.tools', 'help.view', 'content.view', 'content.edit', 'content.publish', 'media.view', 'instructors.view', 'quality.view', 'releases.view', 'reports.view', 'comms.view', 'settings.view', 'health.view']::text[]),
  ('admin', 'Admin', 'Operations lead. Everything except super admins and the audit log export.', true, array['dashboard.view', 'learners.view', 'learners.reveal', 'learners.act', 'learners.manage', 'learners.view_as', 'learners.notes', 'support.view', 'support.reply', 'support.assign', 'support.macros', 'support.settings', 'appeals.view', 'appeals.decide', 'subs.view', 'payments.view', 'refunds.view', 'refunds.approve', 'refunds.approve_any', 'comp.grant', 'problems.view', 'problems.retry', 'revenue.view', 'billing.export', 'discounts.view', 'discounts.create', 'discounts.edit', 'students.review', 'prices.view', 'certs.view', 'certs.manage', 'team.view', 'team.invite', 'team.roles', 'audit.view', 'audit.area_support', 'audit.area_billing', 'audit.area_content', 'testing.tools', 'help.view', 'content.view', 'content.edit', 'content.publish', 'media.view', 'instructors.view', 'quality.view', 'releases.view', 'reports.view', 'comms.view', 'settings.view', 'health.view']::text[]),
  ('support_lead', 'Support lead', 'Head of support. Support agent rights plus any refund, macros, SLA settings, assignment and support reports.', true, array['dashboard.view', 'learners.view', 'learners.reveal', 'learners.act', 'learners.manage', 'learners.view_as', 'learners.notes', 'support.view', 'support.reply', 'support.assign', 'support.macros', 'support.settings', 'appeals.view', 'appeals.decide', 'subs.view', 'payments.view', 'refunds.view', 'refunds.approve', 'refunds.approve_any', 'comp.grant', 'discounts.view', 'certs.view', 'certs.manage', 'audit.area_support', 'help.view', 'content.view', 'quality.view', 'reports.view']::text[]),
  ('support_agent', 'Support agent', 'Customer support. Learner 360, tickets, appeals, small refunds and Pro for up to 30 days.', true, array['dashboard.view', 'learners.view', 'learners.reveal', 'learners.act', 'learners.view_as', 'learners.notes', 'support.view', 'support.reply', 'appeals.view', 'appeals.decide', 'payments.view', 'refunds.view', 'refunds.approve', 'certs.view', 'content.view', 'quality.view']::text[]),
  ('billing_manager', 'Billing manager', 'Finance. Payments, subscriptions, refunds, discount codes, prices and revenue. No content.', true, array['dashboard.view', 'learners.view', 'learners.reveal', 'learners.notes', 'support.view', 'subs.view', 'payments.view', 'refunds.view', 'refunds.approve', 'refunds.approve_any', 'comp.grant', 'problems.view', 'problems.retry', 'revenue.view', 'billing.export', 'discounts.view', 'discounts.create', 'discounts.edit', 'students.review', 'prices.view', 'audit.area_billing', 'reports.view']::text[]),
  ('content_publisher', 'Content publisher', 'Content lead. Content editor rights plus review, publish and roll back (Phase 2).', true, array['dashboard.view', 'content.view', 'content.edit', 'content.publish', 'media.view', 'instructors.view', 'quality.view', 'releases.view', 'reports.view', 'audit.area_content']::text[]),
  ('content_editor', 'Content editor', 'Content team. Edit drafts of paths, lessons, skills, media and translations (Phase 2).', true, array['dashboard.view', 'content.view', 'content.edit', 'media.view', 'instructors.view', 'quality.view', 'releases.view', 'reports.view']::text[]),
  ('instructor', 'Instructor', 'Video instructors on hybrid paths. Their own profile and videos, stats for their paths (Phase 2).', true, array['dashboard.view', 'media.view', 'instructors.view', 'reports.view']::text[]),
  ('marketing', 'Marketing', 'Growth. Waitlist, announcements, campaigns (Phase 2) and creating discount codes. No personal data export.', true, array['dashboard.view', 'discounts.view', 'discounts.create', 'reports.view', 'comms.view']::text[]),
  ('analyst', 'Analyst', 'Reporting. Read only, with personal data always masked.', true, array['dashboard.view', 'learners.view', 'support.view', 'appeals.view', 'subs.view', 'payments.view', 'refunds.view', 'revenue.view', 'discounts.view', 'prices.view', 'certs.view', 'content.view', 'quality.view', 'reports.view', 'audit.view', 'health.view']::text[]),
  ('viewer', 'Viewer / QA tester', 'Team testing. Read-only views and the team testing tools on their own account only.', true, array['dashboard.view', 'content.view', 'testing.tools']::text[])
on conflict (id) do update set name = excluded.name, description = excluded.description, permissions = excluded.permissions;
select set_config('ug.builtin_roles', 'off', false);
-- @@END PERMISSIONS@@

-- ───────── founding super admin ─────────
-- uxgate8@gmail.com, the business account. If that account signs up after this migration runs, run this block again
-- (docs/admin/README.md). It does nothing once a founding member exists.
do $$
declare
  v_user uuid;
begin
  if exists (select 1 from public.admin_members where founding) then return; end if;
  select id into v_user from auth.users where lower(email) = 'uxgate8@gmail.com' limit 1;
  if v_user is null then return; end if;
  perform set_config('ug.allow_super', 'on', true);
  insert into public.admin_members (user_id, email, display_name, founding) values (v_user, 'uxgate8@gmail.com', 'UXGate', true)
    on conflict (user_id) do update set founding = true, status = 'active';
  insert into public.admin_member_roles (user_id, role_id) values (v_user, 'super_admin') on conflict do nothing;
  perform set_config('ug.allow_super', 'off', true);
  insert into public.admin_audit (actor_id, actor_email, action, area, target_type, target_id, target_label, after, reason)
    values (v_user, 'uxgate8@gmail.com', 'team.founding_set', 'team', 'admin', v_user::text, 'uxgate8@gmail.com', jsonb_build_object('super_admin', true), 'Migration 0044');
end $$;
