# 03 — Workout builder

**What to build:** A screen for creating and managing Workout templates. The user names a Workout and adds Exercises to it (picked from the Exercise list built in ticket 02), in a specific order they control; they can reorder, edit, or delete a Workout later. Per ADR-0001, editing a Workout must never retroactively affect any already-logged Sessions — that guarantee doesn't have observable behavior yet (Sessions don't exist until ticket 04), but the Store's data model must be built to support it (Workout referenced by ID from Sessions, not embedded by value).

**Blocked by:** 02 — needs Exercises to exist to build Workouts from.

**Status:** done

- [x] The user can create a Workout with a name and an ordered list of Exercises selected from the Exercise list
- [x] The user can reorder the Exercises within a Workout they're building or editing
- [x] The user can edit an existing Workout's name and Exercise list (add/remove/reorder)
- [x] The user can delete a Workout
- [x] The user can view a list of all their Workouts
- [x] Store operations `createWorkout`, `updateWorkout`, `deleteWorkout`, `reorderWorkoutExercises` exist and are covered by tests (in-memory fake persistence, no DOM/browser APIs), including a test that Exercise order is preserved as stored/retrieved

## Comments

Implemented: `Workout { id, name, exerciseIds }` added to Dexie (`src/store/db.ts`),
Store gained `createWorkout`/`updateWorkout`/`deleteWorkout`/`reorderWorkoutExercises`/
`listWorkouts` (`src/store/index.ts`), all order-preserving. The Exercise-only
persistence port from ticket 02 was generalized to a shared `EntityTable<T>`
(`src/store/table.ts`) since Workout needed the same shape. UI at
`src/features/workouts/` (`WorkoutsPage` + `WorkoutForm`), with simple tab
navigation added to `App.tsx` between Workouts and Exercises.

Per ADR-0001, Workouts reference Exercises by ID (`exerciseIds: string[]`), not by
embedding them, so a future Session can snapshot that reference without being
retroactively altered by later Workout edits.

Code review caught that `reorderWorkoutExercises` had no real caller — the UI
initially routed every edit (including pure reorders) through `updateWorkout`.
Fixed: the UI now dispatches pure-reorder edits (same name, same Exercise set,
different order) through `reorderWorkoutExercises`, and edits that also change the
name or Exercise set through `updateWorkout`.
