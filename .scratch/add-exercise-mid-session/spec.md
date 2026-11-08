Status: done

# Add an Exercise mid-Session — Spec

## Problem Statement

A Session is snapshotted from its Workout when it starts (ADR-0001), and nothing can change its Exercise list afterward. If the lifter decides at the gym to add face pulls, or swaps in a machine because the rack is taken, the only options are to leave the Session, edit the Workout (which changes the template for every future Session), and start over, or to log the work somewhere else. Neither is acceptable mid-workout.

The reverse problem exists too. When an Added Exercise turns out to belong in the Workout permanently, the lifter has to remember it afterward, find the Workout, and rebuild the list by hand.

## Solution

An active Session gets a "+ Add exercise" action. It opens the same full-screen Exercise browser the Workout builder uses; tapping an Exercise adds it to the end of the Session and returns to the Session. The Added Exercise opens like any other: Pending Sets in the Carried-Over Shape, Ghost Values where the Workout has history for it. The Workout is not touched.

An Added Exercise is marked in the Session record. If it ends with no Sets it is dropped at End Session, rather than being recorded as a skip, because it was never part of the plan.

When the Session ends, a wrap-up screen offers the Added Exercises that were actually used, so the lifter can keep any of them in the Workout. Nothing is pre-selected. Skipping the screen changes nothing.

## User Stories

1. As the user, I want to add an Exercise to the Session I'm in the middle of, so that I can log work the Workout didn't plan for without losing my place.
2. As the user, I want to pick it from the same browser I use to build Workouts, so that search, type filter and muscle-group jump work the way I already know.
3. As the user, I want one tap on an Exercise to add it and drop me back in the Session, so that adding is fast between Sets.
4. As the user, I want Exercises already in the Session to be visibly unavailable in the picker, labelled "In session", so that I don't try to add one twice.
5. As the user, I want an Added Exercise to open with Pending Sets, like the rest of the Session, so that it never looks like I already did it.
6. As the user, I want an Added Exercise I've added to this Workout before to open with the same number of Sets I logged then, so that the common case needs no adding or deleting of rows.
7. As the user, I want an Added Exercise I've never done in this Workout to open with a single empty Set and no Ghost Values, so that a hint from a different Workout can't be accepted by accident.
8. As the user, I want a unilateral Added Exercise to open as a left/right pair and a timed one to open with a seconds field, so that it matches how it is performed.
9. As the user, I want the Added Exercise to appear at the end of the list, scrolled into view, so that I can see it landed.
10. As the user, I want an "Added" tag on the card, so that I can tell it from planned work.
11. As the user, I want to add an Exercise when the Workout has no Exercises at all, so that an empty Session isn't a dead end.
12. As the user, I want my Notes and half-typed numbers to survive adding an Exercise, so that picking never costs me data.
13. As the user, I want Android's back button to close the picker rather than the app, so that I can bail out safely.
14. As the user, I want to remove an Exercise I added by mistake, as long as I haven't logged anything on it, so that a mis-tap doesn't clutter the Session.
15. As the user, I want Remove to disappear once I've logged a Set on an Added Exercise, so that I can't discard performed work by accident.
16. As the user, I want to be unable to add the same Exercise twice, so that every Set I log goes to the one place it belongs.
17. As the user, I want an Added Exercise I never used to vanish at End Session, so that history doesn't claim I skipped something I never planned.
18. As the user, I want a Workout Exercise I skipped to still show as skipped in history, so that the record of what the day was meant to contain is intact.
19. As the user, I want the Workout left alone while I add things mid-Session, so that a one-off change doesn't change every future Session.
20. As the user, I want a wrap-up screen when I end a Session that has used Added Exercises, so that I can decide on the spot whether they belong in the Workout.
21. As the user, I want the wrap-up to list only Added Exercises I actually logged Sets on, so that I'm not asked about ideas I abandoned.
22. As the user, I want every row on the wrap-up unchecked by default, so that one-offs stay one-offs unless I choose otherwise.
23. As the user, I want the Exercises I tick to be appended to the end of the Workout in the order I added them, so that the new list matches what I just did.
24. As the user, I want to skip the wrap-up in one tap and have nothing change, so that ending a Session is never slower than it needs to be.
25. As the user, I want the Session to be ended and saved before the wrap-up appears, so that closing the app on that screen loses no workout data.
26. As the user, I want the wrap-up not to appear when there is nothing to offer, including when the Workout has since been deleted or already contains the Exercise, so that I'm only asked meaningful questions.
27. As the user, I want an Exercise I decline to be offered again next time I add it, so that I'm not locked into a decision from one bad day.
28. As the user, I want a Session to keep saying an Exercise was added that day even after I add it to the Workout, so that history stays true to what happened.
29. As the user, I want the next Session of that Workout to open with the Exercise already in the list, in the shape I last did it and with Ghost Values from that Session, so that keeping it feels the same as having planned it.
30. As the user, I want the Added Exercise's name to follow a later rename and survive the Exercise being deleted, so that it behaves like any other entry in history.

## Implementation Decisions

**Domain language.** The term is **Added Exercise** (defined in `CONTEXT.md`). Avoid "extra", "ad-hoc" and "unplanned". The Workout's own Exercises are plain Exercises with no special name.

**Session entry.** A Session's Exercise entry gains one optional flag meaning "this is an Added Exercise". Absent means it came from the Workout. Being optional, existing Sessions and version 1 exports remain valid with no migration, and the import validator needs no change. The flag is stored rather than derived by comparing against the Workout's current Exercise list, because the Workout can be edited later and a Session must stay correct regardless (ADR-0001). The flag is permanent: it is not cleared if the Exercise is later kept in the Workout, since the Session truthfully did add it that day.

**Store: add.** A new Store operation adds an Exercise to a Session by id, as a Session write run through the existing ordered write queue.
- Rejects an unknown Exercise (a Session is permanent, so a snapshot of a raw id could never be repaired, as in starting a Session).
- Rejects an Exercise already in the Session. Every Session operation and the card key identify an entry by Exercise id, so a second entry would be unreachable for logging, editing and deleting Sets. The picker prevents the case and the Store enforces it.
- Snapshots the Exercise's current name onto the entry, appends it at the end, and marks it as added.
- Builds its Sets with the existing Carried-Over Shape rules, unchanged: the count comes from the most recent Session of this Workout that Logged the Exercise (one Logical Set if there is none), and solo-versus-pair comes from the Exercise as configured now. No new rules.

**Store: remove.** A new Store operation removes an Added Exercise from a Session. Permitted only for an entry marked as added that has no Set carrying any measurement (the same test End Session prunes by, so a half-entered Set also blocks removal and no typed number is ever discarded); throws otherwise. It cannot remove a Workout Exercise.

**End Session.** Pruning gains one rule: after untouched Sets are dropped, an Added Exercise left with no Sets is removed from the Session. A Workout Exercise left with no Sets keeps its empty entry, as today (ADR-0004). A half-entered Set still survives pruning, so an Added Exercise holding one is kept.

**Ghost Values.** Unchanged. The existing lookup already iterates the Session's entries and searches this Workout's history, so Added Exercises are covered. An Exercise with no history in this Workout gets none, even if it has history under another Workout. This keeps to ADR-0004: the same Exercise is loaded differently across Workouts. Revisit only if blank hints prove annoying in use.

**Store: wrap-up.** Two operations, so the screen holds no eligibility logic:
- *Offer*: given an ended Session, returns the Exercises worth offering — Added Exercises still in the Session after pruning (so they have Sets), that still exist, and that are not already in the Workout's current Exercise list. The Workout is read live, not from the Session snapshot. Returns nothing if the Workout has been deleted.
- *Keep*: given a Session and the ids chosen, appends those Exercises to the end of the Workout's list, in the order they appear in the Session. Reads the Workout live and re-checks eligibility itself (skipping an id that is no longer offered), so it is idempotent and cannot duplicate an entry. It never touches the Session.

**UI: entry point.** A dashed full-width "+ Add exercise ›" button in the active Session, between the Exercise cards and Notes, using the same affordance as the Workout builder's "+ Add exercises". It also appears in the empty state, which is currently a dead end.

**UI: picker.** A full-screen view swap inside the active Session, not a dialog or a route (ADR-0003), rendering the shared Exercise browser. The active Session stays mounted, so the Notes draft and field state survive.
- Single-select: a row tap adds the Exercise and returns. No checkbox, no Done button.
- Exercises already in the Session are shown disabled with "In session".
- Header carries a label and a Cancel button.
- Android back closes the picker. The history-entry behaviour currently written inline in the Workout form is extracted into a small shared hook used by both, so there is one copy.

**UI: Added Exercise card.** Appended last, scrolled into view, with a small "Added" tag. Shows a Remove action while nothing has been entered on it.

**UI: wrap-up.** `SessionsPage` gains a third view between "active" and "pick". Tapping End Session ends and prunes the Session first (as now), then asks the Store for the offer. If the offer is empty it goes straight back to the Workout list. Otherwise the wrap-up shows each offered Exercise as an unchecked row, with Save and Skip. Save calls the keep operation with the ticked ids (Save with nothing ticked behaves like Skip); either way the view returns to the Workout list. Nothing about the offer is stored. If the app is closed on this screen, the offer is simply gone.

**No memory.** A declined Added Exercise is offered again the next time it is added and used. No counter, dismissal or preference is stored.

## Testing Decisions

**What makes a good test here.** It exercises external behaviour through the Store's public operations and asserts on the resulting Sessions and Workouts, not on how the queue, lookup or pruning is implemented internally. Each test reads like a rule in the spec.

**Seam.** One seam, the one already in use: the Store, built over in-memory tables. The entire data model change and all wrap-up eligibility logic live behind it, so nearly everything is covered there. Prior art: the existing Store test suite, in particular the groups for starting a Session (Carried-Over Shape), the Pending Set pruning at End Session, Ghost Value sourcing, and the ADR-0001 snapshot tests.

**Store tests to write:**
- Adding creates an entry marked as added, at the end, with the Exercise's current name.
- Shape follows history: a repeat addition opens with last time's Logical Set count; a first addition opens with one Pending Set, or one left/right pair if unilateral.
- Sets are Pending (no measurements), including for a timed Exercise.
- Rejects an unknown Exercise and an Exercise already in the Session.
- The Workout is unchanged by adding.
- Ghost Values are found for an Added Exercise once an earlier Session of this Workout logged it, and not found when only another Workout did.
- Concurrent add and set-update compose without losing either write.
- Remove works for an Added Exercise with no Logged Sets; refuses once any measurement is entered, including a half-entered Set; refuses a Workout Exercise.
- End Session: an unused Added Exercise is dropped, a skipped Workout Exercise keeps its empty entry, an Added Exercise with a half-entered Set is kept.
- Offer: returns used Added Exercises in Session order; excludes ones with no Sets, ones already in the Workout, deleted Exercises, and everything when the Workout is gone.
- Keep: appends in Session order, ignores ids not on offer, never duplicates on a second call, leaves the Session unchanged (including the added flag).
- The next Session after keeping opens with the Exercise in the Workout's list and the Carried-Over Shape from the Session that added it.

**UI.** Kept thin and optional. If a component test is worthwhile it goes where the existing Session card test already is: the Remove action shown only for an unused Added Exercise, and the "In session" row being disabled. The wrap-up's logic is in the Store, so the screen needs no tests beyond what the above already covers.

## Out of Scope

- Creating a brand-new Exercise from inside the picker. Today that means leaving for the Exercises tab. The most likely way this feature will feel incomplete, so the first follow-up.
- Removing, hiding or collapsing a Workout Exercise mid-Session. An untouched card stays and is kept as a skip at the end.
- Reordering Exercises within a Session, or inserting after a "current" Exercise. Added Exercises always go to the end.
- Adding Exercises from the past-Session detail screen. The Store operation will work for any Session, so this can be added later without a model change.
- The same Exercise twice in one Session. It would need an entry id separate from the Exercise id.
- Falling back to another Workout's history for Ghost Values.
- Remembering declined Added Exercises, or suggesting "you've added this three times".

## Further Notes

- `CONTEXT.md` already has the **Added Exercise** term.
- A short ADR should land with the Store slice: Added Exercises are marked on the entry rather than derived from the Workout, an unused one is dropped at End Session while an unused Workout Exercise is kept, and the flag outlives keeping the Exercise in the Workout. Each looks like a bug to a future reader without the reasoning.
- The wrap-up is the first place a Session influences a Workout, the reverse of ADR-0001's direction. It does not breach it: Sessions never change when a Workout does, and keeping only ever appends to the Workout.
- Suggested slices, in order: (1) Store: Added Exercise entry, add, remove, End Session pruning, with tests and the ADR; (2) extract the back-button hook, no behaviour change; (3) picker, entry point, Added card and Remove in the active Session; (4) Store: offer and keep, with tests; (5) the wrap-up view.
