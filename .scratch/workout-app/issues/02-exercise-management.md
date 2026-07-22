# 02 — Exercise management

**What to build:** A screen for managing the shared Exercise list. On first launch, the app seeds itself with a bundled JSON list of ~100 common exercises (across major muscle groups/equipment types) into IndexedDB, only if the Exercise table is currently empty. The user can view all Exercises, add a new one by typing just its name, rename an existing one, and delete one. This is the first real vertical slice through the Store seam scaffolded in ticket 01.

**Blocked by:** 01 — needs the project scaffolding and Store seam in place.

**Status:** done

- [x] On first launch (empty Exercise table), the app seeds ~100 common exercises automatically; on subsequent launches it does not re-seed or duplicate them
- [x] The user can view a list of all Exercises
- [x] The user can add a custom Exercise by entering a name (no other fields)
- [x] The user can rename an existing Exercise
- [x] The user can delete an Exercise
- [x] Store operations `createExercise`, `renameExercise`, `deleteExercise` exist and are covered by tests using an in-memory fake in place of Dexie/IndexedDB (no DOM/browser APIs in these tests)

## Comments

Implemented: Exercise added to Dexie schema (`src/store/db.ts`), Store gained
`createExercise`/`renameExercise`/`deleteExercise`/`listExercises`/`seedExercisesIfEmpty`
(`src/store/index.ts`) against a narrow `ExerciseTable` dependency so tests use an
in-memory fake instead of Dexie. Seed list lives at `src/data/exerciseSeed.json` (~100
exercises). UI at `src/features/exercises/ExercisesPage.tsx`, wired as the app's current
screen in `App.tsx`.

Found and fixed a real bug during manual browser verification: React StrictMode
double-invokes the seeding effect, and the original `seedExercisesIfEmpty` raced its own
empty-check, double-seeding the table. Fixed by caching the in-flight seed promise on
the Store instance (cleared on failure so a failed attempt can retry).
