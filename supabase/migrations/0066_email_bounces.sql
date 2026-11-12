-- Emails that never arrived, from the Resend webhook (/api/webhooks/resend): a bounce, a spam complaint, or an
-- address on Resend's suppression list. Team and roles shows it next to an open invite, so the inviter knows to copy
-- the link and send it another way. Service role only: no policies, so learners and the anon key see nothing.
create table public.email_bounces (
  id bigint generated always as identity primary key,
  email text not null check (email = lower(email) and email like '%@%'),
  kind text not null check (kind in ('bounced', 'complained', 'suppressed')),
  detail text check (char_length(detail) <= 300),
  resend_id text,
  event_id text not null,
  at timestamptz not null default now(),
  unique (event_id, email)
);
create index email_bounces_email on public.email_bounces (email, at desc);
alter table public.email_bounces enable row level security;
revoke all on public.email_bounces from anon, authenticated;
