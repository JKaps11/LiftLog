# 03 — Session logging/history UI: paired Sets + divider grouping

**What to build:** In both active-session logging and past-session history views, make unilateral Exercises log, edit, and delete Sets as a left+right pair, with a visual divider separating each logical Set-group (a plain Set, or a left+right pair) from the next.

**Blocked by:** 01, 02 — needs the Store's paired logSet/deleteSet behavior and a way to actually mark an Exercise unilateral to exercise the flow end-to-end

**Status:** ready-for-agent

- [ ] Tapping "Add set" on a unilateral Exercise logs a left Set immediately followed by a right Set, rendered as two rows with no divider between them
- [ ] A divider appears between each logical Set-group and the next (i.e. before/after a pair, and between consecutive plain Sets), so the log reads as a sequence of distinct Sets/pairs
- [ ] The left and right Sets of a pair can have their weight and reps edited independently
- [ ] Deleting either Set of a pair removes both from the display in one action
- [ ] "Add set" and delete on a non-unilateral Exercise behave exactly as they do today — single row, single delete
- [ ] Sets logged before an Exercise was marked unilateral continue to render as plain, undivided-pair rows even if the Exercise is now flagged unilateral
- [ ] Manually verified in the running app (no component test suite exists in this repo yet, per the spec's testing decisions)
