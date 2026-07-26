# 02 — Extract a shared `ExerciseBrowser` component

**What to build:** A single `ExerciseBrowser` component owning every part of exercise browsing that the Exercises page and the Workout picker should share — search state, type-filter state, the sticky header, the jump-to-muscle-group rail, grouping by Primary Muscle Group, and the empty states — parameterized by a `renderRow` callback so each caller supplies only the contents of one exercise row.

The Exercises page is reparented onto it with no user-visible change. This ticket ships no new behaviour; it exists so ticket 03 has one surface to reuse instead of a second copy to maintain.

**Blocked by:** nothing.

- [x] `ExerciseBrowser` renders the sticky search + type-filter segmented control + jump-to-group rail, and the grouped exercise sections, from a passed-in exercise list.
- [x] It owns its `search` and `typeFilter` state internally; state is per-mount, so a fresh mount starts with an empty search and the `All` type filter.
- [x] Callers pass a `renderRow` callback for the contents of each exercise row; the component renders the row wrapper.
- [x] Filtering order is preserved: name search, then type filter, then grouping.
- [x] Both existing empty states are preserved — "no exercises match <query>" when a search matches nothing, and the no-filter-match message otherwise.
- [x] Muscle-group section anchor ids (`exercise-group-<group>`) and the jump rail's scroll-offset behaviour are unchanged.
- [x] The Exercises page uses it, passing its own row (name, type/unilateral/timed badges, Rename and Delete), and keeps rename/delete/inline-edit logic outside the shared component.
- [x] The Exercises page behaves exactly as before: sticky header, active-group highlight while scrolling, jump-to-group, create/rename/delete, and the collapsible "+ New exercise" form.
