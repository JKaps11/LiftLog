Status: ready-for-agent

# Pending Sets — Spec

## Problem Statement

When a Session starts, every Set is pre-filled with the weight and reps from the last time the Workout was performed. Those pre-filled numbers are indistinguishable from numbers the user actually logged, so the moment a Session opens the screen looks like the entire Workout has already been completed. Mid-Session — after a rest, after a distraction, after putting the phone down — there is no way to answer the only question that matters: *which Sets have I already done, and what's left?*

The illusion is not merely visual. `endSession` does nothing but stamp `endTime`, so untouched pre-filled Sets are persisted as real performance. Skipping the last Exercise of a Workout today records numbers the user never lifted, which then becomes the next Session's pre-fill and would feed any future strength-over-time graph.

## Solution

A Session no longer opens pre-filled. It opens with the right *number* of Set rows, each one empty, showing last Session's numbers as greyed **Ghost Values** — placeholder hints, not values. An empty row reads as "not done" instantly, with no legend to learn and no reliance on colour alone; the set-number chip reinforces it by rendering outlined while pending and solid once logged.

Accepting last Session's numbers costs one tap and no typing: focusing any measurement field of a Pending Set fills that whole row solid from its Ghost Values, with the keyboard already open and the value selected in case the number differed. Typing a different number logs the Set the same way it does today. Clearing a field back to empty returns the Set to pending, which doubles as the escape hatch for an accidental tap.

There is no checkmark and no separate "complete" gesture. Entering the number *is* the act of logging the Set — the app has no rest timer for a checkmark to drive, so a per-Set confirmation tap would be pure overhead. What carries over from last Session is the **shape** of the work (how many Sets, unilateral or not) and never the numbers.

At End Session, Sets that were never touched are pruned, so a Session's stored Sets are exactly what was performed.

## User Stories

1. As the user, I want a Session to open with empty Set fields rather than pre-filled numbers, so that the screen doesn't look like I've already finished the Workout before I've lifted anything.
2. As the user, I want to see last Session's weight and reps as greyed hint text inside each empty field, so that I still know what I'm aiming for without those numbers pretending to be today's.
3. As the user, I want to glance at the screen mid-Session and immediately see which Sets I've done, so that I can pick up where I left off after a rest or a distraction.
4. As the user, I want to tell done from not-done without relying on a subtle colour difference, so that I can read my progress at arm's length, sweaty, in bad gym lighting.
5. As the user, I want to accept last Session's numbers for a Set with a single tap and no typing, so that logging a Set I repeated exactly is faster than it is today, not slower.
6. As the user, when I tap the weight field of a Set I'm accepting unchanged, I want both the weight *and* the reps to fill in at once, so that I don't need two taps and two keyboard pop-ups to log one Set.
7. As the user, when I tap into a field to accept it, I want the keyboard open with the value selected, so that I can type over it immediately if today's number was different.
8. As the user, I want a Set I repeated at exactly last Session's weight and reps to still register as done, so that unchanged Sets don't sit there looking undone for the rest of the Workout.
9. As the user, I want typing a number into a Set to mark it done with no extra confirmation step, so that logging a Set I changed takes exactly the actions it takes today.
10. As the user, I want to clear a field back to empty to un-do an accidental acceptance, so that a stray tap doesn't permanently mark a Set I never performed as done.
11. As the user, I want a Set logged at a genuine weight of `0` (bodyweight movements) to count as done, so that a real zero isn't mistaken for an empty field.
12. As the user, I want a Session to open with as many Sets as I actually logged for each Exercise last time, so that the common case needs no adding or deleting of rows.
13. As the user, when I skipped an Exercise entirely last Session, I want today's Ghost Values and Set count to come from the most recent Session where I *did* log it, so that one skipped week doesn't leave me with an empty Exercise and no reference numbers.
14. As the user, I want an Exercise I've never performed in this Workout to open with a single empty Set and no Ghost Values, so that a brand-new Exercise starts from a sensible blank slate.
15. As the user, I want a unilateral Exercise to open as left/right Pending Set pairs, so that the carried-over shape matches how the Exercise is actually performed.
16. As the user, I want to accept or log the left and right sides of a unilateral Set independently, so that my progress indicator is accurate while I'm partway through a pair.
17. As the user, I want a timed Exercise's Pending Sets to show a seconds field with a Ghost Value in seconds, so that holds and stretches behave the same way as weighted work.
18. As the user, I want a Set to render as weighted or timed according to how the Exercise is currently configured, so that fixing a mis-tagged Exercise fixes the way it displays everywhere instead of leaving old Sets rendering under the old mistake.
19. As the user, when I add a Set beyond the number I did last time, I want its Ghost Values taken from the last Set I logged for that Exercise today, so that an extra Set is as cheap to log as a carried-over one.
20. As the user, I want "Add set" to append an empty Pending Set rather than a `0 × 0` Set, so that a Set I just added doesn't immediately read as done.
21. As the user, I want Sets I never touched to be dropped when I end the Session, so that my history contains only weights and reps I actually lifted.
22. As the user, I want an Exercise I skipped entirely to remain listed in the finished Session with no Sets, so that the record still shows the Exercise was part of that day's Workout and that I skipped it.
23. As the user, I want a number I half-entered to survive ending the Session, so that ending a Session never silently throws away something I typed.
24. As the user, I want my in-progress Session to look exactly the same after the phone backgrounds the PWA and I reopen it, so that my done/not-done progress isn't reset by the OS.
25. As the user, I want a finished Session in History to show only the Sets I performed, all rendered as solid logged values, so that past Sessions read as records rather than as half-filled forms.
26. As the user, I want a Set I add while editing a past Session to start empty rather than at `0 × 0`, so that correcting history doesn't invent numbers.
27. As the user, I want Ghost Values drawn only from the same Workout's history, so that a heavy Bench Press on Push Day doesn't suggest itself during a Full Body Session.
28. As the user, I want the Set number, delete button, and left/right badges to keep working exactly as they do now, so that nothing I already rely on in the Set row changes.

## Implementation Decisions

### Domain model

- **No schema change to `SessionSet`.** Its measurement fields (`weight`, `reps`, `durationSeconds`) are already optional, so "not performed" is representable today. A **Pending Set** is a `SessionSet` with no measurement fields present. `side` remains stored — it is per-Set data, not derivable from the Exercise.
- **Core invariant: a `SessionSet`'s measurement fields are present if and only if the Set was performed.** `weight: 0` is a real logged weight (bodyweight work); absent `weight` is a Set that wasn't done. Sentinel-based schemes (treating `0` or a magic value as "not done") were rejected for exactly this reason.
- **Carried-over provenance is not stored.** Rejected an approach where `SessionSet` gained `carriedWeight`/`carriedReps` alongside the real fields: it persists display scaffolding into permanent records and every JSON export, and creates a lasting "which field is true?" ambiguity for whatever consumes Set history later. Ghost Values are derived at render time instead.
- **What carries over from the last Session is shape, never numbers.** See ADR-0004.
- **Set rendering derives from the live Exercise, not from the Set's own field presence.** This reverses the decision recorded in `.scratch/timed-exercises/spec.md`. See ADR-0005.

### Carried-Over Shape

- The **source Session** for an Exercise is the most recent Session *for the same Workout*, excluding the Session being opened, that has at least one Logged Set for that `exerciseId`. Per-Exercise, not per-Session: skipping one Exercise last week must not leave it shapeless today.
- Scoped to the same Workout deliberately. Exercise history spans every Workout for progress-tracking purposes, but Ghost Values must be contextual — the same Exercise is loaded differently on different Workouts.
- **The number of Set *groups* comes from the source Session; whether each group is a solo Set or a left/right pair comes from the Exercise's current `isUnilateral`.** Group counting reuses the existing `groupSessionSets` helper. This keeps shape derivation consistent with ADR-0005: flipping an Exercise to unilateral changes how today's Sets materialize, rather than carrying a stale solo/pair pattern forward.
- No source Session → one group, materialized per the Exercise's current flags, with no Ghost Values.
- `getLastSessionForWorkout` is replaced by a per-Exercise lookup; it has no other caller.

### Ghost Values

- Ghost Values for group index *i* come from group *i* of the source Session. For a pair, the left side's ghost comes from the source left Set and the right from the source right Set.
- When a group index has no counterpart in the source Session (a Set added beyond the carried count), Ghost Values fall back to the last Logged group for that Exercise in the *current* Session. Failing that, there are no Ghost Values and the fields are simply blank.
- Ghost Values are never written to a Set until accepted. They exist only as `placeholder` text.

### Store surface

- `startSession` builds Pending Sets from the Carried-Over Shape instead of copying prior Sets. It no longer reads measurement values from history at all.
- A new Store method returns the carried-over Sets for a whole Session's Exercises in one call, keyed by `exerciseId`, taking the Session's own id so it can exclude itself from the lookback. `ActiveSession`/`SessionDetail` fetch it once and pass Ghost Values down to each card.
- `logSet` constructs a Pending Set (no measurement fields), still consulting the Exercise's live `isUnilateral` to decide whether to append a left/right pair. Its `isTimed` branch is removed — timed-ness is no longer encoded on the Set.
- `updateSet` must support clearing a measurement field back to absent, not just setting a number. An emptied input yields `undefined`, never `0` — the current `Number(event.target.value)` conversion turns an empty string into `0` and must be fixed.
- `endSession` prunes Sets with **no** measurement fields at all. A partially-entered Set (weight typed, reps still blank) is kept, on the grounds that silently deleting a number the user typed is worse than a slightly odd history row. Note this is deliberately a different rule from the done/not-done predicate, which treats a partial Set as not done.
- An Exercise left with zero Logged Sets keeps its `SessionExerciseEntry` with an empty `sets` array. The entry is the ADR-0001 snapshot of what the Workout contained that day; dropping it would erase the fact that the Exercise was skipped. `SessionExerciseCard` already renders an empty `sets` array cleanly.
- `emptySet()` (currently `{ weight: 0, reps: 0 }`) is replaced by a pending-Set constructor returning no measurement fields.
- A `isSetLogged(exercise, set)` predicate is exported from the Store module, alongside `resolveExerciseDisplayName`, since both the Store (indicator semantics) and the UI need it and the UI must not own domain rules. It requires all measurements the Exercise implies: `durationSeconds` for a timed Exercise, both `weight` and `reps` otherwise. When the Exercise is unavailable, it falls back to "any measurement field present".
- No Dexie version bump: no new fields and nothing indexed changes.

### UI

- A new pure module beside `sessionSetGrouping.ts` owns row display resolution: given the live Exercise (possibly `undefined`), a stored Set, and its Ghost Values, it returns whether to render a duration field or a weight × reps pair, each field's solid value, and each field's Ghost Value. `SessionExerciseCard` becomes a renderer over that result and stops sniffing `set.durationSeconds` to choose a layout.
- Pending Set row: measurement inputs empty with their Ghost Value as muted `placeholder` text; set-number chip outlined/dashed. Logged Set row: solid values, solid filled chip. The chip carries the non-colour signal, since a single colour delta inside two small inputs is too weak to be the sole indicator across all four themes (`mutedForeground` ranges from `oklch(0.40 …)` to `oklch(0.73 …)` in `src/theme/themes.ts`).
- **Accept-on-focus fills the whole row.** Focusing any measurement input of a Pending Set writes every measurement for that row from its Ghost Values and persists immediately, then lets focus proceed with the value selected. For a unilateral Set the "row" is one side, so sides accept independently.
- Focusing a Pending Set with no Ghost Values fills nothing; the Set stays pending until a number is typed.
- Deleted-Exercise fallback mirrors `resolveExerciseDisplayName`: look the Exercise up live, and when it's gone, infer the layout from the Set's own measurement fields, which works for every Logged Set in history. A Pending Set of a deleted Exercise falls through to weighted, reachable only by deleting an Exercise while a Session on it is open.
- No checkmark, no swipe gesture, no per-Exercise "same as last time" button. A per-Exercise bulk-fill was rejected outright: filling all four Sets when two have been performed destroys the progress signal this feature exists to provide.

## Testing Decisions

Good tests here assert externally observable behaviour — what a Session contains after a Store call, and what a row resolves to for a given Set — never how the lookback or the merge is implemented internally. Two seams, both matching existing prior art; no DOM, no component rendering, and no new test infrastructure. The `onFocus` wiring itself stays untested, consistent with the rest of the repo.

**`Store`** — `src/store/store.test.ts`, in-memory fake `EntityTable`, same pattern as the `isUnilateral` and `isTimed` work:

- `startSession` creates Pending Sets with no measurement fields, never copying weights or reps from history.
- Set-group count matches the source Session's group count for each Exercise independently.
- An Exercise skipped in the most recent Session takes its shape from the older Session where it was logged, not from the skip.
- An Exercise with no history in this Workout gets exactly one group and no source Session.
- Lookback is scoped to the same Workout — a Session of a different Workout containing the same Exercise is never the source.
- Lookback excludes the Session being opened.
- A unilateral Exercise materializes left/right pairs; a source Session of solo Sets against a now-unilateral Exercise still produces pairs, and vice versa.
- `logSet` appends a Pending Set with no measurement fields, and a left/right Pending pair for a unilateral Exercise.
- `logSet` no longer varies its output by the Exercise's `isTimed` flag.
- `updateSet` can clear a measurement field back to absent, and a Set so cleared reads as not logged.
- `updateSet` storing `weight: 0` produces a Set that reads as logged.
- `endSession` removes Sets with no measurement fields and leaves Logged Sets untouched.
- `endSession` keeps a partially-entered Set.
- `endSession` keeps the `SessionExerciseEntry` of a fully-skipped Exercise with an empty `sets` array.
- `isSetLogged` requires both `weight` and `reps` for a weighted Exercise, `durationSeconds` for a timed one, and falls back to "any measurement present" when the Exercise is missing.

**Row display resolution** — new test file beside the new pure module, in the style of `sessionSetGrouping.test.ts`:

- A timed Exercise resolves to a duration field; a weighted one to weight × reps — driven by the Exercise, not the Set's fields.
- A Set carrying `durationSeconds` against an Exercise now flagged weighted resolves as weighted (the ADR-0005 reversal, asserted directly).
- A missing Exercise falls back to inferring layout from the Set's own measurement fields.
- A Pending Set surfaces Ghost Values as placeholders with no solid values; a Logged Set surfaces solid values.
- A Pending Set with no Ghost Values surfaces neither.
- A partially-entered Set surfaces the typed value solid and keeps the Ghost Value on the still-empty field.

## Out of Scope

- Rest timers, countdown timers, and live stopwatches — the absence of a rest timer is the specific reason a per-Set checkmark isn't worth its cost, but adding one isn't part of this.
- Any explicit "mark complete" affordance: checkmark, swipe, long-press, or dedicated accept button.
- A dedicated un-accept gesture beyond clearing a field.
- A `PREVIOUS` column or any layout change to the Set row. Ghost Values live inside the existing inputs; the row already carries a set number, two inputs, a `×`, a delete button, and sometimes an L/R badge, and a fifth column would be cramped at `max-w-md`.
- Session-level progress summaries ("8 of 12 Sets done"), progress bars, or per-Exercise completion counts.
- Ghost Values drawn from a different Workout's history, or from an Exercise's global history.
- The strength-over-time graph. This spec makes its input data honest but does not build it.
- Migration of existing stored Sessions. Sets already persisted as `{ weight: 0, reps: 0 }` pre-fills will read as logged, which is acceptable — there is no real user history to protect, and no migration tooling exists.
- Changing what `isUnilateral` or `isTimed` mean on an Exercise, or the Exercise create/edit UI.
- Reworking `groupSessionSets` or the left/right adjacency-pairing rules in `logSet`/`deleteSet`.

## Further Notes

- Researched against the workout-tracker category before settling on this shape. No shipped app pre-fills real values into an editable field and relies on styling alone to indicate staleness; every one resolves the ambiguity either by spatial separation with empty inputs (Hevy's `PREVIOUS` column, tap a previous value to copy it in, plus a checkmark that also starts the rest timer) or by pre-filling with a mandatory per-Set confirm gesture (Setgraph, SettoTrack). FitNotes is the closest precedent for the approach taken here: an empty field means "same as last workout", and "Mark Sets Complete" is an opt-in setting rather than the default. The reason "pre-filled, zero gesture, unambiguous" doesn't exist in the market is that it isn't achievable — if a filled field can mean two things and the user never acts, nothing can distinguish them. This spec resolves it by making the untouched state genuinely empty and making data entry itself the act of logging.
- The user's stated need is specifically *"where am I, what's left to do?"* — resuming mid-Session — and explicitly not data provenance. That ruling matters: it eliminated the simpler "colour the pre-filled values, clear the colour on edit" approach, which cannot mark a Set done when its numbers are repeated exactly, and so fails precisely on the accessory work where repeating last week's numbers is most common.
- Reading the previous Session live while the current one is open brushes against ADR-0001. It doesn't violate it: ADR-0001 governs stored history not mutating retroactively, and Ghost Values are a transient display hint that is never persisted. The observable consequence — editing an old Session mid-workout shifts today's Ghost Values — is acceptable in a single-user app.
- Clearing a field is the un-accept path, and that's deliberate rather than a designed gesture. A long-press or dedicated undo for a hypothetical accidental focus was considered and rejected as speculative; if accidental acceptance turns out to bite in practice, that's the point to design for it.
- `CONTEXT.md` previously defined **Set** as "one *completed* unit of an Exercise" while `startSession` filled Sessions with Sets that were never performed. This spec closes that gap and the glossary has been updated with **Pending Set**, **Logged Set**, **Carried-Over Shape**, and **Ghost Value**.
