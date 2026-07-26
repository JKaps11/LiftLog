Status: ready-for-agent

# Shared Exercise Browser & Workout Picker — Spec

## Problem Statement

Two bugs, reported together, in "add exercises to a Workout".

**1. Being ejected from the Workout form.** `WorkoutForm` wraps its whole body — the Workout name field, the exercise-search box, the picker and the Save button — in a single `<form>` with `<Button type="submit">Save</Button>`. Any text input inside a form with a submit button triggers implicit form submission on Enter, which on an Android soft keyboard is the "Go" key. So typing into the exercise-search box and pressing Go saves the Workout and returns to the list: the user is thrown out of the form mid-build, having silently persisted whatever was selected at that moment (or, if the name field happened to be empty, `handleSubmit`'s `if (!name.trim()) return` bails and Go appears to do nothing at all). The Exercises page does not have this bug — its search box lives in a plain `<div>`, not a form.

**2. The picker has drifted out of sync with the Exercises page.** Commit `cdb98e1` gave `WorkoutForm`'s picker the same grouped-by-Primary-Muscle-Group browsing as `ExercisesPage`. Commit `929e2a1` and its successors then added a type-filter segmented control, a jump-to-muscle-group rail, a sticky header and per-row type/unilateral/timed badges — to `ExercisesPage` only. The two surfaces were never shared code, just two hand-maintained implementations of the same idea, so the second one silently fell behind. On top of the missing features, the picker's list is confined to a `max-h-64` (16rem) inner scroll box, which on a phone with the keyboard raised shows about two exercise rows.

## Solution

Split into an immediate fix and a structural one.

**No implicit form submission in `WorkoutForm`.** Enter/Go in either the name field or the search box dismisses the keyboard and does nothing else; only tapping Save saves. The `<form>` element is kept for semantics and accessibility.

**One browsing surface, two row renderers.** Extract an `ExerciseBrowser` component that owns everything the two surfaces should share — search state, type-filter state, the sticky header, the jump-to-group rail, grouping by Primary Muscle Group, and both empty states — parameterized by a `renderRow` callback. `ExercisesPage` passes its badges + Rename/Delete row (including the inline edit form); the Workout picker passes a checkbox + badges row. Every element that drifted then lives in exactly one file, and there is no second copy to fall behind.

**Picking becomes a full-screen step, not an inline box.** Tapping "Add exercises" in the Workout form replaces the form body with a full-screen picker: identical sticky search + type filter + jump rail, checkbox rows, and a `Done · N` button carrying the running selected count. This removes the cramped 16rem scroll box, and lets the sticky positioning and the jump rail's `window.scrollY` arithmetic operate on page scroll, which is what they were written for and what they'd have to be reworked to avoid.

This is documented in `docs/adr/0003-shared-exercise-browser.md`. `docs/adr/0002-exercise-categorization.md` is corrected at the same time — it describes a `Command`-based picker that was never built, and lists filter chips and category tabs as rejected alternatives when both were subsequently adopted on the Exercises page.

## User Stories

1. As the user, when I press "Go" on the Android keyboard while typing in the Workout form's exercise search, I want the keyboard to close and my search results to stay on screen, so that I'm not thrown out of the Workout I'm building.
2. As the user, I don't want a Workout to be saved by any keystroke — only by tapping Save — so that I never end up with a half-built Workout persisted behind my back.
3. As the user, when I add exercises to a Workout, I want the same browsing experience I get on the Exercises tab — type filter, jump-to-muscle-group rail, sticky search — so that the two don't feel like different apps.
4. As the user, I want the exercise list while picking to fill the screen rather than a small inner box, so that I can actually see and scroll my library on a phone with the keyboard up.
5. As the user, while picking, I want each row to show its type/unilateral/timed badges just like the Exercises tab does, so that I can tell a Stretch from a Strength movement at a glance.
6. As the user, I want checking an exercise to take effect immediately and a single Done to return me to the Workout form, so that I can select several exercises in one visit without a separate confirm step.
7. As the user, while picking I want to see how many exercises I've selected, so that I can confirm my taps landed without needing the ordered list on screen.
8. As the user, when I press Android's back button in the picker, I want it to return me to the Workout form, so that the instinctive back gesture doesn't close the entire app.
9. As the user, I want my in-progress Workout name and selections to survive opening and closing the picker, so that stepping into the picker never costs me work.
10. As the user, I want the Exercises tab to behave exactly as it does today after this refactor, so that fixing the picker doesn't cost me the browsing I already have.

## Implementation Decisions

- **Implicit submission** (`WorkoutForm.tsx`): both text inputs get an `onKeyDown` handler that, on `Enter`, calls `preventDefault()` and `blur()`. The `<form onSubmit={handleSubmit}>` wrapper and `<Button type="submit">Save</Button>` stay as they are — the form is kept for semantics; only keyboard-triggered submission is suppressed. Enter in the name field is deliberately *not* kept as a save shortcut: on a phone the name is typed before scrolling down to pick exercises, so an Enter-to-save shortcut is the same footgun in a different field.
- **`ExerciseBrowser`** (new, in `src/features/exercises/`): props are the exercise list and a `renderRow` callback; it owns `search` and `typeFilter` state internally (neither caller needs to read them), renders `BrowseControls` (moved here from `ExercisesPage`), applies `filterExercisesByName` → `filterExercisesByType` → `groupExercisesByMuscleGroup`, and renders the grouped sections with `id="exercise-group-<group>"` anchors plus the no-match and no-filter-match empty states. State is per-mount, so the picker opens fresh (empty search, type filter `All`) each time.
- **Row rendering**: the shared component renders the `<li>` wrapper; `renderRow(exercise)` supplies its contents. `ExercisesPage` keeps its own rename/delete/edit-form logic entirely outside the shared component. Badges (type, unilateral, timed) are part of each caller's row, shared via a small presentational helper rather than baked into the browser.
- **Group anchor ids**: unchanged (`exercise-group-<muscleGroup>`). Only one browsing surface is ever mounted at a time — `App.tsx` renders a single tab, and the picker replaces the Workout form's body — so the ids stay unique.
- **Picker mounting** (`WorkoutForm.tsx`): an `isPicking` state in `WorkoutForm` swaps the form body for the full-screen picker. The component stays mounted throughout, so the draft (`name`, `exerciseIds`) survives with no state hoisting into `WorkoutsPage`. The bottom tab bar stays visible, matching the existing `new`/`edit` views. Switching tabs mid-edit still discards an in-progress Workout, exactly as it does today — unchanged, in or out of the picker.
- **Selection semantics**: checkbox toggles write straight through to the form's `exerciseIds` draft; newly checked exercises append to the end of "Exercises in order". There is no picker-level Cancel — the Workout is not persisted until Save, so cancelling the form is already the escape hatch. `Done · N` carries the current selection count.
- **Android back**: opening the picker calls `history.pushState`; a `popstate` listener closes it, identical in effect to Done. Done itself calls `history.back()` so the pushed entry is consumed rather than accumulating. This is deliberately scoped to the picker only — the app has no history integration anywhere else (`pushState`/`popstate` appear nowhere in `src/`), and an app-wide back/history pass covering tabs and forms is a separate concern.
- **Cleanup**: `cmdk` and `src/components/ui/command.tsx` are removed. Both exist only because the exercise-tagging spec called for a `Command`-based picker; the implementation went another way and nothing imports either.

## Testing Decisions

- Test approach is unchanged: pure functions under vitest, no DOM and no component rendering, consistent with `store.test.ts` and `exerciseLookup.test.ts`.
- The reported submit bug is a DOM-behaviour bug that no pure test could have caught. It is fixed structurally rather than guarded by a test: after this work the search input is not inside a `<form>` at all, so the failure mode stops existing rather than being asserted against. Adding `@testing-library/react` + jsdom was considered and rejected as a new test stack the rest of the app doesn't use.
- `exerciseLookup.ts`'s existing filter/group tests already cover the logic the shared browser composes; no new pure logic is introduced by the extraction. Any genuinely new logic goes into a pure helper and is tested there.
- Verification is manual on the installed PWA: Go in both fields dismisses the keyboard without saving; the picker shows the same filter/rail/badges as the Exercises tab; Done and Android back both return to the form with selections intact; the Exercises tab is unchanged.

## Out of Scope

- Creating a new Exercise from inside the picker. Today, hitting a missing exercise mid-build means abandoning the Workout, creating it on the Exercises tab, and coming back. Worth a follow-up issue; not this one.
- Rename/delete of exercises from the picker — destructive actions next to checkboxes on a phone, and deleting an exercise already in the draft raises a consistency question this work doesn't need to answer.
- App-wide history/back integration (tabs, Workout form, session screens). Only the picker layer is handled.
- Reworking the Exercises page's own UI. It is reparented onto the shared component with no behaviour change.
- Filtering by Other Muscle Groups — still captured, still unfiltered, as in the exercise-tagging spec.
- Updating `.scratch/exercise-tagging/spec.md`. It is left as a point-in-time record; only the ADR, which is meant to stay true, is corrected.

## Further Notes

- Builds on `docs/adr/0002-exercise-categorization.md` (why Primary Muscle Group and Type are two orthogonal fields) and `.scratch/exercise-tagging/spec.md`, whose issue 03 first gave the picker its grouped browsing.
- `.scratch/exercise-tagging/research-mobile-filter-ui.md` has the mobile-UI research (Apple HIG, Material Design 3, Hevy/Jefit/Apple Fitness+) behind the grouped, sectioned browsing model these surfaces share.
