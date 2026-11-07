-- The one-time "check the name" step before a learner's first certificate (design S3-16). The server sets it (service role);
-- the browser's column grants on profiles do not include it, so a learner cannot mark it themselves from the client.
alter table public.profiles add column name_confirmed_at timestamptz;
