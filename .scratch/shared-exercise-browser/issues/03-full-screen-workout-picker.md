# 03 — Full-screen exercise picker in the Workout form

**What to build:** "Add exercises" in the Workout form opens a full-screen picker built on `ExerciseBrowser`, replacing today's inline `max-h-64` scroll box. It gets the same sticky search, type filter, jump-to-group rail and per-row badges as the Exercises tab, with checkbox rows and a `Done · N` button carrying the running selected count.

**Blocked by:** 02.

- [x] Tapping "Add exercises" in the Workout form replaces the form body with the full-screen picker; the bottom tab bar stays visible.
- [x] The picker shows the same sticky search, type-filter segmented control and jump-to-group rail as the Exercises tab, and rows show the same type/unilateral/timed badges.
- [x] The list scrolls the page rather than an inner box — no `max-h-64` container.
- [x] Checking/unchecking a row updates the Workout draft immediately; newly checked exercises append to the end of "Exercises in order".
- [x] Exercises already in the Workout show as checked when the picker opens.
- [x] The Done button shows the current number of selected exercises and returns to the Workout form.
- [x] Android's back button in the picker returns to the Workout form, exactly as Done does, rather than closing the app. Done consumes the pushed history entry so entries don't accumulate over repeated opens.
- [x] The in-progress Workout name and exercise selections survive opening and closing the picker, including repeated round trips.
- [x] The picker opens fresh each time — empty search, `All` type filter.
- [x] The "Exercises in order" list and its reorder/remove controls are unchanged, and Save/Cancel still work from the form.
- [x] There is no picker-level Cancel; cancelling the Workout form remains the way to discard.
