-- 0045: admin panel Phase 1, learners, billing and certificates (docs/admin/README.md).
-- Read functions the panel lists and searches with (learner emails live in auth.users, which only these service-role
-- functions read), comp access with its limits, certificate revoke and re-issue, and discount code limits.
-- Every function here is service role only; the ones that change something check the actor's permission and log.

-- ───────── people: email and name for a set of learners ─────────

create function public.admin_people(p_ids uuid[])
returns table (user_id uuid, email text, display_name text, locale text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  return query
    select u.id, u.email::text, p.display_name, coalesce(p.locale, 'en'), p.created_at
    from auth.users u left join public.profiles p on p.user_id = u.id
    where u.id = any (p_ids);
end $$;

-- ───────── the learner list ─────────

-- Search and filters for Learners (LRN-1). Search matches an email or name (contains), a user id, a payment id or
-- receipt number, or a certificate code. Each row carries the total count for the pager.
create function public.admin_learners(
  p_q text default null, p_plan text default null, p_status text default null, p_locale text default null, p_country text default null,
  p_path text default null, p_joined_from timestamptz default null, p_joined_to timestamptz default null, p_active_since date default null,
  p_method text default null, p_limit integer default 50, p_offset integer default 0)
returns table (user_id uuid, email text, display_name text, locale text, country text, joined_at timestamptz, plan text, status text,
  pro_until timestamptz, last_active date, method text, streak integer, total bigint)
language plpgsql stable security definer set search_path = public as $$
declare
  v_q text := nullif(trim(coalesce(p_q, '')), '');
  v_id uuid;
begin
  if v_q ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then v_id := v_q::uuid; end if;
  return query
  with base as (
    select u.id, u.email::text as email, p.display_name, coalesce(p.locale, 'en') as locale, b.country, coalesce(p.created_at, u.created_at) as joined_at,
      case when e.plan = 'pro' and e.valid_until > now() and e.source = 'manual' then 'comp'
           when e.plan = 'pro' and e.valid_until > now() and e.source = 'live' then 'pro'
           else 'free' end as plan,
      case when p.delete_after is not null then 'deleted'
           when u.banned_until is not null and u.banned_until > now() then 'suspended'
           when s.status = 'grace' then 'past_due'
           when s.status = 'cancelled' then 'cancelled'
           else 'active' end as status,
      case when e.plan = 'pro' and e.valid_until > now() then e.valid_until end as pro_until,
      (select max(d.day) from public.daily_activity d where d.user_id = u.id) as last_active,
      coalesce((select string_agg(distinct i.provider, ',') from auth.identities i where i.user_id = u.id), 'email') as method,
      coalesce(st.current, 0) as streak
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    left join public.billing_accounts b on b.user_id = u.id
    left join public.entitlements e on e.user_id = u.id
    left join public.streaks st on st.user_id = u.id
    left join lateral (select s1.status from public.subscriptions s1 where s1.user_id = u.id and s1.status in ('active', 'grace', 'cancelled') limit 1) s on true
    where (v_q is null
           or u.id = v_id
           or u.email ilike '%' || v_q || '%'
           or p.display_name ilike '%' || v_q || '%'
           or exists (select 1 from public.payments pm where pm.user_id = u.id and (pm.provider_payment_id = v_q or pm.receipt_no = upper(v_q)))
           or exists (select 1 from public.subscriptions sb where sb.user_id = u.id and sb.provider_sub_id = v_q)
           or (char_length(regexp_replace(v_q, '^.*-', '')) >= 6 and exists (select 1 from public.certificates c where c.user_id = u.id and c.code like lower(regexp_replace(v_q, '^.*-', '')) || '%')))
      and (p_locale is null or p.locale = p_locale)
      and (p_country is null or b.country = upper(p_country))
      and (p_path is null or exists (select 1 from public.enrollments en where en.user_id = u.id and en.path_id = p_path))
      and (p_joined_from is null or coalesce(p.created_at, u.created_at) >= p_joined_from)
      and (p_joined_to is null or coalesce(p.created_at, u.created_at) < p_joined_to)
  )
  select x.id, x.email, x.display_name, x.locale, x.country, x.joined_at, x.plan, x.status, x.pro_until, x.last_active, x.method, x.streak, count(*) over ()
  from base x
  where (p_plan is null or x.plan = p_plan)
    and (p_status is null or x.status = p_status)
    and (p_active_since is null or x.last_active >= p_active_since)
    and (p_method is null or x.method like '%' || p_method || '%')
  order by x.joined_at desc
  limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0);
end $$;

-- Sign-in facts for Learner 360: confirmed, last sign-in, suspended until, sign-in methods.
create function public.admin_auth_facts(p_user uuid)
returns table (email text, email_confirmed_at timestamptz, last_sign_in_at timestamptz, banned_until timestamptz, created_at timestamptz, methods text[])
language plpgsql stable security definer set search_path = public as $$
begin
  return query
    select u.email::text, u.email_confirmed_at, u.last_sign_in_at, u.banned_until, u.created_at,
           coalesce((select array_agg(distinct i.provider) from auth.identities i where i.user_id = u.id), '{}')
    from auth.users u where u.id = p_user;
end $$;

-- ───────── comp access (free Pro) ─────────

create table public.admin_comp_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  granted_by uuid references auth.users (id) on delete set null,
  until timestamptz not null,
  reason text not null check (char_length(reason) between 3 and 500),
  kind text not null default 'grant' check (kind in ('grant', 'end')),
  created_at timestamptz not null default now()
);
create index admin_comp_grants_user on public.admin_comp_grants (user_id, created_at desc);

-- Gives (or extends) free Pro until p_until. learners.act allows up to 30 days from now; comp.grant has no limit.
-- A paid plan that runs longer keeps going; entitlementFor keeps the later of the two.
create function public.admin_grant_comp(p_actor uuid, p_user uuid, p_until timestamptz, p_reason text, p_ip text, p_ua text, p_session uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_perms text[] := public.admin_perms(p_actor);
  e public.entitlements;
begin
  if not ('comp.grant' = any (v_perms)) then
    if not ('learners.act' = any (v_perms)) then raise exception 'admin permission comp.grant needed' using errcode = '42501'; end if;
    if p_until > now() + interval '30 days 1 hour' then raise exception 'support can give Pro for up to 30 days; ask a lead or billing for more' using errcode = '42501'; end if;
  end if;
  if p_until <= now() then raise exception 'pick a date in the future' using errcode = '22023'; end if;
  if p_actor = p_user then raise exception 'nobody gives Pro to their own account' using errcode = '42501'; end if;
  select * into e from public.entitlements where user_id = p_user for update;
  insert into public.entitlements as t (user_id, plan, valid_until, pro_since, source, updated_at)
  values (p_user, 'pro', p_until, now(), 'manual', now())
  on conflict (user_id) do update set
    plan = 'pro',
    valid_until = greatest(p_until, case when t.plan = 'pro' and t.source = 'live' then t.valid_until end),
    source = case when t.plan = 'pro' and t.source = 'live' and t.valid_until > p_until then 'live' else 'manual' end,
    pro_since = case when t.plan = 'pro' and t.valid_until > now() then t.pro_since else now() end,
    updated_at = now();
  insert into public.admin_comp_grants (user_id, granted_by, until, reason) values (p_user, p_actor, p_until, p_reason);
  perform public.admin_log(p_actor, 'learners.comp_granted', 'billing', 'learner', p_user::text, (select email from auth.users where id = p_user),
    case when e.user_id is null then null else jsonb_build_object('plan', e.plan, 'valid_until', e.valid_until, 'source', e.source) end,
    jsonb_build_object('plan', 'pro', 'valid_until', p_until, 'source', 'manual'), p_reason, p_ip, p_ua, p_session);
end $$;

-- Ends free Pro now (the app then recomputes the entitlement from any paid plan).
create function public.admin_end_comp(p_actor uuid, p_user uuid, p_reason text, p_ip text, p_ua text, p_session uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  e public.entitlements;
  v_paid timestamptz;
begin
  if not (public.admin_perms(p_actor) && array['comp.grant', 'learners.act']) then raise exception 'admin permission comp.grant needed' using errcode = '42501'; end if;
  select * into e from public.entitlements where user_id = p_user for update;
  if e.user_id is null or e.source <> 'manual' or e.plan <> 'pro' then raise exception 'this learner has no free Pro to end' using errcode = '22023'; end if;
  -- A paid plan still running takes over again; otherwise Pro ends now.
  select greatest(s.current_period_end, coalesce(s.grace_until, s.current_period_end)) into v_paid
    from public.subscriptions s where s.user_id = p_user and s.status in ('active', 'grace', 'cancelled') limit 1;
  if v_paid is not null and v_paid > now() then
    update public.entitlements set valid_until = v_paid, source = 'live', updated_at = now() where user_id = p_user;
  else
    update public.entitlements set valid_until = now(), pro_ended_at = now(), updated_at = now() where user_id = p_user;
  end if;
  insert into public.admin_comp_grants (user_id, granted_by, until, reason, kind) values (p_user, p_actor, now(), p_reason, 'end');
  perform public.admin_log(p_actor, 'learners.comp_ended', 'billing', 'learner', p_user::text, (select email from auth.users where id = p_user),
    jsonb_build_object('valid_until', e.valid_until, 'source', 'manual'), jsonb_build_object('valid_until', case when v_paid > now() then v_paid else now() end), p_reason, p_ip, p_ua, p_session);
end $$;

-- ───────── certificates: revoke and re-issue (CRT-2) ─────────

alter table public.certificates
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid references auth.users (id) on delete set null,
  add column if not exists revoked_reason jsonb,      -- {"en": "...", "ar": "..."}: shown on the public page
  add column if not exists reissued_at timestamptz;

create function public.admin_revoke_certificate(p_actor uuid, p_code text, p_public_reason jsonb, p_reason text, p_ip text, p_ua text, p_session uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  c public.certificates;
begin
  perform public.admin_require(p_actor, 'certs.manage');
  select * into c from public.certificates where code = p_code for update;
  if not found then raise exception 'no certificate with that id' using errcode = '22023'; end if;
  if c.revoked_at is not null then raise exception 'already revoked' using errcode = '22023'; end if;
  update public.certificates set revoked_at = now(), revoked_by = p_actor, revoked_reason = p_public_reason, public_changed_at = now() where id = c.id;
  perform public.admin_log(p_actor, 'certificates.revoked', 'certificates', 'certificate', c.code, c.path_id || ' · ' || coalesce((select email from auth.users where id = c.user_id), ''),
    jsonb_build_object('valid', true), jsonb_build_object('valid', false, 'public_reason', p_public_reason), p_reason, p_ip, p_ua, p_session);
end $$;

-- Re-issue: the certificate shows the learner's current name, so a name change re-issues it. This optionally corrects the
-- name, and refreshes the share preview (LinkedIn caches it by public_changed_at).
create function public.admin_reissue_certificate(p_actor uuid, p_code text, p_name text, p_reason text, p_ip text, p_ua text, p_session uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  c public.certificates;
  v_old text;
begin
  perform public.admin_require(p_actor, 'certs.manage');
  select * into c from public.certificates where code = p_code for update;
  if not found then raise exception 'no certificate with that id' using errcode = '22023'; end if;
  if c.revoked_at is not null then raise exception 'a revoked certificate cannot be re-issued' using errcode = '22023'; end if;
  select display_name into v_old from public.profiles where user_id = c.user_id;
  if p_name is not null and char_length(trim(p_name)) between 2 and 60 then
    update public.profiles set display_name = trim(p_name) where user_id = c.user_id;
  end if;
  update public.certificates set reissued_at = now(), public_changed_at = now() where id = c.id;
  perform public.admin_log(p_actor, 'certificates.reissued', 'certificates', 'certificate', c.code, c.path_id,
    jsonb_build_object('name', v_old), jsonb_build_object('name', coalesce(nullif(trim(p_name), ''), v_old)), p_reason, p_ip, p_ua, p_session);
end $$;

-- ───────── discount codes (BIL-5) ─────────
-- A code is a name for one of the real offers (today only FOUNDING: 30% off the first annual year, which has its own
-- Paddle discount). The panel can add more codes for that offer (one per campaign, to see which one works), pause them,
-- give them an end date and cap their uses. The checkout checks max_uses (apps/web/lib/server/billing/checkout.ts).
alter table public.discount_codes
  add column if not exists max_uses integer check (max_uses is null or max_uses > 0),
  add column if not exists note text,
  add column if not exists created_by uuid references auth.users (id) on delete set null,
  add column if not exists created_at timestamptz not null default now();

-- Uses and revenue per code, from paid checkouts.
create function public.admin_discount_stats()
returns table (code text, uses bigint, revenue jsonb)
language sql stable security definer set search_path = public as $$
  select g.code, sum(g.n)::bigint, jsonb_object_agg(g.currency, g.total)
  from (select upper(cs.code) as code, cs.currency, count(*) as n, sum(cs.amount_minor) as total
        from public.checkout_sessions cs where cs.status = 'paid' and cs.code is not null group by 1, 2) g
  group by g.code
$$;

-- ───────── billing problems: webhook events that failed (BIL-8) ─────────

-- Lets the panel retry one failed event: clears its claim so the next delivery or the retry applies it.
create function public.admin_reset_billing_event(p_actor uuid, p_event uuid, p_ip text, p_ua text, p_session uuid)
returns public.billing_events language plpgsql security definer set search_path = public as $$
declare
  ev public.billing_events;
begin
  perform public.admin_require(p_actor, 'problems.retry');
  update public.billing_events set claimed_at = null where id = p_event and processed_at is null returning * into ev;
  if not found then raise exception 'that event was already applied' using errcode = '22023'; end if;
  perform public.admin_log(p_actor, 'billing.webhook_retried', 'billing', 'billing_event', ev.id::text, ev.provider || ' ' || ev.event_type,
    jsonb_build_object('error', ev.error), null, null, p_ip, p_ua, p_session);
  return ev;
end $$;

-- ───────── grants ─────────

alter table public.admin_comp_grants enable row level security;
revoke all on public.admin_comp_grants from public, anon, authenticated;
grant select, insert on public.admin_comp_grants to service_role;

revoke all on function public.admin_people(uuid[]),
  public.admin_learners(text, text, text, text, text, text, timestamptz, timestamptz, date, text, integer, integer),
  public.admin_auth_facts(uuid),
  public.admin_grant_comp(uuid, uuid, timestamptz, text, text, text, uuid), public.admin_end_comp(uuid, uuid, text, text, text, uuid),
  public.admin_revoke_certificate(uuid, text, jsonb, text, text, text, uuid), public.admin_reissue_certificate(uuid, text, text, text, text, text, uuid),
  public.admin_discount_stats(), public.admin_reset_billing_event(uuid, uuid, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.admin_people(uuid[]),
  public.admin_learners(text, text, text, text, text, text, timestamptz, timestamptz, date, text, integer, integer),
  public.admin_auth_facts(uuid),
  public.admin_grant_comp(uuid, uuid, timestamptz, text, text, text, uuid), public.admin_end_comp(uuid, uuid, text, text, text, uuid),
  public.admin_revoke_certificate(uuid, text, jsonb, text, text, text, uuid), public.admin_reissue_certificate(uuid, text, text, text, text, text, uuid),
  public.admin_discount_stats(), public.admin_reset_billing_event(uuid, uuid, text, text, uuid)
  to service_role;
