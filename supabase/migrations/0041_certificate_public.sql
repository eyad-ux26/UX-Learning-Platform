-- S3-16: a certificate has its own public page (/c/[code]), off by default and separate from the achievement page (profiles.share_enabled).
-- Written by the server (service role) only: learners can still only read their own rows. public_changed_at busts LinkedIn's preview cache.
alter table public.certificates
  add column public boolean not null default false,
  add column public_changed_at timestamptz not null default now();
