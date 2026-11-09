-- Admin panel Phase 1: fixes from security testing (QA round 1 on PR #242). Run after 0047.
--   * Custom roles: a member can only put permissions they hold themselves into a role, never edits or deletes a role
--     they hold, and only gives roles whose permissions they hold (invites and role changes). Custom roles are written
--     only through admin_save_role / admin_delete_role.
--   * admin_touch_session no longer fails when two first requests of a new session arrive together.
--   * Support email: whether the sender's domain was verified (DKIM, SPF or DMARC) is kept on each message and ticket.

-- ───────── roles ─────────

-- True when every permission of these roles is one the actor holds.
create function public.admin_roles_within(p_actor uuid, p_roles text[]) returns boolean language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.admin_roles r cross join lateral unnest(r.permissions) p
    where r.id = any (p_roles) and not (p = any (public.admin_perms(p_actor)))
  )
$$;

-- Custom roles change only inside admin_save_role and admin_delete_role (which set ug.role_write).
create or replace function public.admin_roles_write_guard() returns trigger language plpgsql set search_path = public as $$
begin
  if (case when tg_op = 'DELETE' then old.builtin else new.builtin end) then return coalesce(new, old); end if;
  if current_setting('ug.role_write', true) is distinct from 'on' then
    raise exception 'admin_roles: custom roles change through admin_save_role' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;
create trigger admin_roles_write_guard before insert or update or delete on public.admin_roles for each row execute function public.admin_roles_write_guard();

create function public.admin_save_role(p_actor uuid, p_id text, p_name text, p_description text, p_permissions text[], p_reason text,
  p_ip text, p_ua text, p_session uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_mine text[] := public.admin_perms(p_actor);
  v_before public.admin_roles;
  v_id text := p_id;
begin
  perform public.admin_require(p_actor, 'team.roles');
  if exists (select 1 from unnest(p_permissions) p where not (p = any (v_mine))) then
    raise exception 'a role can only hold permissions you have yourself' using errcode = '42501';
  end if;
  perform set_config('ug.role_write', 'on', true);
  if exists (select 1 from public.admin_roles where id = p_id) then
    select * into v_before from public.admin_roles where id = p_id for update;
    if v_before.builtin then raise exception 'built-in roles are read only' using errcode = '42501'; end if;
    if exists (select 1 from public.admin_member_roles where user_id = p_actor and role_id = p_id) then
      raise exception 'nobody changes a role they hold' using errcode = '42501';
    end if;
    update public.admin_roles set name = p_name, description = p_description, permissions = p_permissions where id = p_id;
    perform public.admin_log(p_actor, 'team.role_changed', 'team', 'role', p_id, p_name,
      jsonb_build_object('name', v_before.name, 'description', v_before.description, 'permissions', v_before.permissions),
      jsonb_build_object('name', p_name, 'description', p_description, 'permissions', p_permissions), p_reason, p_ip, p_ua, p_session);
  else
    insert into public.admin_roles (id, name, description, permissions, created_by) values (v_id, p_name, p_description, p_permissions, p_actor);
    perform public.admin_log(p_actor, 'team.role_created', 'team', 'role', v_id, p_name, null,
      jsonb_build_object('name', p_name, 'description', p_description, 'permissions', p_permissions), p_reason, p_ip, p_ua, p_session);
  end if;
  perform set_config('ug.role_write', 'off', true);
  return v_id;
end $$;

create function public.admin_delete_role(p_actor uuid, p_id text, p_reason text, p_ip text, p_ua text, p_session uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_before public.admin_roles;
begin
  perform public.admin_require(p_actor, 'team.roles');
  select * into v_before from public.admin_roles where id = p_id for update;
  if not found then raise exception 'unknown role' using errcode = '22023'; end if;
  if v_before.builtin then raise exception 'built-in roles cannot be deleted' using errcode = '42501'; end if;
  if exists (select 1 from public.admin_member_roles where role_id = p_id) then raise exception 'people still have this role' using errcode = '23503'; end if;
  perform set_config('ug.role_write', 'on', true);
  delete from public.admin_roles where id = p_id;
  perform set_config('ug.role_write', 'off', true);
  perform public.admin_log(p_actor, 'team.role_deleted', 'team', 'role', p_id, v_before.name,
    jsonb_build_object('name', v_before.name, 'permissions', v_before.permissions), null, p_reason, p_ip, p_ua, p_session);
end $$;

-- Role changes: the same rules as 0044, plus every role added must stay within the actor's own permissions.
create or replace function public.admin_set_roles(p_actor uuid, p_target uuid, p_roles text[], p_reason text, p_ip text, p_ua text, p_session uuid)
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
  if not public.admin_roles_within(p_actor, array(select r from unnest(p_roles) r where not (r = any (v_before)))) then
    raise exception 'you can only give roles whose permissions you have yourself' using errcode = '42501';
  end if;
  v_keep_super := 'super_admin' = any (v_before);
  if v_keep_super and not ('team.super' = any (public.admin_perms(p_actor))) then
    raise exception 'admin permission team.super needed' using errcode = '42501';
  end if;
  delete from public.admin_member_roles where user_id = p_target and role_id <> 'super_admin' and not (role_id = any (p_roles));
  insert into public.admin_member_roles (user_id, role_id, granted_by) select p_target, r, p_actor from unnest(p_roles) r on conflict do nothing;
  select coalesce(array_agg(role_id order by role_id), '{}') into v_after from public.admin_member_roles where user_id = p_target;
  perform public.admin_log(p_actor, 'team.roles_changed', 'team', 'admin', p_target::text, (select email from public.admin_members where user_id = p_target),
    jsonb_build_object('roles', v_before), jsonb_build_object('roles', v_after), p_reason, p_ip, p_ua, p_session);
end $$;

create or replace function public.admin_invite(p_actor uuid, p_email text, p_roles text[], p_token_hash text, p_ip text, p_ua text, p_session uuid)
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
  if not public.admin_roles_within(p_actor, p_roles) then
    raise exception 'you can only give roles whose permissions you have yourself' using errcode = '42501';
  end if;
  if exists (select 1 from public.admin_members where lower(email) = v_email) then raise exception 'already a team member' using errcode = '22023'; end if;
  update public.admin_invites set cancelled_at = now() where email = v_email and accepted_at is null and cancelled_at is null;
  insert into public.admin_invites (email, roles, token_hash, invited_by) values (v_email, p_roles, p_token_hash, p_actor) returning id into v_id;
  perform public.admin_log(p_actor, 'team.invited', 'team', 'invite', v_id::text, v_email, null, jsonb_build_object('roles', p_roles), null, p_ip, p_ua, p_session);
  return v_id;
end $$;

-- ───────── sessions: two first requests at once ─────────

create or replace function public.admin_touch_session(p_session uuid, p_user uuid, p_ip text, p_ua text, p_idle_seconds integer default 1800, p_total_seconds integer default 43200)
returns text language plpgsql security definer set search_path = public as $$
declare
  s public.admin_sessions;
  v_new boolean := false;
begin
  insert into public.admin_sessions (session_id, user_id, ip, user_agent) values (p_session, p_user, left(p_ip, 64), left(p_ua, 300))
    on conflict (session_id) do nothing;
  v_new := found;
  select * into s from public.admin_sessions where session_id = p_session for update;
  if s.user_id <> p_user or s.ended_at is not null then return 'ended'; end if;
  if s.started_at <= now() - make_interval(secs => p_total_seconds) then
    update public.admin_sessions set ended_at = now(), end_reason = 'total' where session_id = p_session;
    return 'expired';
  end if;
  if not v_new and s.last_seen_at <= now() - make_interval(secs => p_idle_seconds) then
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

-- ───────── support email: was the sender verified? ─────────

alter table public.support_messages add column if not exists sender_verified boolean, add column if not exists auth_results text;
alter table public.support_tickets add column if not exists sender_unverified boolean not null default false;

create or replace function public.support_ticket_defaults() returns trigger language plpgsql security definer set search_path = public as $$
declare
  cfg public.support_settings;
  v_next uuid;
begin
  select * into cfg from public.support_settings where id = 1;
  new.first_reply_due := coalesce(new.first_reply_due, public.support_due(new.created_at, coalesce((cfg.sla -> new.priority ->> 'first')::int, 24), new.language));
  new.resolve_due := coalesce(new.resolve_due, public.support_due(new.created_at, coalesce((cfg.sla -> new.priority ->> 'resolve')::int, 72), new.language));
  -- A sender whose domain did not verify the email is never linked to a learner account by the From address alone.
  if new.user_id is null and not new.sender_unverified then
    select u.id into new.user_id from auth.users u where lower(u.email) = lower(new.email) limit 1;
  end if;
  if new.assignee_id is null and cfg.assignment = 'category' then
    new.assignee_id := nullif(cfg.category_assignees ->> new.category, '')::uuid;
  elsif new.assignee_id is null and cfg.assignment = 'round_robin' then
    -- The next active member who can reply to tickets, after the last one given a ticket.
    select m.user_id into v_next from public.admin_members m
      where m.status = 'active' and 'support.reply' = any (public.admin_perms(m.user_id))
        and (cfg.round_robin_last is null or m.user_id > cfg.round_robin_last)
      order by m.user_id limit 1;
    if v_next is null then
      select m.user_id into v_next from public.admin_members m
        where m.status = 'active' and 'support.reply' = any (public.admin_perms(m.user_id)) order by m.user_id limit 1;
    end if;
    new.assignee_id := v_next;
    update public.support_settings set round_robin_last = v_next where id = 1;
  end if;
  return new;
end $$;

revoke all on function public.admin_roles_within(uuid, text[]), public.admin_save_role(uuid, text, text, text, text[], text, text, text, uuid),
  public.admin_delete_role(uuid, text, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.admin_roles_within(uuid, text[]), public.admin_save_role(uuid, text, text, text, text[], text, text, text, uuid),
  public.admin_delete_role(uuid, text, text, text, text, uuid) to service_role;
revoke all on function public.admin_roles_write_guard() from public, anon, authenticated;
