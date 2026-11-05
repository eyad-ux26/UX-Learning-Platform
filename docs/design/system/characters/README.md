# Scenario characters

Eight original people who tell the learner the scenario before a question. Approved by Admins on 2026-11-02.

| id | Name | Arabic | Role | Used for |
| --- | --- | --- | --- | --- |
| hana | Hana | هناء | Gym owner (sport hijab) | Hana's Gym steps |
| sara | Sara | سارة | Product designer | Lunch To Go compare step |
| tarek | Tarek | طارق | Product manager | Lunch To Go words step |
| mona | Mona | منى | Design lead | Office lunch order and spot steps |
| nour | Nour | نور | Clinic manager | Mastery round (Nour's clinic) |
| karim | Karim | كريم | Front-end developer | Not used yet |
| youssef | Youssef | يوسف | Shop owner | Not used yet |
| rami | Rami | رامي | Junior designer | Not used yet |

All four women wear a hijab. People mentioned inside a scenario who are not speaking (Salma the gym visitor, Tamer, Ahmed the patient) are not drawn.

## Files

- `svg/uxgate-char-<id>-<face>-<version>.svg`, 240 x 240.
  - face: `talk` (while the scenario is on screen), `smile` (after a right answer), `think` (after a wrong answer).
  - version: `avatar` (round tile, used in the lesson) or `bust` (cut-out, for larger moments).
- `cast.json`: names, roles and ages in English and Arabic.
- `gen.py`: draws every file (`python3 gen.py <out dir>`). Change the art here, never by hand-editing the SVGs.

The characters are built from simple shapes by this script, with no stock art and no reference characters.

## In the lesson

The speaker block replaces the plain scenario line: `.say` > `img.say-face` + `.say-bubble` (`.say-name` "Name · Role", then the scenario in first person). The styles are in `uxgate.css`.

| Where | Avatar | Text |
| --- | --- | --- |
| Sprint 1 phone screens | 64 px | 15 px |
| Lesson player on a phone (`.lp-mobile`) | 52 px | 14 px |
| Desktop (`.say-lg`, `.lp-desktop`) | 88 px | 18 px |

The bubble is static content, so it has no ledge. Its tail points at the avatar and flips in RTL. Each step names one speaker (`say` in LessonKinds), and every lesson keeps the same speaker from start to end.
