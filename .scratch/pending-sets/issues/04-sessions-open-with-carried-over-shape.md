# 04 — Sessions open with the Carried-Over Shape

**What to build:** Starting a Session no longer copies last Session's numbers. It opens with the right *number* of Set rows for each Exercise, all Pending, all showing last Session's numbers as Ghost Values — so the screen honestly shows nothing done yet, and each Set is one tap to accept. Skipping an Exercise one week doesn't leave it shapeless the next: the shape and the Ghost Values come from the most recent Session that actually Logged that Exercise. Implements ADR-0004.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Starting a Session creates Pending Sets with no measurement fields, never copying weights, reps or durations from history
- [ ] The number of Set groups for each Exercise comes from the most recent Session that Logged that Exercise; whether each group is a solo Set or a left/right pair comes from the Exercise's current unilateral flag
- [ ] An Exercise skipped in the most recent Session takes its shape from the older Session where it was Logged
- [ ] An Exercise with no history in this Workout opens with exactly one group and no Ghost Values
- [ ] The lookback is scoped to the same Workout — a Session of a different Workout containing the same Exercise is never the source
- [ ] The lookback excludes the Session being opened
- [ ] A source Session of solo Sets against a now-unilateral Exercise still produces pairs, and the reverse also holds
- [ ] The whole-Workout lookup of carried-over Sets is a single Store call taking the Session's own id so it can exclude itself, fetched once by the active-Session screen and passed down per Exercise
- [ ] The previous whole-Session lookup helper is removed, having no other caller
- [ ] Ghost Values for a group come from the corresponding group of the source Session, matching left to left and right to right
- [ ] Editing a past Session needs no cross-Session Ghost Values — its Sets are all Logged, and a Set added there gets the within-Session fallback from 03
