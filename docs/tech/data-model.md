# Data model

Postgres on Supabase. All tables have `created_at` and, where they change, `updated_at`. Learner tables have row-level security: a learner reads and writes only their own rows; admins go through server actions with the service role.

## Content

| Table | Key columns | Notes |
| --- | --- | --- |
| `paths` | `id` (P10), `kind` (interactive, hybrid), `order`, `title` jsonb {en, ar}, `subtitle`, `status` (draft, published) | |
| `units` | `id` (P10-U01), `path_id`, `order`, `title`, `free` bool | Unit 1 is free |
| `skills` | `id` (SK-P10-U01-01), `unit_id`, `title`, `criterion` | |
| `lessons` | `id` (P10-U01-L01), `unit_id`, `order`, `mode` (lesson, check), `minutes` | |
| `content_versions` | `id`, `lesson_id`, `hash`, `body` jsonb, `published_at`, `published_by` | Immutable once published |
| `retest_variants` | `id`, `skill_id`, `content_version_id`, `step` jsonb, `scenario_key` | The per-unit retest bank |
| `misconceptions` | `id` (MC-P10-007), `path_id`, `label` jsonb | Shared across a path |
| `media` | `id`, `bunny_video_id`, `title`, `duration_s`, `captions` jsonb {en_url, ar_url}, `kind` (concept, example) | |

## Learners

| Table | Key columns | Notes |
| --- | --- | --- |
| `profiles` | `user_id` (auth.users), `display_name`, `handle`, `locale`, `theme`, `time_zone`, `daily_goal`, `reminder_time`, `achievement_page` bool, `deleted_at` | Created by trigger |
| `onboarding` | `user_id`, `goal`, `experience`, `weekly_time`, `recommended_path_id` | |
| `enrollments` | `user_id`, `path_id`, `started_at`, `current_lesson_id` | |
| `attempts` | `id`, `user_id` (nullable for guest until claimed), `guest_key`, `lesson_id`, `content_version_id`, `started_at`, `finished_at`, `kind` (lesson, check, mastery, review) | |
| `step_results` | `id`, `attempt_id`, `step_id`, `skill_id`, `try_no`, `answer` jsonb, `correct` bool, `confidence`, `hints_used`, `revealed` bool, `outcome` (independent, supported, revealed), `misconception_id`, `client_ts`, `idempotency_key` unique | First try always kept |
| `skill_states` | `user_id`, `skill_id`, `state` (practiced, shown, kept), `shown_at`, `kept_at`, `next_review_at` | |
| `review_queue` | `user_id`, `skill_id`, `due_at`, `priority`, `reason` (confident_error, spaced) | |
| `xp_events` | `user_id`, `amount`, `source` (step_result id), `day` | Summed, never edited |
| `daily_activity` | `user_id`, `day`, `lessons_done`, `goal_met`, `freeze_used` | Drives streaks |
| `streaks` | `user_id`, `current`, `longest`, `freezes_available` | |
| `badges` | `user_id`, `badge_key`, `earned_at` | |
| `certificates` | `id`, `user_id`, `path_id`, `issued_at`, `public` bool | |
| `leaderboard_optins` | `user_id`, `opted_in_at` | Feature-flagged |
| `appeals` | `id`, `user_id`, `step_result_id`, `reason`, `status` (open, accepted, declined), `answer`, `handled_by` | |

## Billing

| Table | Key columns | Notes |
| --- | --- | --- |
| `prices` | `currency`, `amount_minor`, `provider`, `provider_price_id`, `active` | Set by admins |
| `subscriptions` | `id`, `user_id`, `provider` (paymob, paddle), `provider_sub_id`, `status`, `current_period_end`, `cancel_at_period_end` | |
| `payments` | `id`, `subscription_id`, `provider_payment_id`, `amount_minor`, `currency`, `status`, `paid_at`, `refunded_at` | |
| `billing_events` | `id`, `provider`, `event_id` unique, `payload` jsonb, `processed_at` | Raw webhooks, idempotent |
| `entitlements` | `user_id`, `plan` (free, pro), `valid_until` | The only thing the app checks |
| `payment_tokens` | `user_id`, `provider`, `token` (encrypted) | Paymob renewals |

## Platform

| Table | Key columns | Notes |
| --- | --- | --- |
| `notifications` | `id`, `user_id`, `kind`, `payload`, `read_at` | In-app inbox |
| `push_subscriptions` | `id`, `user_id`, `endpoint`, `keys` | |
| `email_log` | `id`, `user_id`, `template`, `resend_id`, `status` | Shown in support view |
| `templates` | `key`, `channel` (email, push, inapp), `body` jsonb {en, ar} | Edited in admin |
| `settings` | `key`, `value` jsonb, `updated_by` | Feature flags and rules |
| `admin_roles` | `user_id`, `role` (owner, content_editor, support) | |
| `audit_log` | `id`, `admin_id`, `action`, `target`, `before` jsonb, `after` jsonb, `at` | Append only |
| `data_requests` | `id`, `user_id`, `kind` (export, delete), `status`, `due_at` | Delete due in 30 days |

## Derived rules

- **Outcome:** independent = right on try 1 with no hint; supported = right after a hint or a retry; revealed = answer shown.
- **XP:** 10 / 5 / 0 per outcome; written to `xp_events` by the server only.
- **Skill state:** Shown when the skill check step for the skill is independent; Kept when a later review on a new scenario, at least 3 days after Shown, is independent.
- **Streak:** a day counts when `lessons_done >= daily_goal` in the learner's time zone; a missed day uses a freeze if one is available; freezes are earned (max 2) by meeting the goal on two extra days in a week.
