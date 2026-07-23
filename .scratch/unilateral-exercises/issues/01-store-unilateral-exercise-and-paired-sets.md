# 01 — Store: unilateral Exercise + paired Set logic

**What to build:** Extend the Store's domain model so an Exercise can be flagged unilateral, and so logging/deleting a Set against a unilateral Exercise operates on a left+right pair instead of a single Set — with old data never retroactively reinterpreted.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `Exercise` gains an `isUnilateral: boolean` field
- [ ] `SessionSet` gains an optional `side?: 'left' | 'right'` field, present only on Sets logged against a unilateral Exercise
- [ ] `createExercise` accepts an `isUnilateral` flag alongside the name
- [ ] An existing Exercise's `isUnilateral` flag can be updated after creation (both `false → true` and `true → false`), via the Exercise edit path alongside renaming
- [ ] `logSet` against a unilateral Exercise (checked live by `exerciseId` at call time) appends two Sets in one call — `side: 'left'` then `side: 'right'`, same weight/reps as the single `set` argument
- [ ] `logSet` against a non-unilateral Exercise is unchanged — appends exactly one Set with no `side`
- [ ] `deleteSet` on a Set that has a `side` removes it together with its adjacent pair partner in the same operation, leaving the rest of the Exercise's Sets intact and in order
- [ ] `deleteSet` on a Set with no `side` (plain Set) is unchanged — removes only that one Set
- [ ] A Set logged before its Exercise was marked unilateral (no `side`) is left completely unmodified after the Exercise's `isUnilateral` flag is later toggled in either direction — no retroactive pairing or reinterpretation
- [ ] All of the above covered by `Store` tests using the existing in-memory fake `EntityTable`, no DOM/browser APIs
