# 02 — Pending Sets exist and look unmistakably not-done

**What to build:** A Set can now be **Pending** — present in the Session but never performed, carrying no measurements at all — and it is impossible to mistake for a Set that was performed. Tapping "Add set" gives a visibly empty row with an outlined set-number chip. Type a number and the row goes solid with a filled chip. Clear the field back to empty and it returns to Pending, which is also the escape hatch for a row marked done by accident.

A weight of `0` is a real logged weight for bodyweight work and must read as done; an *absent* weight is what means not-done. Sessions still open pre-filled at this point — `startSession` is deliberately untouched, so nothing regresses.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] A pending-Set constructor replaces the current empty-Set constructor, producing a Set with no measurement fields
- [ ] Logging a new Set appends a Pending Set, and a left/right Pending pair for a unilateral Exercise, still deciding pairing from the Exercise's live flag
- [ ] The add-Set path no longer varies its output by the Exercise's timed flag
- [ ] Updating a Set can clear a measurement back to absent, not only set it to a number
- [ ] An emptied numeric input yields an absent measurement, never `0`
- [ ] A logged-vs-pending predicate is exported from the Store module alongside the display-name resolver, requiring a duration for a timed Exercise and both weight and reps otherwise, and falling back to "any measurement present" when the Exercise is unavailable
- [ ] A Set stored with a weight of `0` reads as logged
- [ ] A Pending row renders empty inputs and an outlined chip; a Logged row renders solid values and a filled chip
- [ ] The chip carries the signal independently of colour, since a single colour delta inside two small inputs is too weak across all four themes
- [ ] The set-number chip meets the 44px touch-target floor if it becomes interactive
