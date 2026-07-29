Status: ready-for-agent

# Timed Exercises — Spec

> **Partly superseded by ADR-0005 and `.scratch/pending-sets/spec.md`.** This spec's decision that a Set's rendering is driven by the presence of `durationSeconds` on the Set rather than by the Exercise's current `isTimed` value — and user story 7, which depends on it — has been reversed. Rendering now derives from the live Exercise. Everything else here still stands.

## Problem Statement

Some Exercises aren't measured by weight/reps at all — mobility work, stretches, and static holds (Plank, Wall Sit, a hamstring stretch) are measured by how long they're held. Today the app has no way to mark an Exercise as timed, and every Set requires a weight and rep count, which is meaningless for this kind of work. Logging a stretch currently means either faking a weight/rep pair or not tracking it in the app at all.

## Solution

Add an `isTimed` flag to Exercise, settable both when creating an Exercise and when editing an existing one (so the user can retroactively tag their current exercise list, same as `isUnilateral`). A Set logged against a timed Exercise records a single `durationSeconds` value instead of weight/reps — there is no live stopwatch; the user types in the number of seconds held, same interaction pattern as typing in reps today. `isTimed` and `isUnilateral` are independent, combinable flags: a timed **and** unilateral Exercise (e.g. "Single Leg Hamstring Stretch") logs a left+right pair of duration-only Sets, using the exact same adjacency-pairing/deletion mechanism the Store already has for unilateral Sets. Marking an Exercise timed only changes behavior for Sets logged from that point forward — Sets already logged before the flag was set keep rendering as weight/reps rows, consistent with ADR-0001 (Sessions/Sets are not retroactively reinterpreted by later Exercise edits).

## User Stories

1. As the user, I want to mark an Exercise as timed when I create it, so that stretches/holds/mobility work are logged correctly from the start.
2. As the user, I want to mark an existing Exercise as timed after the fact, so that I can go back and tag exercises already in my list (e.g. Plank, Wall Sit) without recreating them.
3. As the user, I want to un-mark an Exercise as timed if I tagged it by mistake, so that I can correct a mistagging.
4. As the user, when I tap "Add set" on a timed Exercise, I want a single duration field (in seconds) instead of weight/reps, so that I'm not forced to fill in meaningless numbers.
5. As the user, when an Exercise is both timed and unilateral (e.g. a single-leg stretch), I want "Add set" to log a left+right pair of duration Sets together, exactly like it already does for weight/reps unilateral Exercises.
6. As the user, I want a plain (non-timed) Exercise's Set fields and "Add set"/delete behavior to work exactly as they do today, so that nothing changes for the majority of my exercises.
7. As the user, I want an Exercise's timed flag to only affect Sets logged after I set it, so that Sets I already logged before tagging the Exercise keep displaying exactly as they always have, even if I later mark that Exercise timed.
8. As the user, I want Plank, Side Plank, and Wall Sit to already be marked timed the next time I get a fresh copy of the seed exercise list, so that I don't have to manually re-tag the obvious cases myself.

## Implementation Decisions

- **Schema — Exercise**: add `isTimed: boolean`, parallel to the existing `isUnilateral`. Not a general-purpose Exercise category system — a single dedicated boolean, same reasoning as `isUnilateral`.
- **Schema — SessionSet**: add an optional `durationSeconds?: number` field. `weight` and `reps` become optional too (flat optional fields on the existing interface — **not** a discriminated union). This mirrors exactly how `side?: 'left' | 'right'` was added for the unilateral feature: presence of `durationSeconds` on a given Set (not the Exercise's current `isTimed` value) is what drives rendering, forever, once that Set is logged.
- **Duration format**: whole seconds, entered via a plain number input (`inputMode="numeric"`), same interaction as the existing reps field. No mm:ss formatting/parsing, no live stopwatch/timer UI.
- **isTimed × isUnilateral**: fully independent, combinable flags. A timed+unilateral Exercise's Sets are duration-only pairs (`{ durationSeconds, side: 'left' }` / `{ durationSeconds, side: 'right' }`), built and deleted via the same adjacency-based pairing `logSet`/`deleteSet` already implement for weight/reps unilateral Sets — no new pairing mechanism.
- **Store — creating/editing an Exercise**: `createExercise` takes an `isTimed` flag alongside `name`/`isUnilateral`. The Exercise-update path (`updateExercise`) is extended so `isTimed` can also be changed after creation.
- **Store — logSet owns Set-shape construction**: `logSet` already does a live lookup of the target Exercise (by `exerciseId`, at call time) to decide `isUnilateral` pairing. That same lookup is extended to also check `isTimed`, and `logSet` now constructs the *entire* base Set itself — `{ durationSeconds: 0 }` for a timed Exercise, `{ weight: 0, reps: 0 }` otherwise — before applying left/right pairing on top. The caller (`useSessionEditing.handleAddSet`) stops passing a pre-built `emptySet()` for the "Add set" path; it only supplies `sessionId`/`exerciseId`. (`logSet`'s signature and `emptySet()`'s role narrow accordingly — see issue 01 for exact shape.)
- **Store — updateSet**: the settable-field union used when editing an existing Set's value grows to include `'duration'` alongside `'weight'`/`'reps'`, so a timed Set's duration can be edited after logging, same as weight/reps today.
- **Retroactivity (per ADR-0001)**: toggling `isTimed` on an Exercise never rewrites or reinterprets Sets already logged. Rendering is driven entirely by whether an individual `SessionSet` actually has `durationSeconds` set, never by the Exercise's current `isTimed` value — a Set logged before the flag was set (no `durationSeconds`) always renders as a weight/reps row, even inside a Session for an Exercise that is now flagged timed, and vice versa.
- **UI — Exercise create/edit**: `ExercisesPage` gains a "Timed" checkbox alongside the existing "Unilateral" checkbox, in both the create form and the edit/rename flow.
- **UI — Session logging/history**: `SessionExerciseCard` renders a Set with `durationSeconds` present as a single number input (aria-label referencing "duration") with a "sec" unit label, replacing the weight input + "×" + reps input pair for that row. The L/R side badge and the divider-between-groups logic are unchanged and apply identically whether a group's Sets are weight/reps or duration-only.
- **Seed data**: no real user data exists yet, so rather than leaving this to a manual retag, `Store.performSeedIfEmpty` (src/store/index.ts) hardcodes `isTimed: true` for exactly three seed exercise names: "Plank", "Side Plank", "Wall Sit". No other seed exercise is touched — e.g. "Farmer's Carry" and "Battle Ropes" stay weight/reps-based since load still matters for those; duration tracking for load-bearing timed movements is a different, out-of-scope feature. This only affects a fresh/empty seed (i.e. after local data is wiped) — it is not a migration over existing stored data.
- **Dexie schema**: no version bump required — `isTimed` and `durationSeconds` are plain object fields, not part of any Dexie index (confirmed against `src/store/db.ts`).

## Testing Decisions

- Tests target the `Store` class directly, using the existing in-memory fake `EntityTable` (`src/store/store.test.ts` pattern) — no DOM, no component rendering, no browser APIs. Consistent with how `isUnilateral` was tested; no component-level tests are being added.
- Priority scenarios to cover:
  - `createExercise` with `isTimed: true` persists the flag; defaults to `false` when omitted.
  - Updating an existing Exercise's `isTimed` flag (both directions) persists correctly.
  - `logSet` against a timed, non-unilateral Exercise appends exactly one Set with `durationSeconds: 0` and no `weight`/`reps`.
  - `logSet` against a timed **and** unilateral Exercise appends exactly two Sets (`side: 'left'` then `side: 'right'`), each with `durationSeconds: 0` and no `weight`/`reps`.
  - `logSet` against a non-timed Exercise is unchanged — one Set with `weight: 0, reps: 0`, no `durationSeconds`.
  - `deleteSet` on a timed+unilateral pair removes both Sets together, same adjacency rule as the weight/reps case.
  - A Set logged before an Exercise was marked timed (`weight`/`reps`, no `durationSeconds`) is left completely unmodified after the Exercise's `isTimed` flag is later toggled.
  - `performSeedIfEmpty` produces `isTimed: true` for exactly "Plank", "Side Plank", "Wall Sit", and `isTimed: false`/unset for every other seeded name.

## Out of Scope

- Live stopwatch/timer UI (start/stop, running state, backgrounding) — manual entry only.
- Combined weight+duration Sets (e.g. a weighted plank) — duration replaces weight/reps entirely for a timed Set, it doesn't supplement them.
- Countdown or rest timers between Sets.
- Distance-based tracking (e.g. Farmer's Carry logged by distance rather than time or load).
- mm:ss formatted input/display — whole seconds only.
- Auto-tagging beyond the three hardcoded seed names — no bulk/automatic detection of which other exercises "should" be timed.
- Any migration tooling for real user data — none exists yet, so this isn't needed.

## Further Notes

- This spec builds directly on the existing Store seam and Session/Set schema described in `CONTEXT.md`; it does not introduce any new architectural layer, and reuses the unilateral-exercises feature's adjacency-pairing mechanism as-is rather than generalizing it further.
- ADR-0001 ("Sessions snapshot their Exercises, independent of later Workout edits") establishes the precedent this spec follows for `isTimed`/`durationSeconds`, same as it did for `isUnilateral`/`side`: later Exercise edits must not retroactively change already-logged data.
- No new `CONTEXT.md` glossary term is needed — `isTimed` is an Exercise/Set attribute like `isUnilateral`, not a new domain concept in its own right (the existing glossary doesn't define a "Unilateral Exercise" term either, for the same reason).
