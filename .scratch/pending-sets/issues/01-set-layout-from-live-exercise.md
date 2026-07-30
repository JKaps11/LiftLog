# 01 — Set layout derives from the live Exercise

**What to build:** A Set row decides whether it shows a duration field or a weight × reps pair based on how its Exercise is configured *right now*, not on which measurement fields the Set happens to carry. Fix a mis-tagged Exercise — mark Plank as weighted by mistake, then mark it timed again — and every Set already logged against it renders correctly under the corrected setting, instead of being frozen under the mistake.

This is the prefactor that makes the rest of the feature possible: once a Pending Set carries no measurements at all, field presence can no longer tell a pending plank from a pending bench press. Implements ADR-0005, which reverses the rendering decision recorded in `.scratch/timed-exercises/spec.md`.

**Blocked by:** None — can start immediately.

**Status:** done

- [ ] A new pure module beside the existing Set-grouping helper resolves a Set row's layout from the live Exercise, with its own unit test file in the same style
- [ ] The Session Exercise card renders through that module and no longer branches on whether the Set carries a duration
- [ ] A timed Exercise resolves to a single duration field; a weighted one to weight × reps
- [ ] A Set carrying a duration, against an Exercise now flagged weighted, resolves as weighted — the ADR-0005 reversal, asserted directly
- [ ] When the Exercise has been deleted, layout falls back to inferring from the Set's own measurement fields, mirroring how display names already resolve
- [ ] Left/right side badges, the set-number chip, the delete button and the group dividers behave exactly as before
- [ ] Timed and unilateral Exercises, including a timed *and* unilateral one, still log and display as they do today
