-- 0036: subscriptions (slice 5). UXGate Pro through Paymob (Egypt) and Paddle (everyone else).
-- Rules:
--   * The app checks only `entitlements` (one row per learner). Webhooks and the daily billing job write it, with the service role.
--   * No card data is stored: provider ids, the card brand and its last 4 digits only. Paymob's saved-card token is
--     encrypted by the app before it is stored, and nobody but the service role can read it.
--   * A learner can read their own billing rows; nobody but the service role writes any of them.

-- ───────── what the app checks ─────────
create table public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  valid_until timestamptz,          -- Pro is on while now() < valid_until
  pro_since timestamptz,            -- first day of the current run of Pro
  pro_ended_at timestamptz,         -- when Pro last ended (welcome back needs 60 days without Pro)
  -- 'mock' when Pro came from the test payment page on a preview host. Production never counts it (has_pro, readPro).
  -- 'manual' when admins granted Pro with SQL (supabase/README.md): counted everywhere, never renewed or charged.
  source text not null default 'live' check (source in ('live', 'mock', 'manual')),
  updated_at timestamptz not null default now()
);

-- Country the learner pays from, and the provider's customer id.
create table public.billing_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  country text not null check (country ~ '^[A-Z]{2}$'),
  paddle_customer_id text,
  updated_at timestamptz not null default now()
);

-- ───────── subscriptions and payments ─────────
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('paymob', 'paddle', 'mock')),
  provider_sub_id text,             -- Paddle's sub_...; Paymob renewals are ours, so null
  region text not null check (region in ('eg', 'gulf', 'arab', 'world')),
  country text not null,
  period text not null check (period in ('month', 'year')),
  currency text not null,
  renew_amount_minor integer not null check (renew_amount_minor >= 0),
  discount text check (discount in ('student', 'welcome_back', 'founding')),
  discount_until timestamptz,       -- renewals before this date keep the discount
  status text not null check (status in ('active', 'grace', 'cancelled', 'paused', 'ended', 'refunded')),
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  grace_until timestamptz,          -- failed renewal: Pro stays on until here
  next_retry_at timestamptz,        -- failed renewal: the next try (day 2, then day 5)
  retries integer not null default 0,
  pending_period text check (pending_period in ('month', 'year')), -- plan change at the period end
  pay_method text check (pay_method in ('card', 'wallet')),
  card_brand text,
  card_last4 text check (card_last4 is null or card_last4 ~ '^[0-9]{4}$'),
  card_expiry text check (card_expiry is null or card_expiry ~ '^[0-9]{2}/[0-9]{2}$'),
  cancel_reason text,
  cancelled_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_sub_id)
);
-- One live plan per learner.
create unique index subscriptions_one_live on public.subscriptions (user_id) where status in ('active', 'grace', 'cancelled');
create index subscriptions_due on public.subscriptions (current_period_end) where status in ('active', 'grace', 'cancelled');

create sequence public.receipt_no_seq;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  provider text not null check (provider in ('paymob', 'paddle', 'mock')),
  provider_payment_id text not null,
  receipt_no text not null unique default ('UXG-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.receipt_no_seq')::text, 6, '0')),
  kind text not null check (kind in ('first', 'renewal')),
  period text not null check (period in ('month', 'year')),
  amount_minor integer not null check (amount_minor >= 0),
  currency text not null,
  status text not null check (status in ('paid', 'refunded')),
  pay_method text check (pay_method in ('card', 'wallet')),
  card_brand text,
  card_last4 text check (card_last4 is null or card_last4 ~ '^[0-9]{4}$'),
  paid_at timestamptz not null,
  period_end timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);
create index payments_user on public.payments (user_id, paid_at desc);

-- One checkout attempt: what the learner chose, priced by the server, and how it ended.
create table public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'new' check (kind in ('new', 'renewal')),
  subscription_id uuid references public.subscriptions (id) on delete set null, -- kind 'renewal': the plan this pays for
  provider text not null check (provider in ('paymob', 'paddle', 'mock')),
  region text not null,
  country text not null,
  period text not null check (period in ('month', 'year')),
  discount text check (discount in ('student', 'welcome_back', 'founding')),
  discount_until timestamptz,
  code text,
  amount_minor integer not null,
  renew_amount_minor integer not null,
  currency text not null,
  locale text not null default 'en' check (locale in ('en', 'ar')),
  status text not null default 'open' check (status in ('open', 'pending', 'paid', 'failed', 'cancelled')),
  provider_ref text,                -- Paymob intention id / Paddle transaction id
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index checkout_sessions_user on public.checkout_sessions (user_id, created_at desc);

-- Every webhook as received, once. (provider, event_id) makes a repeated delivery a no-op.
create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  claimed_at timestamptz,           -- set while one request applies the event, so a parallel repeat waits its turn
  processed_at timestamptz,
  error text,
  unique (provider, event_id)
);

-- Paymob saved card for renewals. `token` is encrypted by the app (AES-GCM, BILLING_TOKEN_KEY).
create table public.payment_tokens (
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('paymob', 'mock')),
  token text not null,
  card_brand text,
  card_last4 text,
  card_expiry text,
  created_at timestamptz not null default now(),
  primary key (user_id, provider)
);

-- ───────── refunds, discounts, student check ─────────
create table public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  payment_id uuid not null unique references public.payments (id) on delete cascade,
  amount_minor integer not null,
  currency text not null,
  reason text not null check (char_length(reason) between 1 and 1000),
  status text not null default 'waiting' check (status in ('waiting', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

create table public.discount_codes (
  code text primary key check (code = upper(code)),
  kind text not null check (kind in ('founding')),
  percent integer not null check (percent between 1 and 90),
  period text check (period in ('month', 'year')),   -- null: both
  region text check (region in ('eg', 'gulf', 'arab', 'world')), -- null: every region
  first_period_only boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true
);
insert into public.discount_codes (code, kind, percent, period, first_period_only) values ('FOUNDING', 'founding', 30, 'year', true);

create table public.student_checks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  token_hash text,
  sent_at timestamptz,
  expires_at timestamptz,
  verified_at timestamptz,
  valid_until timestamptz
);

-- Billing emails sent, once each: (user, kind, ref) is unique, so a repeated webhook sends nothing new.
create table public.billing_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  kind text not null,
  ref text not null,
  locale text not null,
  to_email text not null,
  provider_id text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'skipped', 'failed')),
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref)
);

-- ───────── row-level security ─────────
alter table public.entitlements enable row level security;
alter table public.billing_accounts enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.checkout_sessions enable row level security;
alter table public.billing_events enable row level security;
alter table public.payment_tokens enable row level security;
alter table public.refund_requests enable row level security;
alter table public.discount_codes enable row level security;
alter table public.student_checks enable row level security;
alter table public.billing_emails enable row level security;

create policy "own entitlement read" on public.entitlements for select to authenticated using (user_id = (select auth.uid()));
create policy "own billing account read" on public.billing_accounts for select to authenticated using (user_id = (select auth.uid()));
create policy "own subscriptions read" on public.subscriptions for select to authenticated using (user_id = (select auth.uid()));
create policy "own payments read" on public.payments for select to authenticated using (user_id = (select auth.uid()));
create policy "own checkout sessions read" on public.checkout_sessions for select to authenticated using (user_id = (select auth.uid()));
create policy "own refund requests read" on public.refund_requests for select to authenticated using (user_id = (select auth.uid()));
-- billing_events, payment_tokens, discount_codes, student_checks, billing_emails: no policies, service role only.

-- Learners and visitors only ever read; every write goes through the server.
revoke all on public.entitlements, public.billing_accounts, public.subscriptions, public.payments, public.checkout_sessions,
  public.refund_requests, public.billing_events, public.payment_tokens, public.discount_codes, public.student_checks,
  public.billing_emails from anon, authenticated;
revoke all on sequence public.receipt_no_seq from anon, authenticated;
grant select on public.entitlements, public.billing_accounts, public.subscriptions, public.payments, public.checkout_sessions,
  public.refund_requests to authenticated;
grant all on public.entitlements, public.billing_accounts, public.subscriptions, public.payments, public.checkout_sessions,
  public.refund_requests, public.billing_events, public.payment_tokens, public.discount_codes, public.student_checks,
  public.billing_emails to service_role;
grant usage, select on sequence public.receipt_no_seq to service_role;

-- Is this learner on Pro right now? For SQL callers (later: certificates, video tokens). Server only.
create function public.has_pro(p_user uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.entitlements e where e.user_id = p_user and e.plan = 'pro' and e.source in ('live', 'manual') and e.valid_until > now())
$$;
revoke all on function public.has_pro(uuid) from public, anon, authenticated;
grant execute on function public.has_pro(uuid) to service_role;
