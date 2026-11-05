-- 0038: the launch list and the team password's try counter. While the Coming Soon gate is on (apps/web/lib/coming-soon.ts), visitors leave their email here
-- to hear when UXGate opens. Double opt-in (design canvas v70, docs/design/prelaunch/README.md): an address joins the list
-- only once its owner opens the link in the confirmation email, which works for 7 days. Unconfirmed addresses are deleted
-- after 30 days. On launch day confirmed addresses get one email, with a link to leave the list.
-- Only the server touches it, with the service role, through the functions below; nobody else reads or writes the table.

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 3 and 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  -- One row per address, whatever its case or spaces.
  email_key text generated always as (lower(btrim(email))) stored unique,
  locale text not null default 'en' check (locale in ('en', 'ar')),
  -- What the visitor agreed to, word for word. consent_at is when they confirmed it from their inbox.
  consent_text text not null check (char_length(consent_text) between 1 and 500),
  consent_at timestamptz,
  -- Where on the site they joined (for example "coming-soon").
  source text check (char_length(source) <= 40),
  -- Keyed hash of the visitor's IP address (never the address itself), only to limit sign-ups per network.
  ip_hash text check (char_length(ip_hash) <= 128),
  -- SHA-256 of the newest confirmation link's token; the token itself is only in the email.
  confirm_token_hash text unique check (char_length(confirm_token_hash) <= 128),
  confirm_sent_at timestamptz,
  confirm_sends integer not null default 0,
  confirmed_at timestamptz,
  notified_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);
create index waitlist_ip_recent on public.waitlist (ip_hash, created_at);
create index waitlist_unconfirmed on public.waitlist (created_at) where confirmed_at is null;

alter table public.waitlist enable row level security; -- no policies: service role only
revoke all on public.waitlist from public, anon, authenticated;
grant select, insert, update, delete on public.waitlist to service_role; -- admins read and export it with the service role

-- Adds an address, or asks for a new confirmation email for one already there. Answers one of:
--   'send'      p_token_hash is now the address's link: send the confirmation email;
--   'pending'   a confirmation went out in the last 2 minutes, or 5 already went out: send nothing, say "sent";
--   'confirmed' the address is on the list;
--   'limited'   this network added p_limit new addresses in the last hour.
-- A stranger who types someone's address can at most cause a few confirmation emails; nothing joins without the link.
create function public.join_waitlist(p_email text, p_locale text, p_consent text, p_source text, p_ip_hash text, p_token_hash text, p_limit integer default 5)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_key text := lower(btrim(p_email));
  r public.waitlist;
begin
  select * into r from public.waitlist where email_key = v_key for update;
  if found then
    if r.confirmed_at is not null and r.unsubscribed_at is null then return 'confirmed'; end if;
    if r.confirm_sends >= 5 or r.confirm_sent_at > now() - interval '2 minutes' then return 'pending'; end if;
    update public.waitlist
      set locale = p_locale, consent_text = p_consent, confirm_token_hash = p_token_hash, confirm_sent_at = now(), confirm_sends = confirm_sends + 1
      where id = r.id;
    return 'send';
  end if;
  if p_ip_hash is not null and (select count(*) from public.waitlist where ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= p_limit then
    return 'limited';
  end if;
  insert into public.waitlist (email, locale, consent_text, source, ip_hash, confirm_token_hash, confirm_sent_at, confirm_sends)
    values (btrim(p_email), p_locale, p_consent, p_source, p_ip_hash, p_token_hash, now(), 1)
    on conflict (email_key) do nothing;
  return case when found then 'send' else 'pending' end;
end $$;

-- The confirmation email could not be sent: the next try may send at once, and this one does not count.
create function public.waitlist_send_failed(p_token_hash text)
returns void language sql security definer set search_path = public as $$
  update public.waitlist set confirm_sent_at = null, confirm_sends = greatest(confirm_sends - 1, 0) where confirm_token_hash = p_token_hash;
$$;

-- Opens a confirmation link. Returns the address and its language, or no row for an unknown or expired (7 days) link.
-- Opening the newest link again keeps answering while it is valid, so a second tap still shows "You're on the list".
create function public.confirm_waitlist(p_token_hash text)
returns table (email text, locale text) language plpgsql security definer set search_path = public as $$
begin
  return query
    update public.waitlist w
      set confirmed_at = coalesce(case when w.unsubscribed_at is null then w.confirmed_at end, now()),
          consent_at = coalesce(case when w.unsubscribed_at is null then w.consent_at end, now()),
          unsubscribed_at = null
      where w.confirm_token_hash = p_token_hash and w.confirm_sent_at > now() - interval '7 days'
      returning w.email, w.locale;
end $$;

-- Daily job: unconfirmed addresses older than 30 days are deleted. Returns how many.
create function public.prune_waitlist()
returns integer language sql security definer set search_path = public as $$
  with gone as (delete from public.waitlist where confirmed_at is null and created_at < now() - interval '30 days' returning 1)
  select count(*)::integer from gone;
$$;

revoke all on function public.join_waitlist(text, text, text, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.waitlist_send_failed(text) from public, anon, authenticated;
revoke all on function public.confirm_waitlist(text) from public, anon, authenticated;
revoke all on function public.prune_waitlist() from public, anon, authenticated;
grant execute on function public.join_waitlist(text, text, text, text, text, text, integer) to service_role;
grant execute on function public.waitlist_send_failed(text) to service_role;
grant execute on function public.confirm_waitlist(text) to service_role;
grant execute on function public.prune_waitlist() to service_role;

-- Team access (Coming Soon gate): tries of the team password before the sign-in page, counted per network (keyed IP hash)
-- and for everyone together, so guessing it from many addresses is slow too. Service role only.
create table public.team_gate_tries (
  bucket text primary key check (char_length(bucket) <= 140),
  window_start timestamptz not null default now(),
  hits integer not null default 0
);
alter table public.team_gate_tries enable row level security; -- no policies: service role only
revoke all on public.team_gate_tries from public, anon, authenticated;
grant select, insert, update, delete on public.team_gate_tries to service_role;

-- Counts one try and answers true while this network is within 5 tries per 15 minutes and everyone is within 100 per hour.
create function public.hit_team_gate(p_ip_hash text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_ip integer;
  v_all integer;
begin
  insert into public.team_gate_tries as t (bucket, window_start, hits) values ('ip:' || coalesce(p_ip_hash, 'none'), now(), 1)
  on conflict (bucket) do update
    set hits = case when t.window_start <= now() - interval '15 minutes' then 1 else t.hits + 1 end,
        window_start = case when t.window_start <= now() - interval '15 minutes' then now() else t.window_start end
  returning hits into v_ip;
  insert into public.team_gate_tries as t (bucket, window_start, hits) values ('all', now(), 1)
  on conflict (bucket) do update
    set hits = case when t.window_start <= now() - interval '1 hour' then 1 else t.hits + 1 end,
        window_start = case when t.window_start <= now() - interval '1 hour' then now() else t.window_start end
  returning hits into v_all;
  return v_ip <= 5 and v_all <= 100;
end $$;
revoke all on function public.hit_team_gate(text) from public, anon, authenticated;
grant execute on function public.hit_team_gate(text) to service_role;
