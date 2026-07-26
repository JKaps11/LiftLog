# 01 — Stop the Workout form submitting on Enter/"Go"

**What to build:** Pressing Enter — the "Go" key on an Android soft keyboard — in either text input in the Workout create/edit form dismisses the keyboard and does nothing else. Only tapping Save saves the Workout.

Today both inputs sit inside a `<form>` with a submit button, so Go fires implicit form submission: the Workout is saved and the user is returned to the Workout list mid-build, or, if the name field is empty, nothing visible happens at all.

**Blocked by:** nothing. Ships independently of 02–04.

- [x] Pressing Enter/Go in the exercise-search box closes the keyboard, leaves the typed search text and its filtered results on screen, and does not save or navigate.
- [x] Pressing Enter/Go in the Workout name field closes the keyboard and does not save or navigate.
- [x] Tapping Save still saves and returns to the Workout list, for both a new and an edited Workout.
- [x] The `<form>` element and `type="submit"` Save button are retained — only keyboard-triggered submission is suppressed.
- [x] Tapping Cancel still discards and returns to the list.
