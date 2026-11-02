-- Slice 2: re-test banks are stored as lessons with mode 'bank' (never listed on the path map),
-- so a mastery round can reference them like any other lesson version.
alter table public.lessons drop constraint if exists lessons_mode_check;
alter table public.lessons add constraint lessons_mode_check check (mode in ('lesson', 'check', 'bank'));
