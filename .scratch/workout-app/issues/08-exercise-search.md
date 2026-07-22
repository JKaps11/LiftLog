# 08 — Search exercises

**What to build:** A text search input on the Exercise management screen (and anywhere else Exercises are picked from a list, e.g. adding an Exercise to a Workout) that filters the ~100+ seeded/custom Exercises by name as the user types. Client-side filtering only — no new Store operations needed since `listExercises` already returns the full set.

**Blocked by:** 02 — needs the Exercise list and Store seam in place.

**Status:** done

- [x] A search input filters the visible Exercise list by substring match on name, case-insensitive
- [x] The filter updates as the user types (no submit button required)
- [x] Clearing the search input restores the full list
- [x] An empty result set shows a clear "no matches" state rather than a blank list
- [x] Search is available both on the Exercise management screen and in the exercise picker used when building a Workout

## Comments

Added `filterExercisesByName` (case-insensitive substring match, trims the query)
to `src/features/workouts/exerciseLookup.ts`, unit tested in
`exerciseLookup.test.ts`. Wired a search `Input` into `ExercisesPage.tsx` and into
the "Add exercises" picker in `WorkoutForm.tsx`, each with a "No exercises match…"
empty state. No new Store operations — filtering is client-side over the existing
`listExercises()` result. Verified in the running app via a headless-browser smoke
test (search narrows the list, clears back to all ~101 exercises, empty state shows
for no matches) on both screens.
