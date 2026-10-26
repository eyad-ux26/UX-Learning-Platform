# Learning model

Approved on 26 October 2026. The full proposal, with the audit of the original drafts, is in the shared doc "Content audit and learning model".

## Structure

| Level | What it is | Size |
| --- | --- | --- |
| Path | A job-ready ability | 4 to 6 units, 15 to 25 lessons |
| Unit | One skill: verb, situation, criterion | 3 to 5 lessons, the last one a skill check |
| Lesson | One sitting | 5 to 10 minutes, 8 to 12 steps |
| Step | One decision, then Check | 20 to 60 seconds |

The whole first unit of every path is free.

## Lesson anatomy

1. **Hook**: a real scenario and the visitor's goal.
2. **Try first**: one ungraded prediction before any teaching (R12).
3. **Concept**: the idea in under about 60 words.
4. **Guided**: 3 to 5 steps with Check; hints appear after a wrong answer.
5. **Contrast**: two close versions; pick the better one and the deciding factor (R11).
6. **Independent**: a new case, ideally a different product (R14).
7. **Recap**: skill shown, one pattern to review, next lesson (R40).

A **skill check** lesson uses a new scenario, shows no hints and no per-step verdict, and summarizes at the end (R19).

## Feedback and help

- Selecting an answer never shows if it's right; only Check does (U25).
- Right answers get one line, with "Why?" for the reasoning. Defensible alternatives are accepted with their own feedback ("Also works").
- Wrong answers get the feedback for the matching misconception, or a general prompt to look again, then Try again. The first answer is kept.
- Up to 2 hints. After 3 wrong attempts, "Show the answer" reveals the worked reasoning.
- Each result is recorded as **independent** (first try, no hint), **supported**, or **revealed**. Only independent results count as skill evidence. XP: 10, 5 and 0.
- About 2 steps per lesson ask for confidence before Check (R20). Confident errors go first in review.

## Skill states

Practiced (lessons done) → Shown (skill check passed unaided) → Kept (passed again in spaced review at least 3 days later, on a new scenario).

## Motivation, with guardrails

XP weighted toward independent answers; daily goal of 1 to 3 lessons with a chosen time cue; streak with up to 2 earned freezes; weekly leaderboards that are off until the learner opts in; skill badges; review reminders. No hearts, energy, paid streak repairs, timers on thinking steps, or loss-framed exit warnings.

## Step types

| ID | YAML `type` | What the learner does |
| --- | --- | --- |
| ST01 | `choose` (optional `reason`) | Picks an option, then the reason |
| ST02 | `spot` | Taps the faulty area of a screen, or picks it from a list |
| ST03 | `sort` | Puts items into 2 to 4 groups |
| ST04 | `order` | Orders items with move up / move down |
| ST05 | `compare` | Picks the better of two screens, then the deciding factor |
| ST06 | `tune` | Tries options and sees a live preview |
| ST07 | `match` | Pairs items in two lists |
| ST08 | `words` | Picks the best microcopy |
| ST09 | `predict` | Predicts an outcome; can be ungraded (`any_ok`) |
| ST10 | `fix` | Picks the change that fixes a broken screen |

Every step works on a phone and with a keyboard. No step needs drag and drop (U51).
