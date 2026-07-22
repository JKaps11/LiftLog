Status: ready-for-agent

# Workout Logs — Spec

## Problem Statement

The user wants a minimal, personal way to define workouts, log how they actually perform them at the gym, and (eventually) see how their strength on a given exercise trends over time. Existing fitness apps are overbuilt for this — accounts, social features, subscriptions — when all that's needed is a single-user tool that runs on one phone (a Samsung Galaxy S21 Ultra).

## Solution

A minimal, installable mobile web app (PWA) that runs entirely on-device with no backend, no auth, and no account system. It lets the user:

1. Build reusable **Workout** templates from a shared **Exercise** list.
2. Log **Sessions** — dated, timed instances of performing a Workout — capturing actual **Sets** (weight × reps) per exercise, pre-filled from the last time that Workout was logged.
3. (Future, out of scope for this spec) View a strength-over-time graph for a single Exercise across all Sessions it appears in.

## User Stories

1. As the user, I want to install the app to my phone's home screen, so that it feels like a native app rather than a browser tab.
2. As the user, I want the app to work fully offline, so that gym wifi/signal never blocks logging a workout.
3. As the user, I want to create a Workout by naming it and adding Exercises to it in a specific order, so that "Push Day" always lists Bench Press before Overhead Press.
4. As the user, I want to reorder Exercises within a Workout I'm building, so that I can fix the order without recreating the whole Workout.
5. As the user, I want to edit an existing Workout's name and Exercise list, so that I can adjust my routine over time.
6. As the user, I want to delete a Workout I no longer use, so that my Workout list stays relevant.
7. As the user, I want edits to a Workout (renaming it, adding/removing Exercises) to never change what my past Sessions show, so that my logged history stays an accurate record of what I actually did.
8. As the user, I want to pick from a pre-seeded list of ~100 common exercises when building a Workout, so that I don't have to type out standard lifts myself.
9. As the user, I want to add a custom Exercise by typing just its name, so that I can log movements not in the seed list.
10. As the user, I want to rename an Exercise, so that I can fix typos or naming without losing its history — all past Sessions referencing it should reflect the new name.
11. As the user, I want to start a Session by picking one of my Workouts, so that logging follows the structure I already defined.
12. As the user, I want each Exercise in a Session to pre-fill with the weight and reps I logged last time I performed that Workout, so that I only have to change what's different today.
13. As the user, I want the first-ever Session for a Workout to start with empty fields, so that I'm not shown fake defaults when there's no history yet.
14. As the user, I want to log multiple Sets per Exercise within a Session, each with its own weight and reps, so that I can capture real set-by-set performance (e.g., a descending pyramid).
15. As the user, I want a Session to record a start time and end time, so that I can see how long my workout took.
16. As the user, I want to add optional free-text notes to a Session, so that I can record how I felt or anything unusual about that workout.
17. As the user, I want every weight I log to be in pounds, so that I don't have to think about units.
18. As the user, I want to view my history of past Sessions, so that I can look back at what I've done.
19. As the user, I want to view the details of a single past Session (exercises, sets, weights, reps, notes, times), so that I can see exactly what I did that day.
20. As the user, I want to edit or delete a past Session, so that I can correct a logging mistake.
21. As the user, I want to export all my app data to a file, so that I can transfer it to a new phone later.
22. As the user, I want to import a previously exported data file, so that I can restore my history on a new device.

## Implementation Decisions

- **Stack**: React + TypeScript + Vite. Styling/components via Tailwind CSS + shadcn/ui. `vite-plugin-pwa` for installability and offline support (service worker + manifest). No backend server; no auth.
- **Persistence**: IndexedDB via Dexie.js. All data local to the device. No sync.
- **Domain layer ("Store")**: a single module, independent of React and independent of Dexie's API shape at its public boundary, exposing operations such as: `createExercise`, `renameExercise`, `deleteExercise`, `createWorkout`, `updateWorkout`, `deleteWorkout`, `reorderWorkoutExercises`, `startSession`, `logSet`, `updateSet`, `endSession`, `updateSessionNotes`, `deleteSession`, `getLastSessionForWorkout`, `listSessionsForWorkout`, `exportData`, `importData`. This is the seam the app is built and tested against; UI components call into it and stay presentation-only.
- **Schema**:
  - `Exercise { id, name }`
  - `Workout { id, name, exerciseIds: id[] }` (ordered list of Exercise references)
  - `Session { id, workoutId, workoutNameSnapshot, exercises: [{ exerciseId, exerciseNameAtLogTime, sets: [{ weight, reps }] }], startTime, endTime, notes?, date }`
  - `Set` is not a standalone stored entity — it's an embedded `{ weight, reps }` within a Session's per-exercise entry.
- **Snapshot semantics (per ADR-0001)**: at the moment a Session is created, the Store copies the Workout's current name and exercise list (by ID) into the Session. Later edits to the Workout do not mutate existing Sessions.
- **Exercise reference semantics**: a Session stores `exerciseId` (a live reference), not a frozen exercise name string, for the purpose of following renames. The Store additionally denormalizes the exercise's name onto the Session record *at log time* for defensive display purposes (in case an Exercise is later deleted and the reference can no longer be resolved) — display logic prefers a live lookup by `exerciseId` when the Exercise still exists, and falls back to the denormalized name if it doesn't.
- **Deleting an Exercise or Workout referenced by history**: deletion is allowed (no hard block), and existing Sessions keep displaying their snapshot/denormalized data even if the referenced Exercise or Workout no longer exists. This is a soft-delete-adjacent read path, not a true soft delete — the Exercise/Workout row itself is removed.
- **Default-fill logic**: when starting a new Session for a Workout, for each Exercise in the Workout, the Store looks up the most recent prior Session for that same `workoutId` and pre-fills each Set's weight/reps from it. If no prior Session exists, fields start empty.
- **Exercise seed data**: a static JSON file bundled with the app (~100 common barbell/dumbbell/machine/bodyweight exercises across major muscle groups), loaded into the Exercise table once on first app launch (only if the Exercise table is empty).
- **Export/Import**: export serializes the full IndexedDB dataset (Exercises, Workouts, Sessions) to a single JSON file the user can save/share off-device; import reads that JSON and repopulates IndexedDB. Exact file-sharing mechanism (Web Share API vs. plain download) is an implementation detail to resolve during the relevant ticket, not fixed here.
- **Units**: weight is always pounds; no unit field is stored.

## Testing Decisions

- Tests target the **Store** module directly, using an in-memory fake in place of Dexie/IndexedDB — no DOM, no browser APIs, no UI rendering involved.
- Only external behavior of the Store is tested (inputs/outputs and persisted state), not its internal structure.
- Priority scenarios to cover: creating a Workout preserves Exercise order; editing a Workout does not alter previously logged Sessions (ADR-0001); renaming an Exercise updates the display name on past Sessions while deleting one leaves past Sessions displaying their denormalized name; starting a Session pre-fills from the most recent prior Session for that Workout, or starts empty when none exists; export followed by import round-trips to identical data.
- No existing test setup in this repo yet — this spec establishes the first one (test runner/framework choice, e.g. Vitest, is an implementation detail for the first ticket).

## Out of Scope

- The strength-over-time graph (deprioritized by the user; will be scoped and specced separately later, per-Exercise).
- Multi-device sync of any kind.
- Accounts, auth, or any multi-user support.
- Exercise categories/muscle-group tags/filtering.
- Workout targets or prescribed rep ranges.
- Freestyle Sessions not tied to a Workout.
- Non-pounds weight units.
- Hard-blocking deletion of Exercises/Workouts that have history (soft-delete-adjacent display behavior only, as described above).

## Further Notes

- This is a from-scratch build — the repo currently contains only `CLAUDE.md`, `CONTEXT.md`, and `docs/adr/0001-sessions-are-snapshots.md`. No app scaffolding exists yet, so the first ticket(s) will need to cover project setup (Vite + React + TS + Tailwind + shadcn/ui + vite-plugin-pwa + Dexie + test runner).
- Domain vocabulary (Workout, Session, Exercise, Set) is defined in `CONTEXT.md` at the repo root and should be used consistently in code, ticket titles, and UI copy.
