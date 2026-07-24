Status: ready-for-agent

# Exercise Categorization & Mobile Browsing — Spec

## Problem Statement

The Exercise library is about to grow well beyond strength movements to include Stretch and Mobility work, taking it from a couple dozen items to potentially 100-300+. Today, Exercises have no categorization at all — `ExercisesPage` and `WorkoutForm`'s exercise picker are both a flat list plus a plain case-insensitive name-substring search (`exerciseLookup.ts`'s `filterExercisesByName`). That works when the user already knows the exact exercise name, but breaks down for browsing/discovery ("what leg stretches do I have?") and turns into an unstructured scroll once the list gets long. There's also no way to represent that a Stretch and a Strength exercise can target the same muscle, which is exactly the kind of relationship the user wants to browse by.

## Solution

Add two orthogonal classification fields to Exercise: a required `primaryMuscleGroup` (fine-grained anatomical enum) and a required `type` (Strength, Stretch, or Mobility), plus an optional `otherMuscleGroups` (multi-select) for exercises that genuinely span more than one region. `primaryMuscleGroup` and `type` are independent axes — an Exercise's muscle group doesn't change based on whether it's a Strength movement or a Stretch, and vice versa.

Both exercise-browsing surfaces (`ExercisesPage`'s list, `WorkoutForm`'s add-exercise picker) move from a flat `<ul>` + text filter to shadcn's `Command` component, grouping results into sections by `primaryMuscleGroup` with name-only incremental search layered on top — matching how Apple's and Material Design's own list/search guidance treat a long list (grouped/sectioned browsing, with search as an additive narrowing mechanism, not a replacement for structure). `otherMuscleGroups` is captured now but has no dedicated filter UI yet — see Out of Scope.

This is documented in `CONTEXT.md` (Primary Muscle Group, Other Muscle Groups, Type, Stretch, Mobility) and `docs/adr/0002-exercise-categorization.md`.

## User Stories

1. As the user, when I create a new Exercise, I want to assign it a Primary Muscle Group, so that it shows up in the right section when I'm browsing.
2. As the user, when I create a new Exercise, I want to assign it a Type (Strength, Stretch, or Mobility), so that the app knows what kind of movement it is.
3. As the user, when I create a new Exercise, I want to optionally add one or more Other Muscle Groups, so that a compound movement (e.g. a hip-and-hamstring mobility flow) isn't forced into a single arbitrary bucket.
4. As the user, when I edit an existing Exercise, I want to change its Primary Muscle Group, Type, and Other Muscle Groups, so that I can fix a miscategorization or refine it later.
5. As the user, I want Primary Muscle Group and Type to be fully independent choices, so that I can categorize a "Hamstring Stretch" as Muscle Group: Hamstrings / Type: Stretch without that conflicting with "Romanian Deadlift" at Muscle Group: Hamstrings / Type: Strength.
6. As the user, when I open the Exercises page, I want exercises grouped into sections by Primary Muscle Group, so that I can browse by body part instead of only searching by name.
7. As the user, when I'm adding exercises to a Workout, I want the same grouped-by-Primary-Muscle-Group browsing experience, so that building a workout feels consistent with managing my exercise list.
8. As the user, I want a search box that filters by exercise name only, so that typing narrows the visible list without needing to also guess at muscle-group or type keywords (muscle-group browsing already happens via the section grouping).
9. As the user, I want Strength, Stretch, and Mobility exercises for the same muscle group to appear together in that muscle group's section, so that I can see "everything for Hamstrings" — lifts and stretches alike — in one place.
10. As the user, when I mark a new Exercise's Type as Stretch or Mobility, I want the "Timed" checkbox to default to checked, so that the common case (a held stretch/mobility drill) doesn't require an extra tap — but I still want to be able to uncheck it for a rep-based mobility drill.
11. As the user, I want the existing "Unilateral" and "Timed" flags to keep working exactly as they do today, independent of the new Type field, so that nothing about how Sets are logged changes for existing exercises.
12. As the user, I want a fresh install's seed exercise list to already include realistic Stretch and Mobility exercises (not just the existing strength movements), so that the app is useful for that kind of training out of the box.
13. As the user, I want every seeded strength exercise to already have a sensible Primary Muscle Group and Type assigned, so that I don't have to manually categorize my starting exercise list by hand.
14. As the user, since I have no existing saved data, I don't want to be walked through any migration/backfill screen — the new required fields should just be present from the first run.
15. As the user, when my search or a Primary Muscle Group section has no matching exercises, I want a clear empty-state message, so that it's obvious nothing was found rather than looking broken.
16. As the user, I want the Primary Muscle Group options to be fine-grained (e.g. Biceps and Triceps as separate groups, not one combined "Arms"), so that the categorization matches how specifically I actually think about my own training.

## Implementation Decisions

- **Schema — Exercise** (`src/store/types.ts`): add `primaryMuscleGroup: MuscleGroup` (required), `otherMuscleGroups: MuscleGroup[]` (required array, empty by default — not optional/undefined, to keep the shape uniform), and `type: 'strength' | 'stretch' | 'mobility'` (required). `MuscleGroup` is a new string-literal union: `'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'forearms' | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core' | 'neck'`. These are fully independent of the existing `isUnilateral`/`isTimed` booleans — no coupling in the schema.
- **Store — `createExercise`**: signature grows to accept `primaryMuscleGroup`, `type` (both required options), and `otherMuscleGroups` (optional, defaults to `[]`), alongside the existing `isUnilateral`/`isTimed` options.
- **Store — `updateExercise`**: extended the same way `isTimed`/`isUnilateral` already are — each of `primaryMuscleGroup`, `otherMuscleGroups`, `type` is independently updatable, falling back to the existing value when omitted.
- **`exerciseLookup.ts`**: `filterExercisesByName` stays as-is (name-only substring match, unchanged behavior). Add a new pure function that groups a list of Exercises into ordered `{ muscleGroup, exercises }` sections by `primaryMuscleGroup` (fixed section order matching the `MuscleGroup` union's declared order, not alphabetical, so related groups like Biceps/Triceps stay adjacent) — this is what both UI call sites feed into `Command`'s `CommandGroup`s. Search filtering happens first (by name), then the filtered result is grouped for display.
- **UI — `ExercisesPage.tsx` and `WorkoutForm.tsx`**: swap the current `Input` + flat `<ul>` for shadcn's `Command` component (`CommandInput` + `CommandList` + `CommandGroup` per Muscle Group + `CommandEmpty`). `WorkoutForm`'s picker keeps its existing multi-select-checkbox behavior per row (`Command` is used here purely for its search+grouping shell, not for single-select "pick one and close" semantics — each `CommandItem` renders the existing checkbox/label, toggling on select instead of navigating away). Add the shadcn `Command` component to the project (currently not installed — no `command.tsx`, no `cmdk` dependency).
- **UI — Exercise create/edit forms**: add a Primary Muscle Group select, a Type select, and an Other Muscle Groups multi-select, alongside the existing Unilateral/Timed checkboxes. Selecting Type: Stretch or Type: Mobility in the *create* form defaults the Timed checkbox to checked (a one-time default, not a live-linked/enforced rule — the user can still uncheck it, and changing Type afterward doesn't retroactively flip Timed).
- **Seed data** (`src/data/exerciseSeed.json`, `Store.performSeedIfEmpty`): the seed file's shape changes from a flat array of exercise-name strings to an array of full exercise-shape objects (name, primaryMuscleGroup, otherMuscleGroups, type, isUnilateral, isTimed), replacing the current ad hoc `TIMED_SEED_EXERCISE_NAMES` hardcoded set with real per-exercise data. Every existing seeded strength exercise gets a sensible `primaryMuscleGroup`/`type` assignment. New Stretch and Mobility exercises are added to the seed set, each similarly fully categorized. `performSeedIfEmpty` maps the JSON entries directly into `Exercise` objects (plus a generated `id`) instead of deriving `isTimed` from a name-matching set.
- **No runtime migration**: since there is no existing user data, no backfill/migration UI is built. This only affects a fresh (empty) seed, same precedent as the existing `isTimed` seed handling.
- **No Dexie schema version bump**: `primaryMuscleGroup`, `otherMuscleGroups`, and `type` are plain object fields, not part of any Dexie index, same reasoning as `isTimed`/`isUnilateral`.

## Testing Decisions

- Tests target `Store` directly via the existing in-memory fake `EntityTable` (`src/store/store.test.ts` pattern) and `exerciseLookup.ts`'s pure functions directly — no DOM, no component rendering, consistent with how `isTimed`/`isUnilateral` were tested.
- Priority scenarios to cover:
  - `createExercise` persists `primaryMuscleGroup`, `type`, and `otherMuscleGroups` (including the empty-array default when omitted).
  - `updateExercise` independently updates each of `primaryMuscleGroup`, `otherMuscleGroups`, `type` without disturbing the others or the existing `isUnilateral`/`isTimed` flags.
  - The new `exerciseLookup.ts` grouping function buckets a mixed list of exercises correctly by `primaryMuscleGroup`, in the fixed declared group order, including a muscle group with zero matches (produces an empty or omitted section, not an error).
  - Grouping composes correctly with name search: searching first narrows the list, then grouping is applied only to the narrowed results.
  - `performSeedIfEmpty` produces exercises with every required field populated (`primaryMuscleGroup`, `type`, `isUnilateral`, `isTimed`) for every seeded entry, including the new Stretch/Mobility ones.

## Out of Scope

- Any dedicated filter UI (chips, toggle group, bottom sheet) for `otherMuscleGroups` — the field is captured and stored now, but there's no way to filter by it yet. Revisit only if a real recurring "show me all X regardless of primary group" need shows up.
- Grouping/searching by `type` (e.g. an "only show Stretches" toggle) — out of scope for this pass; sections are Primary-Muscle-Group-only.
- Search matching muscle-group or type text — search remains name-only by design (see User Story 8).
- Any runtime migration/backfill flow for existing data — not needed, no users yet.
- Auto-linking `isTimed` to `type` beyond the one-time create-form default — the two remain independently editable at all times.
- An alphabet-index rail or any secondary alphabetical-browse mode — out of scope; Primary Muscle Group grouping is the only structural browse axis for this pass.
- Populating the exact final list of new Stretch/Mobility seed exercises and assigning `primaryMuscleGroup`/`type` to every existing seeded strength exercise is left as implementation-time data entry, not specified item-by-item here.

## Further Notes

- Builds on `docs/adr/0002-exercise-categorization.md`, which records why this is two orthogonal fields (not a single merged enum, not a full freeform tag system).
- `.scratch/exercise-tagging/research-mobile-filter-ui.md` has the full mobile-UI research (Apple HIG, Material Design 3, and how Hevy/Jefit/Apple Fitness+ structure their own exercise/workout pickers) backing the `Command`-based, grouped-by-muscle-group UI decision.
- Follows the same "independent, combinable flags on Exercise" precedent as `isUnilateral`/`isTimed` (see `.scratch/unilateral-exercises/spec.md`, `.scratch/timed-exercises/spec.md`) rather than introducing a different modeling style for this feature.
