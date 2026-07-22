# 04 — Session logging

**What to build:** The core gym-facing flow: the user picks a Workout and starts a Session. For each Exercise in the Workout, they log one or more Sets (weight in lbs × reps); fields pre-fill from the most recent prior Session for that same Workout, or start empty if there's no prior Session. The Session records a start time and end time, and an optional free-text notes field. This ticket implements the full schema and the ADR-0001 snapshot semantics: at creation, the Session copies the Workout's current name and exercise list (by ID) so later Workout edits never retroactively change it. It also implements the Exercise-reference-with-denormalized-fallback behavior from the spec (renaming an Exercise updates its display on past Sessions; deleting one falls back to the name captured at log time).

**Blocked by:** 03 — needs Workouts to log Sessions against.

**Status:** ready-for-agent

- [ ] The user can start a Session by picking one of their Workouts
- [ ] Each Exercise in the Workout appears in the Session with fields to log one or more Sets (weight, reps)
- [ ] The user can add multiple Sets per Exercise within a Session
- [ ] When starting a Session, each Exercise's Set fields pre-fill from the most recent prior Session logged against the same Workout; if there is no prior Session, fields start empty
- [ ] The Session records a start time and an end time
- [ ] The user can add optional free-text notes to a Session
- [ ] All weight values are treated as pounds (no unit field/selector)
- [ ] Editing a Workout after a Session has been logged against it does not change what that Session displays (verified by a test per ADR-0001)
- [ ] Renaming an Exercise updates the displayed name on past Sessions that reference it; deleting an Exercise leaves past Sessions displaying the name captured at log time
- [ ] Store operations `startSession`, `logSet`, `updateSet`, `endSession`, `updateSessionNotes`, `getLastSessionForWorkout` exist and are covered by tests (in-memory fake persistence, no DOM/browser APIs)
