# 01 — Store: timed Exercise + duration-only Set logic

**What to build:** Extend the Store's domain model so an Exercise can be flagged timed, and so logging a Set against a timed Exercise records a duration instead of weight/reps — combining correctly with the existing unilateral pairing — with old data never retroactively reinterpreted.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `Exercise` gains an `isTimed: boolean` field
- [ ] `SessionSet` gains an optional `durationSeconds?: number` field; `weight` and `reps` become optional fields on the same interface (flat optional fields, not a discriminated union)
- [ ] `createExercise` accepts an `isTimed` flag alongside `name`/`isUnilateral`
- [ ] An existing Exercise's `isTimed` flag can be updated after creation (both `false → true` and `true → false`), via the same Exercise-update path as `isUnilateral`
- [ ] `logSet` looks up the target Exercise live (by `exerciseId`, at call time) and constructs the base Set itself: `{ durationSeconds: 0 }` when `isTimed`, `{ weight: 0, reps: 0 }` otherwise — then applies the existing left/right pairing on top when `isUnilateral` is also true
- [ ] `logSet` against a timed, non-unilateral Exercise appends exactly one Set: `durationSeconds: 0`, no `weight`/`reps`
- [ ] `logSet` against a timed **and** unilateral Exercise appends exactly two Sets (`side: 'left'` then `side: 'right'`), each with `durationSeconds: 0`, no `weight`/`reps`
- [ ] `logSet` against a non-timed Exercise is unchanged — one (or paired) Set(s) with `weight: 0, reps: 0`, no `durationSeconds`
- [ ] `useSessionEditing.handleAddSet` no longer builds/passes a pre-shaped empty Set into `logSet` — `logSet`'s signature narrows to just take `sessionId`/`exerciseId` for this path (confirm no other caller relies on passing an explicit Set)
- [ ] `updateSet`'s settable-field union grows to accept `'duration'` alongside `'weight'`/`'reps'`, so a timed Set's duration can be edited after logging
- [ ] `deleteSet` on a timed+unilateral pair removes both Sets together, same adjacency rule already used for weight/reps pairs
- [ ] A Set logged before its Exercise was marked timed (`weight`/`reps`, no `durationSeconds`) is left completely unmodified after the Exercise's `isTimed` flag is later toggled in either direction
- [ ] `Store.performSeedIfEmpty` sets `isTimed: true` for exactly "Plank", "Side Plank", "Wall Sit" among the seeded exercises; every other seeded exercise is unaffected
- [ ] All of the above covered by `Store` tests using the existing in-memory fake `EntityTable`, no DOM/browser APIs
