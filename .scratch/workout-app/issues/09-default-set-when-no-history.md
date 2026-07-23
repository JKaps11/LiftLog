# 09 — Default 1 empty set when exercise has no history

**What to build:** When a Session is started and an exercise has no prior sets recorded for that Workout — either because the Workout has never been logged, or because the exercise was just added to an already-logged Workout (Workouts are editable per `docs/adr/0001-sessions-are-snapshots.md`; Sessions are immutable snapshots) — the exercise now starts with one empty set (`{ weight: 0, reps: 0 }`) instead of zero, so there's always a row ready to log into. When history *does* exist, behavior is unchanged: all prior sets are still copied as defaults.

**Blocked by:** None — can start immediately

**Status:** done

- [x] `Store.startSession` falls back to a single default set (`emptySet()`, same shape as the manual "+ add set" action) instead of `[]` when no prior sets exist for an exercise
- [x] Fallback fires both when a Workout's first Session is started, and when an exercise newly added to an already-logged Workout is encountered in a later Session
- [x] `startSession` test coverage in `src/store/store.test.ts` for the no-history case (expects `sets: [emptySet()]`, not `[]`)
- [x] Existing "copies prior sets" test cases updated to account for the new leading default set (unavoidable: it's what "prior sets" now legitimately contains)
- [x] Manual check: starting a Session for a new Workout shows one empty, editable set row per exercise (confirmed via `ActiveSession.tsx`/`SessionDetail.tsx` rendering `sets` as input rows through `onSetChange`), no "+ add set" tap required first

## Comments

Changed the `priorSets` fallback in `startSession` (`src/store/index.ts`) from `?? []` to
`?? [emptySet()]`. Added a shared `emptySet()` factory in `src/store/types.ts` (re-exported
from `src/store/index.ts`) to replace the `{ weight: 0, reps: 0 }` literal that was duplicated
across `startSession`, `useSessionEditing.handleAddSet`, and the test file.

Code review (Standards + Spec axes) flagged that a session's initial placeholder set is
structurally indistinguishable from a real logged set, and that using `logSet` (the "+ add
set" action) instead of editing the placeholder row in place would leave a stray `{0,0}`
that copies forward into future sessions. Verified against `ActiveSession.tsx`/`SessionDetail.tsx`:
sets render as editable input rows from `entry.sets` via `onSetChange` (→ `Store.updateSet`),
so the pre-filled row is meant to be edited in place — this matches the ticket's intent and
isn't a regression (any set could already be left at 0/0 via manual editing). No fix needed
beyond the `emptySet()` de-duplication.

Existing `updateSet`/`deleteSet`/`logSet` tests around index 0 were updated to index 1 where
they exercised a set logged *after* the now-always-present placeholder at index 0.
