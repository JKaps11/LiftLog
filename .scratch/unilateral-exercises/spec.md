Status: ready-for-agent

# Unilateral Exercises — Spec

## Problem Statement

Some Exercises are unilateral — performed one side of the body at a time (e.g. Single Arm Row, Single Leg Press). Today the app has no way to mark an Exercise as unilateral, and a Set only records one weight/reps pair, with no notion of which side it was performed on. Logging a unilateral Exercise currently means either lumping both sides into one Set (losing per-side weight/reps, which often differ) or manually adding two indistinguishable Sets with no visual grouping to show they're a pair.

## Solution

Add an `isUnilateral` flag to Exercise, settable both when creating an Exercise and when editing an existing one (so the user can retroactively tag their existing exercise list). When logging a Set against a unilateral Exercise, "Add set" logs both a left-side and a right-side Set together as one paired unit, left always first. The Session logging/history UI renders Sets as a flat per-Exercise list as it does today, but groups each logical unit visually (a divider between one plain Set, or one left+right pair, and the next), so unilateral pairs read as one row-group rather than two unrelated rows. Deleting a unilateral Set removes both sides of its pair together. Marking an Exercise unilateral only changes behavior for Sets logged from that point forward — Sets already logged before the flag was set keep rendering as plain, unpaired rows, consistent with ADR-0001 (Sessions/Sets are not retroactively reinterpreted by later Exercise edits).

## User Stories

1. As the user, I want to mark an Exercise as unilateral when I create it, so that single-arm/single-leg movements are logged correctly from the start.
2. As the user, I want to mark an existing Exercise as unilateral after the fact, so that I can go back and tag my current exercise list (e.g. Single Arm Row, Bulgarian Split Squat) without recreating them.
3. As the user, I want to un-mark an Exercise as unilateral if I tagged it by mistake, so that I can correct a mistagging.
4. As the user, when I tap "Add set" on a unilateral Exercise, I want both a left and a right Set logged together in one action, so that I don't have to remember to add a second one myself.
5. As the user, I want the left Set of a pair to always come before the right Set, so that the log is consistent and easy to scan across every unilateral Exercise.
6. As the user, I want to edit the weight or reps of the left and right Sets independently, so that I can record a real difference in strength or fatigue between sides.
7. As the user, when I delete a unilateral Set, I want both sides of that pair removed together, so that I never end up with a lopsided single leftover Set I didn't intend to keep.
8. As the user, I want a plain (non-unilateral) Set's "Add set"/delete behavior to work exactly as it does today, so that nothing changes for the majority of my exercises.
9. As the user, I want a visual divider between each logical Set (one plain Set, or one left+right pair) in the Session logging and history views, so that I can tell at a glance where one Set ends and the next begins, especially for unilateral pairs.
10. As the user, I want an Exercise's unilateral flag to only affect Sets logged after I set it, so that Sets I already logged before tagging the Exercise keep displaying exactly as they always have, even if I later mark that Exercise unilateral.
11. As the user, I want old, pre-existing Sets that have no left/right side recorded to always render as plain rows, so that historical data isn't reinterpreted or corrupted by a later Exercise edit.

## Implementation Decisions

- **Schema — Exercise**: add `isUnilateral: boolean` to `Exercise`. This is a single dedicated boolean, not a general-purpose Exercise tag/category system — `isUnilateral` is currently the only Exercise attribute that changes app behavior, so a generic tagging system is not being built.
- **Schema — SessionSet**: add an optional `side?: 'left' | 'right'` field. Present only on Sets logged against a unilateral Exercise going forward; absent (`undefined`) on all pre-existing Sets and on Sets logged for non-unilateral Exercises.
- **Store — creating/editing an Exercise**: `createExercise` takes an `isUnilateral` flag alongside the name. The existing Exercise-edit path (today just `renameExercise`) is extended so `isUnilateral` can also be updated on an already-created Exercise — this is required for the user's retroactive tagging pass over their current exercise list, not just at creation time.
- **Store — logSet**: when the target Exercise (looked up live by `exerciseId` at the time `logSet` is called) has `isUnilateral: true`, logging a Set appends two `SessionSet` entries to that Exercise's `sets` array in one call — `{ ...set, side: 'left' }` followed immediately by `{ ...set, side: 'right' }` — instead of the single entry appended today. For a non-unilateral Exercise, behavior is unchanged (one entry, no `side`).
- **Store — deleteSet**: pairing is derived from adjacency, not a stored pair/group id. Because pairs are always created together (by `logSet`) and always removed together (by this same rule), a unilateral Exercise's `sets` array maintains an invariant that every `side: 'left'` entry is immediately followed by its `side: 'right'` partner. Deleting a Set that has a `side` field removes it together with its adjacent partner (the other half of the pair) in the same operation; deleting a Set with no `side` field (plain Set) behaves exactly as it does today, removing only that one entry.
- **Retroactivity (per ADR-0001)**: toggling `isUnilateral` on an Exercise never rewrites or reinterprets Sets already logged. Rendering/pairing logic is driven entirely by the presence of `side` on each individual `SessionSet`, never by the Exercise's current `isUnilateral` value — so a Set logged before the flag was set (no `side`) always renders as a plain row, even inside a Session for an Exercise that is now flagged unilateral, and even in a brand-new Session if `isUnilateral` is later reverted to `false` after some paired Sets already exist.
- **UI — Exercise create/edit**: `ExercisesPage` gains an "Unilateral" checkbox alongside the name field, present in both the create form and the existing rename/edit flow.
- **UI — Session logging/history**: `SessionExerciseCard` renders `entry.sets` as it does today (a flat list), but inserts a visual divider between logical Set-groups — a lone Set with no `side`, or a `side: 'left'`/`side: 'right'` pair, forms one group; consecutive groups are separated by the divider. No divider appears between the left and right rows of the same pair.
- **Migration of existing data**: no bulk/automatic detection of which existing Exercises are unilateral. The user will manually go through their current Exercise list and check the box for the relevant ones (e.g. Single Arm Row) via the same edit UI described above.
- **Dexie schema**: no version bump required — `isUnilateral` and `side` are plain object fields, not part of any Dexie index.

## Testing Decisions

- Tests target the `Store` class directly, using the existing in-memory fake `EntityTable` in place of Dexie/IndexedDB (`src/store/store.test.ts` pattern) — no DOM, no component rendering, no browser APIs.
- Only Store's external behavior is tested (its public method inputs/outputs and the persisted Session/Exercise state), not internal structure.
- Priority scenarios to cover:
  - `createExercise` with `isUnilateral: true` persists the flag; defaults to `false`/unset when omitted, matching today's behavior for existing callers.
  - Updating an existing Exercise's `isUnilateral` flag (both `false → true` and `true → false`) persists correctly.
  - `logSet` against a unilateral Exercise appends exactly two Sets (`side: 'left'` then `side: 'right'`) with the same weight/reps as the single `set` passed in.
  - `logSet` against a non-unilateral Exercise appends exactly one Set with no `side`, unchanged from today.
  - `deleteSet` on either Set of a unilateral pair removes both from the Exercise's `sets` array, leaving the rest of the array (other Sets/pairs) intact and in order.
  - `deleteSet` on a plain (no-`side`) Set removes only that one Set, unchanged from today.
  - A Set logged before an Exercise was marked unilateral (no `side`) is left completely unmodified after the Exercise's `isUnilateral` flag is later toggled — no retroactive pairing or reinterpretation.
- No component-level tests are being added for this feature — `ExercisesPage`'s checkbox and `SessionExerciseCard`'s divider rendering are thin wiring over `Store` and are covered by manual verification instead, consistent with the rest of this codebase (which has no existing component test suite).

## Out of Scope

- A general-purpose Exercise tagging/categorization system (muscle group, equipment type, etc.) — only the single `isUnilateral` boolean is being added.
- User-configurable starting side (always left-then-right; no per-exercise or per-session override).
- Independent (non-paired) deletion of one side of a unilateral pair.
- Any reordering-of-sets feature; the adjacency invariant this design relies on assumes Sets are only ever added at the end and removed in pairs — a future reordering feature would need to revisit the pairing mechanism.
- Retroactively reinterpreting or backfilling `side` onto Sets logged before this feature existed.
- Bulk/automatic detection of which existing Exercises should be marked unilateral.
- Left/right-specific stats, imbalance tracking, or strength-over-time graphing broken out by side.

## Further Notes

- This spec builds directly on the existing Store seam and Session/Set schema described in `CONTEXT.md` and `.scratch/workout-app/spec.md`; it does not introduce any new architectural layer.
- ADR-0001 ("Sessions snapshot their Exercises, independent of later Workout edits") establishes the precedent this spec follows for `isUnilateral`/`side`: later Exercise edits must not retroactively change already-logged data.
