# Metrics and events

Most measures come from tables the app already writes (`attempts`, `step_results`, `subscriptions`), so we track few extra events. No third-party trackers.

## Beta measures

| Measure | Definition | Source |
| --- | --- | --- |
| Guest activation | Guests who finish the sample lesson and then sign up, within 24 h | `attempts` (guest_key → user_id) |
| Onboarding completion | Sign-ups who finish or skip onboarding and start a lesson the same day | `onboarding`, `attempts` |
| Lesson completion | Started lessons that finish | `attempts.finished_at` |
| Correction rate | Wrong first tries later answered right in the same lesson | `step_results` |
| Transfer rate | Independent success on independent steps and skill checks | `step_results.outcome` by `part` |
| Retention (kept) | Skills that reach Kept out of skills Shown 3+ days ago | `skill_states` |
| Habit | Learners active on 3+ distinct days in their first 7 | `daily_activity` |
| Conversion | Free learners who subscribe within 14 days of sign-up | `subscriptions` |
| Refund rate | Payments refunded within 7 days | `payments` |
| Appeals | Appeals per 1,000 graded steps, and share accepted | `appeals` |

## Content quality flags (admin)

A step or variant is flagged when, with at least 30 attempts: first-try success is under 25% or over 95%, reveal rate is over 20%, or one wrong option takes more than 60% of wrong answers.

## Extra events (Vercel Web Analytics custom events)

`landing_cta`, `sample_lesson_start`, `signup_start`, `paywall_view`, `checkout_start`, `push_permission`, `achievement_page_on`.
