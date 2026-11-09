-- 0060: admin panel Phase 2, part 1. Permissions for the Phase 2 areas, and lesson content as versioned rows.
--
-- Content before 0060: YAML in content/paths/, compiled to packages/content/dist and seeded into content_versions (one
-- immutable row per lesson and content hash). The app reads the lesson from the compiled files.
-- With 0060:
--   * lesson_live says which version of each lesson learners get. The seed (supabase/seed/content.sql) ends with
--     content_sync_bundle(), which makes the compiled version live; the first run is the v1 import (CNT-6): every
--     lesson's current version becomes v1.
--   * The panel edits a lesson as a draft (lesson_drafts), sends drafts for review as a release (content_releases),
--     and a publisher who wrote none of it publishes: each lesson gets a new content_versions row and goes live.
--     Roll back points lesson_live at the version before, with a reason.
--   * After a lesson was published from the panel, the YAML seed no longer overrides it (content_sync_bundle keeps
--     the panel's version and reports it), so the two routes cannot undo each other.
--   * The app serves the live version only while the flag content_db is on (0061); until then it serves the
--     compiled files as before.
-- Every table here is service role only: the panel's server checks the admin's permission, and every function that
-- changes something checks it again with admin_require and writes the audit log.

-- ───────── permissions: Phase 2 keys and built-in roles ─────────
-- Generated from apps/web/lib/admin/permissions.ts (npm run admin:sql -w @uxgate/web writes this block). Keep both in step.
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
  ('help.view', 'support', 'See the help centre'),
  ('help.edit', 'support', 'Write and publish help articles'),
  ('learners.merge', 'learners', 'Merge two accounts of one learner (typed confirm, logged)'),
  ('trials.extend', 'billing', 'Extend a learner''s free trial'),
  ('prices.change', 'billing', 'Ask for a price change; a second person with this permission approves'),
  ('content.view', 'content', 'See paths, lessons, skills and releases'),
  ('content.edit', 'content', 'Edit lesson drafts in English and Arabic and send them for review'),
  ('content.publish', 'content', 'Publish and roll back releases (never a change they wrote)'),
  ('releases.view', 'content', 'See releases and version history'),
  ('media.view', 'content', 'See the media library'),
  ('media.manage', 'content', 'Upload videos, edit captions, images and alt text'),
  ('media.own', 'content', 'Upload and caption their own videos only (instructors)'),
  ('instructors.view', 'content', 'See instructors'),
  ('instructors.manage', 'content', 'Edit instructor profiles'),
  ('quality.view', 'content', 'See content quality flags and lesson reports'),
  ('quality.manage', 'content', 'Change the status of quality flags'),
  ('reports.view', 'grow', 'See learning, growth and certificate reports (money needs revenue)'),
  ('reports.schedule', 'grow', 'Save and schedule reports'),
  ('comms.view', 'grow', 'See campaigns, announcements, templates, the waitlist and the email log'),
  ('comms.send', 'grow', 'Write and schedule campaigns and announcements, invite from the waitlist'),
  ('comms.templates', 'grow', 'Edit email templates'),
  ('comms.approve', 'grow', 'Approve messages to more than 500 learners'),
  ('settings.view', 'settings', 'See platform settings'),
  ('settings.flags', 'settings', 'Turn feature flags on and off'),
  ('settings.rules', 'settings', 'Change learning rules'),
  ('settings.access', 'settings', 'Change the Coming Soon gate, maintenance mode and the team password'),
  ('settings.legal', 'settings', 'Publish terms, privacy and refund pages'),
  ('health.view', 'settings', 'See system health and scheduled jobs'),
  ('health.jobs', 'settings', 'Run a scheduled job now (jobs that email learners never)')
on conflict (key) do update set area = excluded.area, label = excluded.label;
select set_config('ug.builtin_roles', 'on', false);
insert into public.admin_roles (id, name, description, builtin, permissions) values
  ('super_admin', 'Super admin', 'Founders. Everything, including super admins and the audit log export.', true, array['dashboard.view', 'learners.view', 'learners.reveal', 'learners.act', 'learners.manage', 'learners.view_as', 'learners.notes', 'support.view', 'support.reply', 'support.assign', 'support.macros', 'support.settings', 'appeals.view', 'appeals.decide', 'subs.view', 'payments.view', 'refunds.view', 'refunds.approve', 'refunds.approve_any', 'comp.grant', 'problems.view', 'problems.retry', 'revenue.view', 'billing.export', 'discounts.view', 'discounts.create', 'discounts.edit', 'students.review', 'prices.view', 'certs.view', 'certs.manage', 'team.view', 'team.invite', 'team.roles', 'team.super', 'audit.view', 'audit.area_support', 'audit.area_billing', 'audit.area_content', 'audit.export', 'testing.tools', 'help.view', 'help.edit', 'learners.merge', 'trials.extend', 'prices.change', 'content.view', 'content.edit', 'content.publish', 'releases.view', 'media.view', 'media.manage', 'media.own', 'instructors.view', 'instructors.manage', 'quality.view', 'quality.manage', 'reports.view', 'reports.schedule', 'comms.view', 'comms.send', 'comms.templates', 'comms.approve', 'settings.view', 'settings.flags', 'settings.rules', 'settings.access', 'settings.legal', 'health.view', 'health.jobs']::text[]),
  ('admin', 'Admin', 'Operations lead. Everything except super admins, the audit log export and running jobs by hand.', true, array['dashboard.view', 'learners.view', 'learners.reveal', 'learners.act', 'learners.manage', 'learners.view_as', 'learners.notes', 'support.view', 'support.reply', 'support.assign', 'support.macros', 'support.settings', 'appeals.view', 'appeals.decide', 'subs.view', 'payments.view', 'refunds.view', 'refunds.approve', 'refunds.approve_any', 'comp.grant', 'problems.view', 'problems.retry', 'revenue.view', 'billing.export', 'discounts.view', 'discounts.create', 'discounts.edit', 'students.review', 'prices.view', 'certs.view', 'certs.manage', 'team.view', 'team.invite', 'team.roles', 'audit.view', 'audit.area_support', 'audit.area_billing', 'audit.area_content', 'testing.tools', 'help.view', 'help.edit', 'learners.merge', 'trials.extend', 'prices.change', 'content.view', 'content.edit', 'content.publish', 'releases.view', 'media.view', 'media.manage', 'media.own', 'instructors.view', 'instructors.manage', 'quality.view', 'quality.manage', 'reports.view', 'reports.schedule', 'comms.view', 'comms.send', 'comms.templates', 'comms.approve', 'settings.view', 'settings.flags', 'settings.rules', 'settings.access', 'settings.legal', 'health.view']::text[]),
  ('support_lead', 'Support lead', 'Head of support. Support agent rights plus any refund, macros, SLA settings, assignment and support reports.', true, array['dashboard.view', 'learners.view', 'learners.reveal', 'learners.act', 'learners.manage', 'learners.view_as', 'learners.notes', 'support.view', 'support.reply', 'support.assign', 'support.macros', 'support.settings', 'appeals.view', 'appeals.decide', 'subs.view', 'payments.view', 'refunds.view', 'refunds.approve', 'refunds.approve_any', 'comp.grant', 'discounts.view', 'certs.view', 'certs.manage', 'audit.area_support', 'help.view', 'help.edit', 'content.view', 'quality.view', 'reports.view', 'learners.merge', 'trials.extend']::text[]),
  ('support_agent', 'Support agent', 'Customer support. Learner 360, tickets, appeals, small refunds and Pro for up to 30 days.', true, array['dashboard.view', 'learners.view', 'learners.reveal', 'learners.act', 'learners.view_as', 'learners.notes', 'support.view', 'support.reply', 'appeals.view', 'appeals.decide', 'payments.view', 'refunds.view', 'refunds.approve', 'certs.view', 'content.view', 'quality.view', 'help.view', 'trials.extend']::text[]),
  ('billing_manager', 'Billing manager', 'Finance. Payments, subscriptions, refunds, discount codes, prices and revenue. No content.', true, array['dashboard.view', 'learners.view', 'learners.reveal', 'learners.notes', 'support.view', 'subs.view', 'payments.view', 'refunds.view', 'refunds.approve', 'refunds.approve_any', 'comp.grant', 'problems.view', 'problems.retry', 'revenue.view', 'billing.export', 'discounts.view', 'discounts.create', 'discounts.edit', 'students.review', 'prices.view', 'audit.area_billing', 'reports.view', 'prices.change', 'trials.extend']::text[]),
  ('content_publisher', 'Content publisher', 'Content lead. Content editor rights plus review, publish and roll back (Phase 2).', true, array['dashboard.view', 'content.view', 'content.edit', 'content.publish', 'media.view', 'media.manage', 'instructors.view', 'instructors.manage', 'quality.view', 'quality.manage', 'releases.view', 'reports.view', 'audit.area_content', 'help.view', 'help.edit']::text[]),
  ('content_editor', 'Content editor', 'Content team. Edit drafts of paths, lessons, skills, media and translations (Phase 2).', true, array['dashboard.view', 'content.view', 'content.edit', 'media.view', 'media.manage', 'instructors.view', 'quality.view', 'releases.view', 'reports.view', 'help.view']::text[]),
  ('instructor', 'Instructor', 'Video instructors on hybrid paths. Their own profile and videos, stats for their paths (Phase 2).', true, array['dashboard.view', 'media.view', 'media.own', 'instructors.view', 'reports.view']::text[]),
  ('marketing', 'Marketing', 'Growth. Waitlist, announcements, campaigns (Phase 2) and creating discount codes. No personal data export.', true, array['dashboard.view', 'discounts.view', 'discounts.create', 'reports.view', 'reports.schedule', 'comms.view', 'comms.send', 'comms.templates']::text[]),
  ('analyst', 'Analyst', 'Reporting. Read only, with personal data always masked.', true, array['dashboard.view', 'learners.view', 'support.view', 'appeals.view', 'subs.view', 'payments.view', 'refunds.view', 'revenue.view', 'discounts.view', 'prices.view', 'certs.view', 'content.view', 'quality.view', 'reports.view', 'reports.schedule', 'audit.view', 'health.view', 'settings.view', 'releases.view', 'comms.view', 'media.view']::text[]),
  ('viewer', 'Viewer / QA tester', 'Team testing. Read-only views and the team testing tools on their own account only.', true, array['dashboard.view', 'content.view', 'testing.tools']::text[])
on conflict (id) do update set name = excluded.name, description = excluded.description, permissions = excluded.permissions;
select set_config('ug.builtin_roles', 'off', false);
-- @@END PERMISSIONS@@

-- ───────── versions ─────────

-- Numbers and origin of the versions that went live since the v1 import. Older rows of content_versions have no
-- number: they stay only so earlier answers replay against the content they were played on.
create table public.content_version_info (
  version_id uuid primary key references public.content_versions (id) on delete cascade,
  lesson_id text not null references public.lessons (id) on delete cascade,
  version_no integer not null check (version_no >= 1),
  origin text not null check (origin in ('import', 'yaml', 'editor')),
  author_id uuid references auth.users (id) on delete set null,   -- who wrote it (editor versions)
  release_id uuid,
  created_at timestamptz not null default now(),
  unique (lesson_id, version_no)
);

-- The version learners get. One row per lesson.
create table public.lesson_live (
  lesson_id text primary key references public.lessons (id) on delete cascade,
  version_id uuid not null references public.content_versions (id),
  since timestamptz not null default now(),
  set_by uuid references auth.users (id) on delete set null,
  release_id uuid,
  how text not null default 'import' check (how in ('import', 'yaml', 'publish', 'rollback'))
);

-- ───────── drafts and releases ─────────

-- One working draft per lesson: the whole lesson body, started from a version. `acks` are the text fields an editor
-- marked "checked, no change needed" in the other language, so the parity check lets them through.
create table public.lesson_drafts (
  lesson_id text primary key references public.lessons (id) on delete cascade,
  base_version_id uuid not null references public.content_versions (id),
  body jsonb not null check (jsonb_typeof(body) = 'object' and jsonb_typeof(body -> 'steps') = 'array'),
  acks text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'in_review')),
  release_id uuid,
  editors uuid[] not null default '{}',     -- everyone who changed it: none of them may publish it
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.content_releases (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 140),
  note text,
  status text not null default 'in_review' check (status in ('in_review', 'published', 'declined', 'withdrawn', 'rolled_back')),
  requested_by uuid not null references auth.users (id),
  authors uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  checks jsonb not null default '{}',        -- the automatic checks as the app ran them at submit
  decided_by uuid references auth.users (id),
  decided_at timestamptz,
  decision_note text,
  rolled_back_by uuid references auth.users (id),
  rolled_back_at timestamptz,
  rollback_reason text
);
create index content_releases_status on public.content_releases (status, created_at desc);

-- What a release changes: the body is frozen when it is sent for review, so the publisher publishes what they read.
create table public.content_release_items (
  release_id uuid not null references public.content_releases (id) on delete cascade,
  lesson_id text not null references public.lessons (id) on delete cascade,
  body jsonb not null,
  hash text not null,
  from_version_id uuid references public.content_versions (id),
  to_version_id uuid references public.content_versions (id),
  primary key (release_id, lesson_id)
);

alter table public.content_version_info enable row level security;
alter table public.lesson_live enable row level security;
alter table public.lesson_drafts enable row level security;
alter table public.content_releases enable row level security;
alter table public.content_release_items enable row level security;
revoke all on public.content_version_info, public.lesson_live, public.lesson_drafts, public.content_releases, public.content_release_items
  from public, anon, authenticated;
grant select, insert, update, delete on public.content_version_info, public.lesson_live, public.lesson_drafts, public.content_releases,
  public.content_release_items to service_role;

-- ───────── the YAML route and the v1 import ─────────

-- Makes the compiled version of each lesson live. p_items: [{"lesson_id": "...", "hash": "..."}]. Answers one row per
-- lesson that changed or was kept: 'import' (v1), 'yaml' (a newer compiled version went live), 'kept_editor' (the
-- lesson was published from the panel since; the compiled version is stored but not made live) or 'missing'.
create function public.content_sync_bundle(p_items jsonb)
returns table (lesson_id text, result text) language plpgsql security definer set search_path = public as $$
declare
  it record;
  v_ver uuid;
  v_live public.lesson_live;
  v_origin text;
  v_no integer;
begin
  for it in select x ->> 'lesson_id' as lid, x ->> 'hash' as h from jsonb_array_elements(coalesce(p_items, '[]')) x loop
    select id into v_ver from public.content_versions where content_versions.lesson_id = it.lid and hash = it.h;
    if v_ver is null then lesson_id := it.lid; result := 'missing'; return next; continue; end if;
    select * into v_live from public.lesson_live l where l.lesson_id = it.lid;
    if v_live.lesson_id is null then
      insert into public.content_version_info (version_id, lesson_id, version_no, origin) values (v_ver, it.lid, 1, 'import')
        on conflict (version_id) do nothing;
      insert into public.lesson_live (lesson_id, version_id, how) values (it.lid, v_ver, 'import');
      lesson_id := it.lid; result := 'import'; return next;
      continue;
    end if;
    if v_live.version_id = v_ver then continue; end if;
    select origin into v_origin from public.content_version_info where version_id = v_live.version_id;
    if v_origin = 'editor' or v_live.how = 'rollback' then lesson_id := it.lid; result := 'kept_editor'; return next; continue; end if;
    if not exists (select 1 from public.content_version_info where version_id = v_ver) then
      select coalesce(max(version_no), 0) + 1 into v_no from public.content_version_info i where i.lesson_id = it.lid;
      insert into public.content_version_info (version_id, lesson_id, version_no, origin) values (v_ver, it.lid, v_no, 'yaml');
    end if;
    update public.lesson_live l set version_id = v_ver, since = now(), set_by = null, release_id = null, how = 'yaml' where l.lesson_id = it.lid;
    lesson_id := it.lid; result := 'yaml'; return next;
  end loop;
end $$;

-- The live hash of every lesson, for the app (about 200 small rows; the app keeps them for a minute).
create function public.content_live_hashes()
returns table (lesson_id text, hash text, version_no integer) language sql stable security definer set search_path = public as $$
  select l.lesson_id, v.hash, i.version_no
  from public.lesson_live l join public.content_versions v on v.id = l.version_id
  left join public.content_version_info i on i.version_id = l.version_id
$$;

-- ───────── panel functions ─────────

-- Saves a draft. A draft in review is frozen until it is withdrawn or declined.
create function public.admin_content_save_draft(p_actor uuid, p_lesson text, p_base uuid, p_body jsonb, p_acks text[],
  p_ip text, p_ua text, p_session uuid)
returns public.lesson_drafts language plpgsql security definer set search_path = public as $$
declare
  d public.lesson_drafts;
begin
  perform public.admin_require(p_actor, 'content.edit');
  if not exists (select 1 from public.content_versions where id = p_base and lesson_id = p_lesson) then
    raise exception 'that version is not a version of this lesson' using errcode = '22023';
  end if;
  if p_body ->> 'id' is distinct from p_lesson then raise exception 'the lesson id in the draft does not match' using errcode = '22023'; end if;
  select * into d from public.lesson_drafts where lesson_id = p_lesson for update;
  if d.status = 'in_review' then raise exception 'this lesson is in review: withdraw the release to change it' using errcode = '42501'; end if;
  insert into public.lesson_drafts as t (lesson_id, base_version_id, body, acks, editors, updated_by, updated_at)
  values (p_lesson, p_base, p_body, coalesce(p_acks, '{}'), array[p_actor], p_actor, now())
  on conflict (lesson_id) do update set body = excluded.body, acks = excluded.acks, updated_by = p_actor, updated_at = now(),
    editors = case when p_actor = any (t.editors) then t.editors else t.editors || p_actor end
  returning * into d;
  perform public.admin_log(p_actor, 'content.draft_saved', 'content', 'lesson', p_lesson, p_lesson, null,
    jsonb_build_object('base_version', p_base, 'steps', jsonb_array_length(p_body -> 'steps')), null, p_ip, p_ua, p_session);
  return d;
end $$;

create function public.admin_content_discard_draft(p_actor uuid, p_lesson text, p_reason text, p_ip text, p_ua text, p_session uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  d public.lesson_drafts;
begin
  perform public.admin_require(p_actor, 'content.edit');
  select * into d from public.lesson_drafts where lesson_id = p_lesson for update;
  if d.lesson_id is null then return; end if;
  if d.status = 'in_review' then raise exception 'this lesson is in review: withdraw the release first' using errcode = '42501'; end if;
  delete from public.lesson_drafts where lesson_id = p_lesson;
  perform public.admin_log(p_actor, 'content.draft_discarded', 'content', 'lesson', p_lesson, p_lesson, jsonb_build_object('editors', d.editors), null, p_reason, p_ip, p_ua, p_session);
end $$;

-- Sends drafts for review as one release. The app ran the automatic checks (step count, try-first, contrast, an
-- independent step, both languages); p_checks keeps what it found, and a failed check stops the send here too.
create function public.admin_content_submit(p_actor uuid, p_title text, p_note text, p_lessons text[], p_checks jsonb,
  p_ip text, p_ua text, p_session uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_authors uuid[];
  n integer;
begin
  perform public.admin_require(p_actor, 'content.edit');
  if coalesce(cardinality(p_lessons), 0) = 0 then raise exception 'pick at least one lesson' using errcode = '22023'; end if;
  if coalesce((p_checks ->> 'ok')::boolean, false) is not true then raise exception 'fix the failed checks before sending for review' using errcode = '22023'; end if;
  select count(*), array_agg(distinct e) into n, v_authors
  from public.lesson_drafts d cross join lateral unnest(d.editors) e where d.lesson_id = any (p_lessons) and d.status = 'draft';
  if (select count(*) from public.lesson_drafts where lesson_id = any (p_lessons) and status = 'draft') <> cardinality(p_lessons) then
    raise exception 'every lesson needs a draft that is not already in review' using errcode = '22023';
  end if;
  insert into public.content_releases (title, note, requested_by, authors, checks)
  values (p_title, p_note, p_actor, coalesce(v_authors, '{}') || array[p_actor], coalesce(p_checks, '{}')) returning id into v_id;
  insert into public.content_release_items (release_id, lesson_id, body, hash, from_version_id)
  select v_id, d.lesson_id, d.body, 'e' || encode(sha256(convert_to(d.body::text, 'UTF8')), 'hex'), l.version_id
  from public.lesson_drafts d left join public.lesson_live l on l.lesson_id = d.lesson_id where d.lesson_id = any (p_lessons);
  update public.lesson_drafts set status = 'in_review', release_id = v_id where lesson_id = any (p_lessons);
  perform public.admin_log(p_actor, 'content.release_requested', 'content', 'release', v_id::text, p_title, null,
    jsonb_build_object('lessons', p_lessons, 'checks', p_checks), p_note, p_ip, p_ua, p_session);
  return v_id;
end $$;

-- The person who asked takes the release back; the drafts can be edited again.
create function public.admin_content_withdraw(p_actor uuid, p_release uuid, p_ip text, p_ua text, p_session uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  r public.content_releases;
begin
  select * into r from public.content_releases where id = p_release for update;
  if r.id is null or r.status <> 'in_review' then raise exception 'this release is not in review' using errcode = '22023'; end if;
  if r.requested_by <> p_actor then perform public.admin_require(p_actor, 'content.publish'); end if;
  update public.content_releases set status = 'withdrawn', decided_by = p_actor, decided_at = now() where id = p_release;
  update public.lesson_drafts set status = 'draft', release_id = null where release_id = p_release;
  perform public.admin_log(p_actor, 'content.release_withdrawn', 'content', 'release', p_release::text, r.title, null, null, null, p_ip, p_ua, p_session);
end $$;

-- A publisher sends it back with a note.
create function public.admin_content_decline(p_actor uuid, p_release uuid, p_note text, p_ip text, p_ua text, p_session uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  r public.content_releases;
begin
  perform public.admin_require(p_actor, 'content.publish');
  if char_length(coalesce(trim(p_note), '')) < 3 then raise exception 'say what needs to change' using errcode = '22023'; end if;
  select * into r from public.content_releases where id = p_release for update;
  if r.id is null or r.status <> 'in_review' then raise exception 'this release is not in review' using errcode = '22023'; end if;
  update public.content_releases set status = 'declined', decided_by = p_actor, decided_at = now(), decision_note = p_note where id = p_release;
  update public.lesson_drafts set status = 'draft', release_id = null where release_id = p_release;
  perform public.admin_log(p_actor, 'content.release_declined', 'content', 'release', p_release::text, r.title, null, null, p_note, p_ip, p_ua, p_session);
end $$;

-- Publishes a release: every lesson gets a new version (or reuses one with the same body) and goes live. Authors
-- never publish their own change, and nobody publishes a release whose lesson went live another way since.
create function public.admin_content_publish(p_actor uuid, p_release uuid, p_note text, p_ip text, p_ua text, p_session uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  r public.content_releases;
  it public.content_release_items;
  v_ver uuid;
  v_no integer;
  v_live uuid;
  n integer := 0;
begin
  perform public.admin_require(p_actor, 'content.publish');
  select * into r from public.content_releases where id = p_release for update;
  if r.id is null or r.status <> 'in_review' then raise exception 'this release is not in review' using errcode = '22023'; end if;
  if p_actor = any (r.authors) or p_actor = r.requested_by then
    raise exception 'authors cannot publish their own change: ask another publisher' using errcode = '42501';
  end if;
  for it in select * from public.content_release_items where release_id = p_release for update loop
    select version_id into v_live from public.lesson_live where lesson_id = it.lesson_id for update;
    if v_live is distinct from it.from_version_id then
      raise exception 'lesson % changed since this release was sent: decline it and send it again', it.lesson_id using errcode = '22023';
    end if;
    insert into public.content_versions (lesson_id, hash, body) values (it.lesson_id, it.hash, it.body) on conflict (lesson_id, hash) do nothing;
    select id into v_ver from public.content_versions where lesson_id = it.lesson_id and hash = it.hash;
    if not exists (select 1 from public.content_version_info where version_id = v_ver) then
      select coalesce(max(version_no), 0) + 1 into v_no from public.content_version_info where lesson_id = it.lesson_id;
      insert into public.content_version_info (version_id, lesson_id, version_no, origin, author_id, release_id)
      values (v_ver, it.lesson_id, v_no, 'editor', r.requested_by, p_release);
    end if;
    insert into public.lesson_live as l (lesson_id, version_id, set_by, release_id, how) values (it.lesson_id, v_ver, p_actor, p_release, 'publish')
      on conflict (lesson_id) do update set version_id = excluded.version_id, since = now(), set_by = p_actor, release_id = p_release, how = 'publish';
    update public.content_release_items set to_version_id = v_ver where release_id = p_release and lesson_id = it.lesson_id;
    n := n + 1;
  end loop;
  delete from public.lesson_drafts where release_id = p_release;
  update public.content_releases set status = 'published', decided_by = p_actor, decided_at = now(), decision_note = p_note where id = p_release;
  perform public.admin_log(p_actor, 'content.release_published', 'content', 'release', p_release::text, r.title,
    jsonb_build_object('status', 'in_review'), jsonb_build_object('status', 'published', 'lessons', n), p_note, p_ip, p_ua, p_session);
  return n;
end $$;

-- Rolls a published release back: each lesson goes back to the version it replaced, and the rolled-back body is kept
-- as a draft (when the lesson has none) so the fix can continue. Needs a reason; authors cannot roll back their own.
create function public.admin_content_rollback(p_actor uuid, p_release uuid, p_reason text, p_ip text, p_ua text, p_session uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  r public.content_releases;
  it public.content_release_items;
  n integer := 0;
begin
  perform public.admin_require(p_actor, 'content.publish');
  if char_length(coalesce(trim(p_reason), '')) < 3 then raise exception 'write a reason of at least 3 characters' using errcode = '22023'; end if;
  select * into r from public.content_releases where id = p_release for update;
  if r.id is null or r.status <> 'published' then raise exception 'only a published release can be rolled back' using errcode = '22023'; end if;
  if p_actor = any (r.authors) then raise exception 'authors cannot roll back their own change: ask another publisher' using errcode = '42501'; end if;
  for it in select * from public.content_release_items where release_id = p_release loop
    if it.from_version_id is null then continue; end if;
    if (select version_id from public.lesson_live where lesson_id = it.lesson_id) is distinct from it.to_version_id then
      raise exception 'lesson % changed again after this release: roll back the newer release first', it.lesson_id using errcode = '22023';
    end if;
    update public.lesson_live set version_id = it.from_version_id, since = now(), set_by = p_actor, release_id = p_release, how = 'rollback'
      where lesson_id = it.lesson_id;
    insert into public.lesson_drafts (lesson_id, base_version_id, body, editors, updated_by)
      values (it.lesson_id, it.from_version_id, it.body, r.authors, p_actor) on conflict (lesson_id) do nothing;
    n := n + 1;
  end loop;
  update public.content_releases set status = 'rolled_back', rolled_back_by = p_actor, rolled_back_at = now(), rollback_reason = p_reason where id = p_release;
  perform public.admin_log(p_actor, 'content.release_rolled_back', 'content', 'release', p_release::text, r.title,
    jsonb_build_object('status', 'published'), jsonb_build_object('status', 'rolled_back', 'lessons', n), p_reason, p_ip, p_ua, p_session);
  return n;
end $$;

revoke all on function public.content_sync_bundle(jsonb), public.content_live_hashes(),
  public.admin_content_save_draft(uuid, text, uuid, jsonb, text[], text, text, uuid),
  public.admin_content_discard_draft(uuid, text, text, text, text, uuid),
  public.admin_content_submit(uuid, text, text, text[], jsonb, text, text, uuid),
  public.admin_content_withdraw(uuid, uuid, text, text, uuid),
  public.admin_content_decline(uuid, uuid, text, text, text, uuid),
  public.admin_content_publish(uuid, uuid, text, text, text, uuid),
  public.admin_content_rollback(uuid, uuid, text, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.content_sync_bundle(jsonb), public.content_live_hashes(),
  public.admin_content_save_draft(uuid, text, uuid, jsonb, text[], text, text, uuid),
  public.admin_content_discard_draft(uuid, text, text, text, text, uuid),
  public.admin_content_submit(uuid, text, text, text[], jsonb, text, text, uuid),
  public.admin_content_withdraw(uuid, uuid, text, text, uuid),
  public.admin_content_decline(uuid, uuid, text, text, text, uuid),
  public.admin_content_publish(uuid, uuid, text, text, text, uuid),
  public.admin_content_rollback(uuid, uuid, text, text, text, uuid)
  to service_role;
