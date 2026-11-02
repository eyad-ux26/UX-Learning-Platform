# ID scheme

| Thing | Format | Example |
| --- | --- | --- |
| Path | `P` + 2 digits | `P10` |
| Unit | path + `-U` + 2 digits | `P10-U01` |
| Lesson | unit + `-L` + 2 digits | `P10-U01-L03` |
| Step | `S` + 2 digits, inside a lesson | `P10-U01-L03-S04` in full |
| Skill | `SK-` + unit + `-` + 2 digits | `SK-P10-U01-03` |
| Re-test bank | unit + `-B` + 2 digits | `P10-U01-B01` |
| Misconception | `MC-` + path + `-` + 3 digits | `MC-P10-007` |
| Step type | `ST01` to `ST10` | see the learning model |
| Learning rule | `R01` to `R40`, from the learning psychology reference | `R11` contrasting cases |
| UI rule | `U01` to `U60`, from the UI/UX reference | `U51` alternatives to dragging |

Misconception IDs are shared across a path, so the same mistake keeps the same ID wherever it shows up. That's what lets review pick the patterns a learner repeats.

## Retired schemes

| Old | Where it came from | Now |
| --- | --- | --- |
| `PATH-010`, `PATH-010-L01`, `PATH-010-A01` | Content master v1.1 | `P10`, lessons rebuilt as `P10-Uxx-Lxx` |
| `LS-001` to `LS-013` | Content master learning references | `R01` to `R40` |
| `R01` to `R31` | Research and product dossier | `R01` to `R40` (different numbering, don't mix) |
| `TYPE-001` to `TYPE-009`, `EX01` to `EX12` | Master and dossier activity types | `ST01` to `ST10` for phase 1; TYPE-005 to TYPE-009 come back with later paths |
| `C1` to `C5`, `O1` to `O5` | Path 10 competencies and objectives | Skills listed in each `unit.yaml`, such as `SK-P10-U01-01` |
| `SK-P10-U01` (one skill per unit) | First learning model | Several skills per unit, `SK-P10-U01-01` and up |
