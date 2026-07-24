# Exercise categorization: two orthogonal fields, not tags

As the exercise library grows to include Stretch and Mobility work alongside Strength exercises (50-300+ items), a bare name-search list no longer scales for browsing. We decided to add two required/optional fields to Exercise rather than a single category enum or a freeform multi-tag system:

- **Primary Muscle Group** (required, single-select, fine anatomical granularity: Chest, Back, Shoulders, Biceps, Triceps, Forearms, Quads, Hamstrings, Glutes, Calves, Core, Neck) — drives the main browsing/grouping view.
- **Other Muscle Groups** (optional, multi-select) — for exercises that involve more than one region (e.g., a compound mobility flow), used only for filtering, never for primary grouping.
- **Type** (required, single-select: Strength, Stretch, Mobility) — orthogonal to muscle group; a "Hamstring Stretch" and a "Romanian Deadlift" can share Primary Muscle Group: Hamstrings but differ in Type.

The exercise picker UI (`ExercisesPage.tsx`, `WorkoutForm.tsx`) groups by Primary Muscle Group first, using shadcn's `Command` component (search input + grouped/sectioned results) rather than filter chips, category tabs, or a bottom-sheet filter panel.

Considered a single merged category enum (e.g. Push/Pull/Legs/Mobility/Stretch as sibling values) — rejected because muscle group and training modality are genuinely different axes; merging them would force awkward choices (which "category" does a hamstring stretch belong to?) and prevent grouping strength and stretch exercises for the same muscle together.

Considered a fully freeform multi-tag model (Jefit-style faceted filtering with equipment/difficulty/etc., or unstructured tags) — rejected as more UI chrome and data-entry burden than a single-user, self-curated library needs; the two-field model gives the one cross-cutting filter (Other Muscle Groups) that was actually needed without building a general tagging system speculatively.

`isTimed` and `isUnilateral` remain independent flags, uncoupled from `Type` — a Stretch exercise defaults its create-form `isTimed` checkbox to checked as a UX convenience only, not a hard rule, since a future exercise (e.g. a rep-based mobility drill) could still need `isTimed: false`.

No runtime migration is needed: there are no users yet, so existing seed exercises are updated directly with the new required fields rather than building a backfill flow.
