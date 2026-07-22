# 03 — Workout builder

**What to build:** A screen for creating and managing Workout templates. The user names a Workout and adds Exercises to it (picked from the Exercise list built in ticket 02), in a specific order they control; they can reorder, edit, or delete a Workout later. Per ADR-0001, editing a Workout must never retroactively affect any already-logged Sessions — that guarantee doesn't have observable behavior yet (Sessions don't exist until ticket 04), but the Store's data model must be built to support it (Workout referenced by ID from Sessions, not embedded by value).

**Blocked by:** 02 — needs Exercises to exist to build Workouts from.

**Status:** ready-for-agent

- [ ] The user can create a Workout with a name and an ordered list of Exercises selected from the Exercise list
- [ ] The user can reorder the Exercises within a Workout they're building or editing
- [ ] The user can edit an existing Workout's name and Exercise list (add/remove/reorder)
- [ ] The user can delete a Workout
- [ ] The user can view a list of all their Workouts
- [ ] Store operations `createWorkout`, `updateWorkout`, `deleteWorkout`, `reorderWorkoutExercises` exist and are covered by tests (in-memory fake persistence, no DOM/browser APIs), including a test that Exercise order is preserved as stored/retrieved
